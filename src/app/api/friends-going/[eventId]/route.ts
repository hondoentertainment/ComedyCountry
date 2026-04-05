import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET - Get list of friends attending an event.
 * Returns friends who have RSVP'd (EventAttendance) or bought tickets (Ticket).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const rl = await checkRateLimit(`friends-going:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { eventId } = await params;
    if (!eventId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    const userId = session.user.id;

    // Get accepted friend IDs
    const [outgoing, incoming] = await Promise.all([
      prisma.friendConnection.findMany({
        where: { userId, status: "accepted" },
        select: { friendId: true },
      }),
      prisma.friendConnection.findMany({
        where: { friendId: userId, status: "accepted" },
        select: { userId: true },
      }),
    ]);

    const friendIds = [
      ...outgoing.map((c) => c.friendId),
      ...incoming.map((c) => c.userId),
    ];

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [], count: 0 });
    }

    // Find friends who RSVP'd or have tickets
    const [rsvps, ticketHolders] = await Promise.all([
      prisma.eventAttendance.findMany({
        where: {
          eventId,
          userId: { in: friendIds },
        },
        select: { userId: true },
      }),
      prisma.ticket.findMany({
        where: {
          eventId,
          userId: { in: friendIds },
          status: "VALID",
        },
        select: { userId: true },
      }),
    ]);

    // Deduplicate
    const goingIds = Array.from(
      new Set([
        ...rsvps.map((r) => r.userId),
        ...ticketHolders.map((t) => t.userId),
      ]),
    );

    if (goingIds.length === 0) {
      return NextResponse.json({ friends: [], count: 0 });
    }

    const friends = await prisma.user.findMany({
      where: { id: { in: goingIds } },
      select: {
        id: true,
        name: true,
        profileName: true,
        image: true,
        username: true,
      },
    });

    return NextResponse.json({
      friends,
      count: friends.length,
    });
  } catch (err) {
    logger.error(
      "Friends going error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch friends going" },
      { status: 500 },
    );
  }
}
