import { prisma } from "@/lib/prisma";
import { getTasteProfile } from "@/lib/taste-profile";
import {
  describeStretch,
  getAttributeLabel,
  scoreAttributeOverlap,
} from "@/lib/comedy-genome";

/**
 * Personalized recommendation engine for Punchline Atlas.
 * Uses collaborative filtering signals: genre preferences, follow graph,
 * review history, and attendance patterns.
 */

interface RecommendedComedian {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  score: number;
  matchPct: number;
  stretchLabel: "core" | "stretch" | "wildcard";
  reason: string;
  genres: string[];
  matchingAttributes: string[];
}

interface RecommendedEvent {
  id: string;
  title: string | null;
  date: Date;
  venue: { name: string; city: string; state: string };
  comedians: Array<{ name: string; slug: string }>;
  score: number;
  matchPct: number;
  stretchLabel: "core" | "stretch" | "wildcard";
  reason: string;
  tags: string[];
}

export async function getEventRecommendationInsight(
  userId: string,
  eventId: string,
): Promise<RecommendedEvent | null> {
  const [profile, followedComedians, followedVenues, event] = await Promise.all([
    getTasteProfile(userId),
    prisma.comedianFollow
      .findMany({ where: { userId }, select: { comedianId: true } })
      .then((rows) => rows.map((row) => row.comedianId)),
    prisma.venueFollow
      .findMany({ where: { userId }, select: { venueId: true } })
      .then((rows) => rows.map((row) => row.venueId)),
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        comedians: {
          include: {
            comedian: {
              select: { name: true, slug: true, genres: { select: { genre: true } } },
            },
          },
        },
        _count: { select: { attendees: true } },
      },
    }),
  ]);

  if (!event) return null;

  const reasons: string[] = [];
  const tags = new Set<string>();
  let score = 0;
  const followedPerformers = event.comedians.filter((entry) =>
    followedComedians.includes(entry.comedianId),
  );

  if (followedPerformers.length > 0) {
    reasons.push(
      `${followedPerformers.map((performer) => performer.comedian.name).join(", ")} performing`,
    );
    tags.add("followed comic");
    score += followedPerformers.length * 5;
  }

  if (followedVenues.includes(event.venueId)) {
    reasons.push(`At ${event.venue.name}`);
    tags.add("favorite room");
    score += 3;
  }

  const eventGenres = event.comedians.flatMap((entry) =>
    entry.comedian.genres.map((genre) => genre.genre),
  );
  const attributeMatch = profile
    ? scoreAttributeOverlap(profile.attributeScores, eventGenres)
    : { matchPct: 0, matchingAttributes: [] };

  if (attributeMatch.matchingAttributes.length > 0) {
    reasons.push(
      `Fits your DNA: ${attributeMatch.matchingAttributes
        .slice(0, 2)
        .map(getAttributeLabel)
        .join(" • ")}`,
    );
    tags.add("dna match");
    score += attributeMatch.matchPct / 25;
  }

  score += Math.min(event._count.attendees * 0.1, 2);
  if (event._count.attendees >= 25) {
    tags.add("buzzing");
  }

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    venue: event.venue,
    comedians: event.comedians.map((entry) => ({
      name: entry.comedian.name,
      slug: entry.comedian.slug,
    })),
    score,
    matchPct: attributeMatch.matchPct,
    stretchLabel: describeStretch(attributeMatch.matchPct, profile?.discoveryStretch),
    reason: reasons.join(" · ") || "Recommended for you",
    tags: Array.from(tags),
  };
}

/**
 * Get personalized comedian recommendations for a user.
 * Scoring:
 * - Genre overlap with reviewed/followed comedians: +3 per match
 * - Followed by users who follow similar comedians: +2
 * - High tier ratings from similar users: +1
 * - Popularity boost (follower count): +0.5 per 100 followers
 */
