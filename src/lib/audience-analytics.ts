import { prisma } from "./prisma";

/**
 * Phase 16: Audience Growth - Lookalike Modeling & Analytics
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface AudienceProfile {
  venueId: string;
  totalAttendees: number;
  genreDistribution: Record<string, number>;
  avgAge: number | null;
  locationDistribution: Record<string, number>;
  avgVisitsPerMember: number;
  avgSpendPerMember: number;
  topComedians: Array<{ comedianId: string; name: string; count: number }>;
  visitFrequency: { weekly: number; monthly: number; occasional: number };
}

export interface SimilarAudience {
  venueId: string;
  venueName: string;
  similarityScore: number;
  sharedGenres: string[];
  sharedLocations: string[];
  overlapPercentage: number;
}

export interface ExpansionMarket {
  location: string;
  score: number;
  estimatedAudienceSize: number;
  genreAlignment: number;
  competitionLevel: "low" | "medium" | "high";
  reasoning: string;
}

/* ─── Compute audience profile for a venue ────────────────────────────── */

export async function computeAudienceProfile(
  venueId: string,
): Promise<AudienceProfile> {
  // Get all ticket purchases / check-ins for this venue
  const events = await prisma.event.findMany({
    where: { venueId },
    select: { id: true },
  });

  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return {
      venueId,
      totalAttendees: 0,
      genreDistribution: {},
      avgAge: null,
      locationDistribution: {},
      avgVisitsPerMember: 0,
      avgSpendPerMember: 0,
      topComedians: [],
      visitFrequency: { weekly: 0, monthly: 0, occasional: 0 },
    };
  }

  // Get ticket data with user info
  const tickets = await prisma.ticket.findMany({
    where: { eventId: { in: eventIds } },
    include: {
      event: {
        include: {
          comedians: { include: { comedian: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  // Unique attendees
  const attendeeMap = new Map<
    string,
    { visits: number; totalSpend: number }
  >();

  for (const ticket of tickets) {
    const userId = ticket.userId;
    if (!userId) continue;

    const existing = attendeeMap.get(userId);
    const price = Number(ticket.purchasePrice ?? 0);
    if (existing) {
      existing.visits += 1;
      existing.totalSpend += price;
    } else {
      attendeeMap.set(userId, {
        visits: 1,
        totalSpend: price,
      });
    }
  }

  const totalAttendees = attendeeMap.size;

  // Genre distribution from event comedians' genres
  const genreCounts: Record<string, number> = {};
  for (const ticket of tickets) {
    const genres = ticket.event?.comedians?.flatMap((ec: { comedian: { id: string; name: string } }) => ec.comedian.name) ?? [];
    for (const tag of genres) {
      genreCounts[tag] = (genreCounts[tag] ?? 0) + 1;
    }
  }

  const totalGenreEntries = Object.values(genreCounts).reduce(
    (sum, c) => sum + c,
    0,
  );
  const genreDistribution: Record<string, number> = {};
  for (const [genre, count] of Object.entries(genreCounts)) {
    genreDistribution[genre] =
      totalGenreEntries > 0
        ? Math.round((count / totalGenreEntries) * 100) / 100
        : 0;
  }

  // Average age (not available without user relation)
  const avgAge: number | null = null;

  // Location distribution (not available without user relation)
  const locationDistribution: Record<string, number> = {};

  // Avg visits & spend per member
  let totalVisits = 0;
  let totalSpend = 0;
  for (const [, attendee] of attendeeMap) {
    totalVisits += attendee.visits;
    totalSpend += attendee.totalSpend;
  }
  const avgVisitsPerMember =
    totalAttendees > 0
      ? Math.round((totalVisits / totalAttendees) * 100) / 100
      : 0;
  const avgSpendPerMember =
    totalAttendees > 0
      ? Math.round((totalSpend / totalAttendees) * 100) / 100
      : 0;

  // Top comedians
  const comedianCounts: Record<string, { name: string; count: number }> = {};
  for (const ticket of tickets) {
    for (const ec of (ticket.event?.comedians ?? [])) {
      const cid = ec.comedian.id;
      const cname = ec.comedian.name;
      if (!comedianCounts[cid]) {
        comedianCounts[cid] = { name: cname, count: 0 };
      }
      comedianCounts[cid].count += 1;
    }
  }
  const topComedians = Object.entries(comedianCounts)
    .map(([comedianId, data]) => ({
      comedianId,
      name: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Visit frequency buckets
  let weekly = 0;
  let monthly = 0;
  let occasional = 0;
  for (const [, attendee] of attendeeMap) {
    if (attendee.visits >= 4) weekly++;
    else if (attendee.visits >= 2) monthly++;
    else occasional++;
  }
  const visitFrequency = { weekly, monthly, occasional };

  return {
    venueId,
    totalAttendees,
    genreDistribution,
    avgAge,
    locationDistribution,
    avgVisitsPerMember,
    avgSpendPerMember,
    topComedians,
    visitFrequency,
  };
}

/* ─── Compute cosine similarity between two distribution objects ──────── */

export function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const key of allKeys) {
    const valA = a[key] ?? 0;
    const valB = b[key] ?? 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;

  return Math.round((dotProduct / magnitude) * 1000) / 1000;
}

/* ─── Find similar audiences across venues ────────────────────────────── */

export async function findSimilarAudiences(
  venueId: string,
  limit = 10,
): Promise<SimilarAudience[]> {
  // Get the source venue's profile
  const sourceProfile = await computeAudienceProfile(venueId);

  if (sourceProfile.totalAttendees === 0) {
    return [];
  }

  // Get all other venues
  const otherVenues = await prisma.venue.findMany({
    where: { id: { not: venueId } },
    select: { id: true, name: true },
  });

  const results: SimilarAudience[] = [];

  for (const venue of otherVenues) {
    const targetProfile = await computeAudienceProfile(venue.id);
    if (targetProfile.totalAttendees === 0) continue;

    // Genre similarity
    const genreSimilarity = cosineSimilarity(
      sourceProfile.genreDistribution,
      targetProfile.genreDistribution,
    );

    // Location similarity
    const locationSimilarity = cosineSimilarity(
      sourceProfile.locationDistribution,
      targetProfile.locationDistribution,
    );

    // Combined similarity score (genre weighted higher)
    const similarityScore =
      Math.round((genreSimilarity * 0.6 + locationSimilarity * 0.4) * 1000) /
      1000;

    // Shared genres
    const sourceGenres = Object.keys(sourceProfile.genreDistribution);
    const targetGenres = Object.keys(targetProfile.genreDistribution);
    const sharedGenres = sourceGenres.filter((g) => targetGenres.includes(g));

    // Shared locations
    const sourceLocations = Object.keys(sourceProfile.locationDistribution);
    const targetLocations = Object.keys(targetProfile.locationDistribution);
    const sharedLocations = sourceLocations.filter((l) =>
      targetLocations.includes(l),
    );

    // Overlap percentage (shared locations relative to source)
    const overlapPercentage =
      sourceLocations.length > 0
        ? Math.round(
            (sharedLocations.length / sourceLocations.length) * 100 * 100,
          ) / 100
        : 0;

    results.push({
      venueId: venue.id,
      venueName: venue.name,
      similarityScore,
      sharedGenres,
      sharedLocations,
      overlapPercentage,
    });
  }

  // Sort by similarity score descending
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  return results.slice(0, limit);
}

/* ─── Expansion market recommendations ────────────────────────────────── */

export async function getExpansionMarkets(
  venueId: string,
  limit = 5,
): Promise<ExpansionMarket[]> {
  const profile = await computeAudienceProfile(venueId);

  if (profile.totalAttendees === 0) {
    return [];
  }

  // Get all venues with their locations
  const allVenues = await prisma.venue.findMany({
    select: {
      id: true,
      city: true,
      state: true,
    },
  });

  // Current venue locations
  const currentLocations = new Set(
    Object.keys(profile.locationDistribution).map((l) => l.toLowerCase()),
  );

  // Analyze each unique location where there are venues
  const locationMap = new Map<
    string,
    { venueCount: number; venueIds: string[] }
  >();

  for (const venue of allVenues) {
    if (venue.id === venueId) continue;

    const loc = venue.city
      ? `${venue.city}${venue.state ? `, ${venue.state}` : ""}`
      : venue.state ?? "Unknown";

    const existing = locationMap.get(loc);
    if (existing) {
      existing.venueCount += 1;
      existing.venueIds.push(venue.id);
    } else {
      locationMap.set(loc, { venueCount: 1, venueIds: [venue.id] });
    }
  }

  const markets: ExpansionMarket[] = [];
  const sourceGenres = Object.keys(profile.genreDistribution);

  for (const [location, data] of locationMap) {
    // Skip locations the venue already serves heavily
    if (currentLocations.has(location.toLowerCase())) continue;

    // Compute genre alignment with existing venue profiles in this market
    let genreAlignment = 0;
    let profileCount = 0;

    for (const vid of data.venueIds.slice(0, 3)) {
      const vProfile = await computeAudienceProfile(vid);
      if (vProfile.totalAttendees > 0) {
        const sim = cosineSimilarity(
          profile.genreDistribution,
          vProfile.genreDistribution,
        );
        genreAlignment += sim;
        profileCount++;
      }
    }

    genreAlignment =
      profileCount > 0
        ? Math.round((genreAlignment / profileCount) * 1000) / 1000
        : 0;

    // Competition level
    const competitionLevel: "low" | "medium" | "high" =
      data.venueCount <= 2 ? "low" : data.venueCount <= 5 ? "medium" : "high";

    // Score: high genre alignment + low competition = good market
    const competitionPenalty =
      competitionLevel === "low"
        ? 0
        : competitionLevel === "medium"
          ? 0.15
          : 0.3;
    const score =
      Math.round((genreAlignment * 0.7 + (1 - competitionPenalty) * 0.3) * 1000) /
      1000;

    // Estimated audience size based on genre alignment and venue density
    const estimatedAudienceSize = Math.round(
      profile.totalAttendees * genreAlignment * (data.venueCount * 0.5 + 0.5),
    );

    // Generate reasoning
    const matchedGenres = sourceGenres.slice(0, 3).join(", ");
    const reasoning =
      `${location} shows ${competitionLevel} competition with ${data.venueCount} existing venue(s). ` +
      `Genre alignment: ${(genreAlignment * 100).toFixed(0)}% match on ${matchedGenres}. ` +
      `Estimated reachable audience: ${estimatedAudienceSize}.`;

    markets.push({
      location,
      score,
      estimatedAudienceSize,
      genreAlignment,
      competitionLevel,
      reasoning,
    });
  }

  markets.sort((a, b) => b.score - a.score);

  return markets.slice(0, limit);
}

/* ─── Audience overlap between two venues ─────────────────────────────── */

export async function getAudienceOverlap(
  venueIdA: string,
  venueIdB: string,
): Promise<{
  overlapCount: number;
  overlapPercentage: number;
  uniqueToA: number;
  uniqueToB: number;
  totalCombined: number;
}> {
  // Get event IDs for each venue
  const [eventsA, eventsB] = await Promise.all([
    prisma.event.findMany({ where: { venueId: venueIdA }, select: { id: true } }),
    prisma.event.findMany({ where: { venueId: venueIdB }, select: { id: true } }),
  ]);

  const eventIdsA = eventsA.map((e) => e.id);
  const eventIdsB = eventsB.map((e) => e.id);

  // Get unique user IDs for each venue
  const [ticketsA, ticketsB] = await Promise.all([
    prisma.ticket.findMany({
      where: { eventId: { in: eventIdsA }, userId: { not: "" } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.ticket.findMany({
      where: { eventId: { in: eventIdsB }, userId: { not: "" } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const setA = new Set(ticketsA.map((t) => t.userId).filter(Boolean));
  const setB = new Set(ticketsB.map((t) => t.userId).filter(Boolean));

  let overlapCount = 0;
  for (const id of setA) {
    if (id && setB.has(id)) overlapCount++;
  }

  const totalCombined = setA.size + setB.size - overlapCount;
  const overlapPercentage =
    totalCombined > 0
      ? Math.round((overlapCount / totalCombined) * 100 * 100) / 100
      : 0;

  return {
    overlapCount,
    overlapPercentage,
    uniqueToA: setA.size - overlapCount,
    uniqueToB: setB.size - overlapCount,
    totalCombined,
  };
}

/* ─── Audience growth trend ───────────────────────────────────────────── */

export async function getAudienceGrowthTrend(
  venueId: string,
  months = 6,
): Promise<Array<{ month: string; newAttendees: number; totalAttendees: number }>> {
  const events = await prisma.event.findMany({
    where: { venueId },
    select: { id: true },
  });

  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return [];
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const tickets = await prisma.ticket.findMany({
    where: {
      eventId: { in: eventIds },
      userId: { not: "" },
      createdAt: { gte: startDate },
    },
    select: {
      userId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Track first-seen date per user
  const firstSeen = new Map<string, Date>();
  for (const ticket of tickets) {
    if (!ticket.userId) continue;
    const existing = firstSeen.get(ticket.userId);
    if (!existing || ticket.createdAt < existing) {
      firstSeen.set(ticket.userId, ticket.createdAt);
    }
  }

  // Build monthly buckets
  const trend: Array<{
    month: string;
    newAttendees: number;
    totalAttendees: number;
  }> = [];

  let cumulativeTotal = 0;

  for (let i = months; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    let newInMonth = 0;
    for (const [, date] of firstSeen) {
      if (date >= monthDate && date <= monthEnd) {
        newInMonth++;
      }
    }

    cumulativeTotal += newInMonth;

    trend.push({
      month: monthKey,
      newAttendees: newInMonth,
      totalAttendees: cumulativeTotal,
    });
  }

  return trend;
}
