import { prisma } from "@/lib/prisma";
import {
  addWeightedAttributes,
  describeStretch,
  emptyAttributeScores,
  getAttributeLabel,
  getTopKeys,
  normalizeAttributeScores,
  scoreAttributeOverlap,
  summarizeComedyDNA,
  type AttributeScoreMap,
} from "@/lib/comedy-genome";

/**
 * AI-Powered Comedy Taste Profile Engine.
 * Analyzes user follows, ratings, reviews, and attendance to build
 * multi-dimensional taste profiles and power smart recommendations.
 */

export interface TasteDimensions {
  [genre: string]: number;
}

export interface TasteProfileData {
  id: string;
  userId: string;
  dimensions: TasteDimensions;
  topGenres: string[];
  attributeScores: AttributeScoreMap;
  topAttributes: string[];
  negativeSignals: AttributeScoreMap;
  profileVersion: string;
  profileSummary: string;
  discoveryStretch: number;
  confidence: number;
  lastComputed: Date;
}

function safeParseObject(value?: string | null): AttributeScoreMap {
  if (!value) return {};
  try {
    return JSON.parse(value) as AttributeScoreMap;
  } catch {
    return {};
  }
}

function safeParseArray(value?: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// computeTasteProfile
// ---------------------------------------------------------------------------

export async function computeTasteProfile(
  userId: string,
): Promise<TasteProfileData> {
  const [followedGenres, reviewData, attendanceData, tierRatings] =
    await Promise.all([
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
          rows.flatMap((row) => row.comedian.genres.map((genre) => genre.genre)),
        ),

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

  const rawGenreScores: Record<string, number> = {};
  const rawAttributeScores = emptyAttributeScores();
  const negativeSignals: AttributeScoreMap = {};
  let totalSignals = 0;

  const addGenres = (genres: string[], weight: number) => {
    for (const genre of genres) {
      rawGenreScores[genre] = (rawGenreScores[genre] ?? 0) + weight;
      totalSignals++;
    }
    addWeightedAttributes(rawAttributeScores, genres, weight);
  };

  const addNegativeGenres = (genres: string[], weight: number) => {
    const negativeAttributes = emptyAttributeScores();
    addWeightedAttributes(negativeAttributes, genres, weight);
    for (const [attribute, score] of Object.entries(negativeAttributes)) {
      negativeSignals[attribute] = (negativeSignals[attribute] ?? 0) + score;
    }
  };

  for (const genre of followedGenres) {
    addGenres([genre], 2);
  }

  for (const review of reviewData) {
    const genres = review.event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((genre) => genre.genre),
    );
    const positiveWeight = review.rating >= 4 ? review.rating / 2 : review.rating >= 3 ? 1 : 0;
    const negativeWeight = review.rating <= 2 ? (3 - review.rating) * 1.25 : 0;

    if (positiveWeight > 0) {
      addGenres(genres, positiveWeight);
    }
    if (negativeWeight > 0) {
      addNegativeGenres(genres, negativeWeight);
    }
  }

  for (const attendance of attendanceData) {
    const genres = attendance.event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((genre) => genre.genre),
    );
    addGenres(genres, 1.5);
  }

  const tierWeights: Record<string, number> = {
    S: 3,
    A: 2.5,
    B: 2,
    C: 1,
    D: 0.5,
    F: 0,
  };

  for (const tierRating of tierRatings) {
    const genres = tierRating.comedian.genres.map((genre) => genre.genre);
    const weight = tierWeights[tierRating.tier] ?? 1;
    if (weight > 0) {
      addGenres(genres, weight);
    }
    if (tierRating.tier === "D" || tierRating.tier === "F") {
      addNegativeGenres(genres, tierRating.tier === "F" ? 2 : 1);
    }
  }

  const maxGenreScore = Math.max(...Object.values(rawGenreScores), 1);
  const dimensions: TasteDimensions = {};
  for (const [genre, score] of Object.entries(rawGenreScores)) {
    dimensions[genre] = Math.round((score / maxGenreScore) * 100) / 100;
  }

  const topGenres = Object.entries(dimensions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  const attributeScores = normalizeAttributeScores(rawAttributeScores);
  const topAttributes = getTopKeys(attributeScores, 5);
  const normalizedNegativeSignals = normalizeAttributeScores(negativeSignals);
  const confidence = Math.min(totalSignals / 50, 1);
  const discoveryStretch = Math.max(0.2, Math.round((0.55 - confidence * 0.25) * 100) / 100);
  const profileSummary = summarizeComedyDNA(attributeScores, topGenres, confidence);

  const profile = await prisma.tasteProfile.upsert({
    where: { userId },
    update: {
      dimensions: JSON.stringify(dimensions),
      topGenres: JSON.stringify(topGenres),
      attributeScores: JSON.stringify(attributeScores),
      topAttributes: JSON.stringify(topAttributes),
      negativeSignals: JSON.stringify(normalizedNegativeSignals),
      profileVersion: "v2",
      profileSummary,
      discoveryStretch,
      confidence,
      lastComputed: new Date(),
    },
    create: {
      userId,
      dimensions: JSON.stringify(dimensions),
      topGenres: JSON.stringify(topGenres),
      attributeScores: JSON.stringify(attributeScores),
      topAttributes: JSON.stringify(topAttributes),
      negativeSignals: JSON.stringify(normalizedNegativeSignals),
      profileVersion: "v2",
      profileSummary,
      discoveryStretch,
      confidence,
      lastComputed: new Date(),
    },
  });

  return {
    id: profile.id,
    userId: profile.userId,
    dimensions,
    topGenres,
    attributeScores,
    topAttributes,
    negativeSignals: normalizedNegativeSignals,
    profileVersion: profile.profileVersion ?? "v2",
    profileSummary,
    discoveryStretch,
    confidence: profile.confidence,
    lastComputed: profile.lastComputed,
  };
}

// ---------------------------------------------------------------------------
// getTasteProfile
// ---------------------------------------------------------------------------

export async function getTasteProfile(
  userId: string,
): Promise<TasteProfileData | null> {
  const profile = await prisma.tasteProfile.findUnique({
    where: { userId },
  });

  if (!profile) return null;

  const dimensions = safeParseObject(profile.dimensions);
  const topGenres = safeParseArray(profile.topGenres);
  const attributeScores = safeParseObject(profile.attributeScores);
  const topAttributes =
    safeParseArray(profile.topAttributes).length > 0
      ? safeParseArray(profile.topAttributes)
      : getTopKeys(attributeScores, 5);

  return {
    id: profile.id,
    userId: profile.userId,
    dimensions,
    topGenres,
    attributeScores,
    topAttributes,
    negativeSignals: safeParseObject(profile.negativeSignals),
    profileVersion: profile.profileVersion ?? "v1",
    profileSummary:
      profile.profileSummary ??
      summarizeComedyDNA(attributeScores, topGenres, profile.confidence),
    discoveryStretch: profile.discoveryStretch ?? 0.35,
    confidence: profile.confidence,
    lastComputed: profile.lastComputed,
  };
}

// ---------------------------------------------------------------------------
// getTasteMatchScore
// ---------------------------------------------------------------------------

export async function getTasteMatchScore(
  userId: string,
  comedianId: string,
): Promise<{
  matchPct: number;
  matchingGenres: string[];
  matchingAttributes: string[];
  summary: string;
  stretchLabel: "core" | "stretch" | "wildcard";
}> {
  const profile = await getTasteProfile(userId);
  if (!profile || Object.keys(profile.dimensions).length === 0) {
    return {
      matchPct: 0,
      matchingGenres: [],
      matchingAttributes: [],
      summary: "Build your comedy DNA to unlock stronger match scores.",
      stretchLabel: "wildcard",
    };
  }

  const comedianGenres = await prisma.comedianGenre.findMany({
    where: { comedianId },
    select: { genre: true },
  });

  if (comedianGenres.length === 0) {
    return {
      matchPct: 0,
      matchingGenres: [],
      matchingAttributes: [],
      summary: "This comedian does not have enough tagged data yet.",
      stretchLabel: "wildcard",
    };
  }

  let totalAffinity = 0;
  const matchingGenres: string[] = [];

  for (const { genre } of comedianGenres) {
    const affinity = profile.dimensions[genre] ?? 0;
    totalAffinity += affinity;
    if (affinity > 0) {
      matchingGenres.push(genre);
    }
  }

  const matchPct = Math.min(
    100,
    Math.round((totalAffinity / comedianGenres.length) * 100),
  );
  const attributeMatch = scoreAttributeOverlap(
    profile.attributeScores,
    comedianGenres.map(({ genre }) => genre),
  );
  const stretchLabel = describeStretch(matchPct, profile.discoveryStretch);
  const matchingLabels = attributeMatch.matchingAttributes
    .slice(0, 3)
    .map(getAttributeLabel);

  return {
    matchPct,
    matchingGenres,
    matchingAttributes: attributeMatch.matchingAttributes,
    summary:
      matchingLabels.length > 0
        ? `${matchingLabels.join(", ")} are strong fits for your comedy DNA.`
        : "This is a broader wildcard pick based on your current profile.",
    stretchLabel,
  };
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