export async function getRecommendedComedians(
  userId: string,
  limit = 12
): Promise<RecommendedComedian[]> {
  const [profile, followedComedianIds, reviewedEvents] = await Promise.all([
    getTasteProfile(userId),
    prisma.comedianFollow
      .findMany({ where: { userId }, select: { comedianId: true } })
      .then((f) => f.map((x) => x.comedianId)),
    prisma.eventReview.findMany({
      where: { userId },
      select: {
        rating: true,
        event: {
          select: {
            comedians: {
              select: { comedianId: true, comedian: { select: { genres: { select: { genre: true } } } } },
            },
          },
        },
      },
    }),
  ]);

  // Build genre affinity scores
  const genreScores: Record<string, number> = {};
  const seenComedianIds = new Set(followedComedianIds);

  // From followed comedians
  const followedGenres = await prisma.comedianGenre.findMany({
    where: { comedianId: { in: followedComedianIds } },
    select: { genre: true },
  });
  followedGenres.forEach((g) => {
    genreScores[g.genre] = (genreScores[g.genre] || 0) + 2;
  });

  // From reviewed events (weighted by rating)
  reviewedEvents.forEach((r) => {
    r.event.comedians.forEach((ec) => {
      seenComedianIds.add(ec.comedianId);
      ec.comedian.genres.forEach((g) => {
        const weight = r.rating >= 4 ? 3 : r.rating >= 3 ? 1 : 0;
        genreScores[g.genre] = (genreScores[g.genre] || 0) + weight;
      });
    });
  });

  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
  const effectiveGenres = profile?.topGenres?.length ? profile.topGenres : topGenres;

  if (effectiveGenres.length === 0) {
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
      stretchLabel: "wildcard",
      reason: "Popular on Punchline Atlas",
      genres: c.genres.map((g) => g.genre),
      matchingAttributes: [],
    }));
  }

  // 2. Find comedians matching top genres, excluding already followed/seen
  const candidates = await prisma.comedian.findMany({
    where: {
      id: { notIn: Array.from(seenComedianIds) },
      genres: { some: { genre: { in: effectiveGenres } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      headshotUrl: true,
      genres: { select: { genre: true } },
      _count: { select: { followers: true } },
    },
    take: limit * 3, // Over-fetch for scoring
  });

  // 3. Score candidates
  const scored = candidates.map((c) => {
    let score = 0;
    const reasons: string[] = [];

    // Genre match scoring
    const matchingGenres = c.genres.filter((g) => effectiveGenres.includes(g.genre));
    score += matchingGenres.length * 3;
    if (matchingGenres.length > 0) {
      reasons.push(`Matches your taste in ${matchingGenres.map((g) => g.genre).join(", ")}`);
    }

    // Popularity boost
    score += Math.min(c._count.followers * 0.005, 2);

    const attributeMatch = profile
      ? scoreAttributeOverlap(
          profile.attributeScores,
          c.genres.map((genre) => genre.genre),
        )
      : { matchPct: 0, matchingAttributes: [] };

    if (attributeMatch.matchingAttributes.length > 0) {
      reasons.push(
        attributeMatch.matchingAttributes
          .slice(0, 2)
          .map(getAttributeLabel)
          .join(" • "),
      );
    }

    const matchPct = profile
      ? Math.max(
          attributeMatch.matchPct,
          Math.min(
            100,
            Math.round(
              (matchingGenres.reduce((sum, genre) => sum + (profile.dimensions[genre.genre] ?? 0), 0) /
                Math.max(c.genres.length, 1)) *
                100,
            ),
          ),
        )
      : 0;

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      headshotUrl: c.headshotUrl,
      score,
      matchPct,
      stretchLabel: describeStretch(matchPct, profile?.discoveryStretch),
      reason: reasons.join(" · ") || "Recommended for you",
      genres: c.genres.map((g) => g.genre),
      matchingAttributes: attributeMatch.matchingAttributes,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get personalized event recommendations for a user.
 * Considers: followed comedians, genre preferences, location history.
 */
export async function getRecommendedEvents(
  userId: string,
  limit = 10
): Promise<RecommendedEvent[]> {
  // Get user's followed comedians and venue preferences
  const [profile, followedComedians, followedVenues, attendedEvents] = await Promise.all([
    getTasteProfile(userId),
    prisma.comedianFollow
      .findMany({ where: { userId }, select: { comedianId: true } })
      .then((f) => f.map((x) => x.comedianId)),
    prisma.venueFollow
      .findMany({ where: { userId }, select: { venueId: true } })
      .then((f) => f.map((x) => x.venueId)),
    prisma.eventAttendance
      .findMany({ where: { userId }, select: { eventId: true } })
      .then((a) => new Set(a.map((x) => x.eventId))),
  ]);

  // Find upcoming events featuring followed comedians or at followed venues
  const events = await prisma.event.findMany({
    where: {
      date: { gte: new Date() },
      OR: [
        { comedians: { some: { comedianId: { in: followedComedians } } } },
        { venueId: { in: followedVenues } },
      ],
    },
    include: {
      venue: { select: { name: true, city: true, state: true } },
      comedians: {
        include: {
          comedian: { select: { name: true, slug: true, genres: { select: { genre: true } } } },
        },
      },
      _count: { select: { attendees: true } },
    },
    orderBy: { date: "asc" },
    take: limit * 3,
  });

  const scored = events
    .filter((e) => !attendedEvents.has(e.id))
    .map((e) => {
      let score = 0;
      const reasons: string[] = [];
      const tags = new Set<string>();

      // Followed comedian performing
      const followedPerformers = e.comedians.filter((ec) =>
        followedComedians.includes(ec.comedianId)
      );
      if (followedPerformers.length > 0) {
        score += followedPerformers.length * 5;
        reasons.push(
          `${followedPerformers.map((p) => p.comedian.name).join(", ")} performing`
        );
        tags.add("followed comic");
      }

      // Followed venue
      if (followedVenues.includes(e.venueId)) {
        score += 3;
        reasons.push(`At ${e.venue.name}`);
        tags.add("favorite room");
      }

      const eventGenres = e.comedians.flatMap((ec) =>
        "genres" in ec.comedian && Array.isArray(ec.comedian.genres)
          ? (ec.comedian.genres as Array<{ genre: string }>).map((genre) => genre.genre)
          : [],
      );

      const attributeMatch = profile
        ? scoreAttributeOverlap(profile.attributeScores, eventGenres)
        : { matchPct: 0, matchingAttributes: [] };
      if (attributeMatch.matchingAttributes.length > 0) {
        const labeled = attributeMatch.matchingAttributes
          .slice(0, 2)
          .map(getAttributeLabel)
          .join(" • ");
        reasons.push(`Fits your DNA: ${labeled}`);
        tags.add("dna match");
        score += attributeMatch.matchPct / 25;
      }

      // Popularity
      score += Math.min(e._count.attendees * 0.1, 2);
      if (e._count.attendees >= 25) {
        tags.add("buzzing");
      }

      const matchPct = attributeMatch.matchPct;

      return {
        id: e.id,
        title: e.title,
        date: e.date,
        venue: e.venue,
        comedians: e.comedians.map((ec) => ({
          name: ec.comedian.name,
          slug: ec.comedian.slug,
        })),
        score,
        matchPct,
        stretchLabel: describeStretch(matchPct, profile?.discoveryStretch),
        reason: reasons.join(" · ") || "Recommended for you",
        tags: Array.from(tags),
      };
    });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
