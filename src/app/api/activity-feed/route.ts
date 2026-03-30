import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// GET: Activity feed showing friends' recent actions
export async function GET(request: Request) {
  const rl = await checkRateLimit(`activity-feed:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "20", 10),
    50,
  );

  try {
    // Get accepted friends
    const connections = await prisma.friendConnection.findMany({
      where: {
        OR: [
          { userId: session.user.id, status: "accepted" },
          { friendId: session.user.id, status: "accepted" },
        ],
      },
    });
    const friendIds = connections.map((c) =>
      c.userId === session.user.id ? c.friendId : c.userId,
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ activities: [], hasMore: false });
    }

    // Fetch recent reviews from friends
    const recentReviews = await prisma.eventReview.findMany({
      where: { userId: { in: friendIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            profileName: true,
            image: true,
            username: true,
          },
        },
        event: {
          select: { id: true, title: true, venue: { select: { name: true } } },
        },
      },
    });

    // Fetch recent follows from friends
    const recentFollows = await prisma.comedianFollow.findMany({
      where: { userId: { in: friendIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            profileName: true,
            image: true,
            username: true,
          },
        },
        comedian: { select: { name: true, slug: true } },
      },
    });

    // Merge and sort by date
    type Activity = {
      type: "review" | "follow";
      userId: string;
      userName: string;
      userImage: string | null;
      userUsername: string | null;
      description: string;
      link: string;
      rating?: number;
      createdAt: string;
    };

    const activities: Activity[] = [
      ...recentReviews.map((r) => ({
        type: "review" as const,
        userId: r.userId,
        userName: r.user.profileName ?? r.user.name ?? "Someone",
        userImage: r.user.image,
        userUsername: r.user.username,
        description: `reviewed "${r.event.title ?? "a show"}" at ${r.event.venue.name}`,
        link: `/events/${r.event.id}`,
        rating: r.rating,
        createdAt: r.createdAt.toISOString(),
      })),
      ...recentFollows.map((f) => ({
        type: "follow" as const,
        userId: f.userId,
        userName: f.user.profileName ?? f.user.name ?? "Someone",
        userImage: f.user.image,
        userUsername: f.user.username,
        description: `started following ${f.comedian.name}`,
        link: `/comedians/${f.comedian.slug}`,
        createdAt: f.createdAt.toISOString(),
      })),
    ];

    activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      activities: activities.slice(0, limit),
      hasMore: activities.length > limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load activity feed" },
      { status: 500 },
    );
  }
}
