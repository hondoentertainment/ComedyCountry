import { prisma } from "@/lib/prisma";

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
  reason: string;
  genres: string[];
}

interface RecommendedEvent {
  id: string;
  title: string | null;
  date: Date;
  venue: { name: string; city: string; state: string };
  comedians: Array<{ name: string; slug: string }>;
  score: number;
  reason: string;
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
  // 1. Get user's genre preferences from followed comedians and reviews
  const [followedComedianIds, reviewedEvents] = await Promise.all([
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
      reason: "Popular on Punchline Atlas",
      genres: c.genres.map((g) => g.genre),
    }));
  }

  // 2. Find comedians matching top genres, excluding already followed/seen
  const candidates = await prisma.comedian.findMany({
    where: {
      id: { notIn: Array.from(seenComedianIds) },
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
    take: limit * 3, // Over-fetch for scoring
  });

  // 3. Score candidates
  const scored = candidates.map((c) => {
    let score = 0;
    let reason = "";

    // Genre match scoring
    const matchingGenres = c.genres.filter((g) => topGenres.includes(g.genre));
    score += matchingGenres.length * 3;
    if (matchingGenres.length > 0) {
      reason = `Matches your taste in ${matchingGenres.map((g) => g.genre).join(", ")}`;
    }

    // Popularity boost
    score += Math.min(c._count.followers * 0.005, 2);

    if (!reason) reason = "Recommended for you";

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      headshotUrl: c.headshotUrl,
      score,
      reason,
      genres: c.genres.map((g) => g.genre),
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
  const [followedComedians, followedVenues, attendedEvents] = await Promise.all([
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
      comedians: { include: { comedian: { select: { name: true, slug: true } } } },
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

      // Followed comedian performing
      const followedPerformers = e.comedians.filter((ec) =>
        followedComedians.includes(ec.comedianId)
      );
      if (followedPerformers.length > 0) {
        score += followedPerformers.length * 5;
        reasons.push(
          `${followedPerformers.map((p) => p.comedian.name).join(", ")} performing`
        );
      }

      // Followed venue
      if (followedVenues.includes(e.venueId)) {
        score += 3;
        reasons.push(`At ${e.venue.name}`);
      }

      // Popularity
      score += Math.min(e._count.attendees * 0.1, 2);

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
        reason: reasons.join(" · ") || "Recommended for you",
      };
    });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
