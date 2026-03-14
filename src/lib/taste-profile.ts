import { prisma } from "@/lib/prisma";

/**
 * AI-Powered Comedy Taste Profile Engine.
 * Analyzes user follows, ratings, reviews, and attendance to build
 * multi-dimensional taste profiles and power smart recommendations.
 */

export interface TasteDimensions {
  [genre: string]: number; // 0.0 – 1.0 normalized score
}

export interface TasteProfileData {
  id: string;
  userId: string;
  dimensions: TasteDimensions;
  topGenres: string[];
  confidence: number;
  lastComputed: Date;
}

// ---------------------------------------------------------------------------
// computeTasteProfile
// ---------------------------------------------------------------------------

export async function computeTasteProfile(
  userId: string
): Promise<TasteProfileData> {
  // Gather all user signals in parallel
  const [followedGenres, reviewData, attendanceData, tierRatings] =
    await Promise.all([
      // Genres from followed comedians
      prisma.comedianFollow
        .findMany({
          where: { userId },
          select: {
            comedian: {
              select: { genres: { select: { genre: true } } },
            },
          },
        })
        .then((rows) =>
          rows.flatMap((r) => r.comedian.genres.map((g) => g.genre))
        ),

      // Genres from reviewed events, weighted by rating
      prisma.eventReview.findMany({
        where: { userId },
        select: {
          rating: true,
          event: {
            select: {
              comedians: {
                select: {
                  comedian: {
                    select: { genres: { select: { genre: true } } },
                  },
                },
              },
            },
          },
        },
      }),

      // Genres from attended events
      prisma.eventAttendance.findMany({
        where: { userId },
        select: {
          event: {
            select: {
              comedians: {
                select: {
                  comedian: {
                    select: { genres: { select: { genre: true } } },
                  },
                },
              },
            },
          },
        },
      }),

      // Tier ratings
      prisma.comedianTierRating.findMany({
        where: { userId },
        select: {
          tier: true,
          comedian: {
            select: { genres: { select: { genre: true } } },
          },
        },
      }),
    ]);

  // Accumulate raw genre scores
  const rawScores: Record<string, number> = {};
  let totalSignals = 0;

  // Follows contribute weight 2
  for (const genre of followedGenres) {
    rawScores[genre] = (rawScores[genre] || 0) + 2;
    totalSignals++;
  }

  // Reviews weighted by rating (1-5 -> 0.5-2.5)
  for (const review of reviewData) {
    const weight = review.rating / 2; // 1->0.5, 5->2.5
    for (const ec of review.event.comedians) {
      for (const g of ec.comedian.genres) {
        rawScores[g.genre] = (rawScores[g.genre] || 0) + weight;
        totalSignals++;
      }
    }
  }

  // Attendance contributes weight 1.5
  for (const att of attendanceData) {
    for (const ec of att.event.comedians) {
      for (const g of ec.comedian.genres) {
        rawScores[g.genre] = (rawScores[g.genre] || 0) + 1.5;
        totalSignals++;
      }
    }
  }

  // Tier ratings: S=3, A=2.5, B=2, C=1, D=0.5
  const tierWeights: Record<string, number> = {
    S: 3,
    A: 2.5,
    B: 2,
    C: 1,
    D: 0.5,
  };
  for (const tr of tierRatings) {
    const weight = tierWeights[tr.tier] ?? 1;
    for (const g of tr.comedian.genres) {
      rawScores[g.genre] = (rawScores[g.genre] || 0) + weight;
      totalSignals++;
    }
  }

  // Normalize to 0.0 – 1.0
  const maxScore = Math.max(...Object.values(rawScores), 1);
  const dimensions: TasteDimensions = {};
  for (const [genre, score] of Object.entries(rawScores)) {
    dimensions[genre] = Math.round((score / maxScore) * 100) / 100;
  }

  // Top genres (up to 5)
  const topGenres = Object.entries(dimensions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  // Confidence: 0-1 based on how much data we have (saturates at ~50 signals)
  const confidence = Math.min(totalSignals / 50, 1);

  // Upsert into DB
  const profile = await prisma.tasteProfile.upsert({
    where: { userId },
    update: {
      dimensions: JSON.stringify(dimensions),
      topGenres: JSON.stringify(topGenres),
      confidence,
      lastComputed: new Date(),
    },
    create: {
      userId,
      dimensions: JSON.stringify(dimensions),
      topGenres: JSON.stringify(topGenres),
      confidence,
      lastComputed: new Date(),
    },
  });

  return {
    id: profile.id,
    userId: profile.userId,
    dimensions,
    topGenres,
    confidence: profile.confidence,
    lastComputed: profile.lastComputed,
  };
}

// ---------------------------------------------------------------------------
// getTasteProfile
// ---------------------------------------------------------------------------

export async function getTasteProfile(
  userId: string
): Promise<TasteProfileData | null> {
  const profile = await prisma.tasteProfile.findUnique({
    where: { userId },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    dimensions: JSON.parse(profile.dimensions) as TasteDimensions,
    topGenres: JSON.parse(profile.topGenres) as string[],
    confidence: profile.confidence,
    lastComputed: profile.lastComputed,
  };
}

// ---------------------------------------------------------------------------
// getTasteMatchScore
// ---------------------------------------------------------------------------

export async function getTasteMatchScore(
  userId: string,
  comedianId: string
): Promise<{ matchPct: number; matchingGenres: string[] }> {
  const profile = await getTasteProfile(userId);
  if (!profile || Object.keys(profile.dimensions).length === 0) {
    return { matchPct: 0, matchingGenres: [] };
  }

  const comedianGenres = await prisma.comedianGenre.findMany({
    where: { comedianId },
    select: { genre: true },
  });

  if (comedianGenres.length === 0) {
    return { matchPct: 0, matchingGenres: [] };
  }

  // Calculate overlap score: average of user's affinity for the comedian's genres
  let totalAffinity = 0;
  const matchingGenres: string[] = [];

  for (const { genre } of comedianGenres) {
    const affinity = profile.dimensions[genre] ?? 0;
    totalAffinity += affinity;
    if (affinity > 0) {
      matchingGenres.push(genre);
    }
  }

  const matchPct = Math.round((totalAffinity / comedianGenres.length) * 100);

  return { matchPct: Math.min(matchPct, 100), matchingGenres };
}

// ---------------------------------------------------------------------------
// getSmartRecommendations
// ---------------------------------------------------------------------------

interface SmartRecommendation {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  score: number;
  matchPct: number;
  reason: string;
  genres: string[];
}

export async function getSmartRecommendations(
  userId: string,
  limit = 12
): Promise<SmartRecommendation[]> {
  // Get or compute taste profile
  let profile = await getTasteProfile(userId);
  if (!profile) {
    profile = await computeTasteProfile(userId);
  }

  const topGenres = profile.topGenres;

  // Get user's already-followed comedian IDs
  const followedIds = await prisma.comedianFollow
    .findMany({ where: { userId }, select: { comedianId: true } })
    .then((rows) => rows.map((r) => r.comedianId));

  const excludeIds = new Set(followedIds);

  if (topGenres.length === 0) {
    // Cold start: return popular comedians
    const popular = await prisma.comedian.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
        genres: { select: { genre: true } },
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: "desc" } },
      take: limit,
    });

    return popular.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      headshotUrl: c.headshotUrl,
      score: c._count.followers,
      matchPct: 0,
      reason: "Popular on Punchline Atlas",
      genres: c.genres.map((g) => g.genre),
    }));
  }

  // --- Signal 1: Genre overlap ---
  const genreCandidates = await prisma.comedian.findMany({
    where: {
      id: { notIn: Array.from(excludeIds) },
      genres: { some: { genre: { in: topGenres } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      headshotUrl: true,
      genres: { select: { genre: true } },
      _count: { select: { followers: true } },
    },
    take: limit * 5,
  });

  // --- Signal 2: Collaborative filtering (fans who follow same comedians) ---
  // Find users who follow the same comedians
  const similarUserIds = await prisma.comedianFollow
    .findMany({
      where: {
        comedianId: { in: followedIds },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 50,
    })
    .then((rows) => rows.map((r) => r.userId));

  // What do similar users follow that this user doesn't?
  const collabIds = new Set<string>();
  if (similarUserIds.length > 0) {
    const collabFollows = await prisma.comedianFollow.findMany({
      where: {
        userId: { in: similarUserIds },
        comedianId: { notIn: Array.from(excludeIds) },
      },
      select: { comedianId: true },
    });
    for (const f of collabFollows) {
      collabIds.add(f.comedianId);
    }
  }

  // Score all genre candidates
  const scored: SmartRecommendation[] = genreCandidates.map((c) => {
    let score = 0;
    const reasons: string[] = [];

    // Genre match
    const matching = c.genres.filter((g) => topGenres.includes(g.genre));
    const genreMatchPct =
      matching.length > 0
        ? matching.reduce(
            (sum, g) => sum + (profile!.dimensions[g.genre] ?? 0),
            0
          ) / c.genres.length
        : 0;

    score += matching.length * 3;
    if (matching.length > 0) {
      reasons.push(
        `Matches your taste in ${matching.map((g) => g.genre).join(", ")}`
      );
    }

    // Collaborative filtering boost
    if (collabIds.has(c.id)) {
      score += 2;
      reasons.push("Fans like you love this comedian");
    }

    // Popularity boost (capped)
    score += Math.min(c._count.followers * 0.005, 2);

    const matchPct = Math.round(genreMatchPct * 100);

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      headshotUrl: c.headshotUrl,
      score,
      matchPct: Math.min(matchPct, 100),
      reason: reasons.join(" · ") || "Recommended for you",
      genres: c.genres.map((g) => g.genre),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------------------------------------------------------------------------
// getHappeningTonight
// ---------------------------------------------------------------------------

interface TonightEvent {
  id: string;
  title: string | null;
  date: Date;
  showtime: string | null;
  ticketUrl: string | null;
  venue: { id: string; name: string; city: string; state: string; latitude: number | null; longitude: number | null };
  comedians: Array<{ id: string; name: string; slug: string; headshotUrl: string | null }>;
  attendeeCount: number;
  ticketsAvailable: boolean;
}

export async function getHappeningTonight(
  userId?: string,
  latitude?: number,
  longitude?: number,
  radiusMi?: number
): Promise<TonightEvent[]> {
  // Today: start of day to end of day
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: startOfDay, lt: endOfDay },
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
        },
      },
      comedians: {
        include: {
          comedian: {
            select: {
              id: true,
              name: true,
              slug: true,
              headshotUrl: true,
            },
          },
        },
      },
      _count: { select: { attendees: true } },
      ticketTypes: {
        select: { capacity: true, sold: true },
      },
    },
    orderBy: { date: "asc" },
  });

  let filtered = events;

  // Filter by location if coordinates provided
  if (latitude != null && longitude != null && radiusMi) {
    filtered = events.filter((e) => {
      if (e.venue.latitude == null || e.venue.longitude == null) return false;
      const dist = haversineDistance(
        latitude,
        longitude,
        e.venue.latitude,
        e.venue.longitude
      );
      return dist <= radiusMi;
    });
  }

  return filtered.map((e) => {
    const totalCapacity = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
    const totalSold = e.ticketTypes.reduce((s, t) => s + t.sold, 0);
    const ticketsAvailable =
      e.ticketTypes.length === 0 || totalSold < totalCapacity;

    return {
      id: e.id,
      title: e.title,
      date: e.date,
      showtime: e.showtime,
      ticketUrl: e.ticketUrl,
      venue: e.venue,
      comedians: e.comedians.map((ec) => ({
        id: ec.comedian.id,
        name: ec.comedian.name,
        slug: ec.comedian.slug,
        headshotUrl: ec.comedian.headshotUrl,
      })),
      attendeeCount: e._count.attendees,
      ticketsAvailable,
    };
  });
}

// ---------------------------------------------------------------------------
// Haversine helper
// ---------------------------------------------------------------------------

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
