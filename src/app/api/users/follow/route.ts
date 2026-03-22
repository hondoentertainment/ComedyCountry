import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/users/follow - Follow/unfollow a user
 * Body: { userId: string }
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`users-follow:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { userId: targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  try {
    // Check if already following
    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.userFollow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    }

    // Follow
    await prisma.userFollow.create({
      data: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    });

    // Create activity feed item
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, profileName: true },
      });
      await prisma.activityFeedItem.create({
        data: {
          actorId: session.user.id,
          action: "followed_user",
          entityType: "user",
          entityId: targetUserId,
          metadata: JSON.stringify({ name: targetUser?.profileName || targetUser?.name }),
        },
      });
    } catch {
      // Activity feed may not be available
    }

    return NextResponse.json({ following: true });
  } catch {
    return NextResponse.json({ error: "Follow service unavailable" }, { status: 503 });
  }
}

/**
 * GET /api/users/follow?userId= - Check follow status and get counts
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`users-follow:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const [followersCount, followingCount, isFollowing] = await Promise.all([
      prisma.userFollow.count({ where: { followingId: targetUserId } }),
      prisma.userFollow.count({ where: { followerId: targetUserId } }),
      session?.user?.id
        ? prisma.userFollow
            .findUnique({
              where: {
                followerId_followingId: {
                  followerId: session.user.id,
                  followingId: targetUserId,
                },
              },
            })
            .then((r) => !!r)
        : Promise.resolve(false),
    ]);

    return NextResponse.json({ followersCount, followingCount, isFollowing });
  } catch {
    return NextResponse.json({ followersCount: 0, followingCount: 0, isFollowing: false });
  }
}
