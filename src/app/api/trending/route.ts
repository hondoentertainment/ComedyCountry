import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`trending:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Trending comedians: most new followers in last 30 days
  const trendingFollows = await prisma.comedianFollow.groupBy({
    by: ["comedianId"],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: true,
    orderBy: { _count: { comedianId: "desc" } },
    take: 12,
  });

  const trendingComedianIds = trendingFollows.map((f) => f.comedianId);

  const [trendingComedians, hotShows, topVenues] = await Promise.all([
    prisma.comedian.findMany({
      where: { id: { in: trendingComedianIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
        touringStatus: true,
        genres: true,
        _count: { select: { followers: true, events: true } },
      },
    }),
    // Most anticipated shows: most "going" attendees
    prisma.event.findMany({
      where: { date: { gte: new Date() } },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        comedians: { include: { comedian: { select: { name: true, slug: true, headshotUrl: true } } } },
        _count: { select: { attendees: true, reviews: true } },
      },
      orderBy: { attendees: { _count: "desc" } },
      take: 10,
    }),
    // Top venues by follower count
    prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        type: true,
        _count: { select: { followers: true, events: true } },
      },
      orderBy: { followers: { _count: "desc" } },
      take: 10,
    }),
  ]);

  // Sort trending comedians to match the follow count order
  const comedianMap = new Map(trendingComedians.map((c) => [c.id, c]));
  const sortedTrending = trendingComedianIds
    .map((id) => {
      const c = comedianMap.get(id);
      const recentFollows = trendingFollows.find((f) => f.comedianId === id)?._count ?? 0;
      return c ? { ...c, recentFollows } : null;
    })
    .filter(Boolean);

  return NextResponse.json({
    trendingComedians: sortedTrending,
    hotShows,
    topVenues,
  });
}
