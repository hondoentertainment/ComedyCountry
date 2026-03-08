import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/activity - Get social activity feed
 * Shows actions from users you follow + your own activity.
 * Query: ?cursor=<id>&limit=20
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    // Get IDs of users we follow
    const following = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });

    const actorIds = [session.user.id, ...following.map((f) => f.followingId)];

    const items = await prisma.activityFeedItem.findMany({
      where: {
        actorId: { in: actorIds },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    // Hydrate actor info
    const actorIdsInBatch = Array.from(new Set(items.map((i) => i.actorId)));
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIdsInBatch } },
      select: { id: true, name: true, profileName: true, image: true, username: true },
    });
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    const hasMore = items.length > limit;
    const results = items.slice(0, limit);

    return NextResponse.json({
      items: results.map((item) => ({
        id: item.id,
        actor: actorMap[item.actorId] || null,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        createdAt: item.createdAt,
      })),
      nextCursor: hasMore ? results[results.length - 1].createdAt.toISOString() : null,
    });
  } catch {
    return NextResponse.json({ items: [], nextCursor: null });
  }
}
