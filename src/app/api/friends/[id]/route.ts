import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST - Accept, decline, or block a friend request.
 * Body: { action: "accept" | "decline" | "block" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`friends:${getRateLimitKey(request)}`, {
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

    const { id: connectionId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!["accept", "decline", "block"].includes(action)) {
      return NextResponse.json(
        { error: "action must be accept, decline, or block" },
        { status: 400 },
      );
    }

    // The connection must exist and the current user must be the recipient (friendId)
    const connection = await prisma.friendConnection.findFirst({
      where: {
        id: connectionId,
        friendId: session.user.id,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 },
      );
    }

    if (action === "decline") {
      await prisma.friendConnection.delete({ where: { id: connectionId } });
      return NextResponse.json({ success: true, action: "declined" });
    }

    const newStatus = action === "accept" ? "accepted" : "blocked";

    await prisma.friendConnection.update({
      where: { id: connectionId },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, action, status: newStatus });
  } catch (err) {
    logger.error(
      "Friends action error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process friend request" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove a friend connection.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`friends:${getRateLimitKey(request)}`, {
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

    const { id: connectionId } = await params;

    // User must be part of this connection
    const connection = await prisma.friendConnection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userId: session.user.id }, { friendId: session.user.id }],
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Friend connection not found" },
        { status: 404 },
      );
    }

    await prisma.friendConnection.delete({ where: { id: connectionId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(
      "Friends DELETE error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 },
    );
  }
}
