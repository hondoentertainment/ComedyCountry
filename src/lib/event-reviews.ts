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
    avgRating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null,
  };
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

export async function getEventRatingStatsBatch(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, { count: number; avgRating: number | null }>();

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
      avgRating: r._avg.rating
        ? Math.round(r._avg.rating * 10) / 10
        : null,
    });
  }
  return map;
}
