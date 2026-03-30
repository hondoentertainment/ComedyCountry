import { prisma } from "./prisma";

export async function getEventReviews(eventId: string, take = 20, skip = 0) {
  const [reviews, total] = await Promise.all([
    prisma.eventReview.findMany({
      where: { eventId },
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, profileName: true, image: true },
        },
      },
    }),
    prisma.eventReview.count({ where: { eventId } }),
  ]);

  return { reviews, total };
}

export async function getEventRatingStats(eventId: string) {
  const result = await prisma.eventReview.aggregate({
    where: { eventId },
    _count: true,
    _avg: { rating: true },
  });

  return {
    count: result._count,
    avgRating: result._avg.rating
      ? Math.round(result._avg.rating * 10) / 10
      : null,
  };
}

export async function getEventRatingDistribution(eventId: string) {
  const results = await prisma.eventReview.groupBy({
    by: ["rating"],
    where: { eventId },
    _count: true,
  });
  const distribution: Record<number, number> = {};
  for (const r of results) {
    distribution[r.rating] = r._count;
  }
  return distribution;
}

export async function getUserReview(eventId: string, userId: string) {
  return prisma.eventReview.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
    include: {
      user: {
        select: { name: true, profileName: true, image: true },
      },
    },
  });
}

export async function getTopRatedEventIds(limit = 10, minReviews = 2) {
  const results = await prisma.eventReview.groupBy({
    by: ["eventId"],
    _avg: { rating: true },
    _count: true,
    having: { eventId: { _count: { gte: minReviews } } },
    orderBy: { _avg: { rating: "desc" } },
    take: limit * 2, // fetch extra to filter for upcoming events
  });

  return results.map((r) => ({
    eventId: r.eventId,
    avgRating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
    count: r._count,
  }));
}

export async function getEventReviewsSorted(
  eventId: string,
  take = 10,
  skip = 0,
  sort: "recent" | "helpful" | "rating_high" | "rating_low" = "recent",
) {
  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "rating_high") orderBy = { rating: "desc" };
  else if (sort === "rating_low") orderBy = { rating: "asc" };

  if (sort === "helpful") {
    // For helpful sort, we fetch all reviews then sort by reaction count
    const [reviews, total] = await Promise.all([
      prisma.eventReview.findMany({
        where: { eventId },
        include: {
          user: { select: { name: true, profileName: true, image: true } },
        },
      }),
      prisma.eventReview.count({ where: { eventId } }),
    ]);

    // Batch fetch helpful reaction counts
    const reactions = await prisma.reviewReaction.groupBy({
      by: ["reviewId"],
      where: {
        reviewType: "event_review",
        reviewId: { in: reviews.map((r) => r.id) },
        reactionType: "helpful",
      },
      _count: true,
    });
    const helpfulMap = new Map(reactions.map((r) => [r.reviewId, r._count]));

    reviews.sort(
      (a, b) => (helpfulMap.get(b.id) ?? 0) - (helpfulMap.get(a.id) ?? 0),
    );
    return { reviews: reviews.slice(skip, skip + take), total };
  }

  const [reviews, total] = await Promise.all([
    prisma.eventReview.findMany({
      where: { eventId },
      take,
      skip,
      orderBy,
      include: {
        user: { select: { name: true, profileName: true, image: true } },
      },
    }),
    prisma.eventReview.count({ where: { eventId } }),
  ]);

  return { reviews, total };
}

export async function getTopRatedUpcomingEvents(limit = 6, minReviews = 2) {
  const topIds = await getTopRatedEventIds(limit * 2, minReviews);
  if (topIds.length === 0) return [];

  const events = await prisma.event.findMany({
    where: {
      id: { in: topIds.map((t) => t.eventId) },
      date: { gte: new Date() },
    },
    include: {
      venue: true,
      comedians: { include: { comedian: true } },
    },
    take: limit,
  });

  // Attach rating info and sort by avgRating desc
  const ratingMap = new Map(topIds.map((t) => [t.eventId, t]));
  return events
    .map((e) => ({ ...e, ratingInfo: ratingMap.get(e.id) }))
    .sort(
      (a, b) => (b.ratingInfo?.avgRating ?? 0) - (a.ratingInfo?.avgRating ?? 0),
    )
    .slice(0, limit);
}

export async function getEventRatingStatsBatch(eventIds: string[]) {
  if (eventIds.length === 0)
    return new Map<string, { count: number; avgRating: number | null }>();

  const results = await prisma.eventReview.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds } },
    _count: true,
    _avg: { rating: true },
  });

  const map = new Map<string, { count: number; avgRating: number | null }>();
  for (const r of results) {
    map.set(r.eventId, {
      count: r._count,
      avgRating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
    });
  }
  return map;
}
