import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET - List friends (accepted connections + pending requests).
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`friends:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Connections where the user is either side
    const [outgoing, incoming] = await Promise.all([
      prisma.friendConnection.findMany({
        where: { userId },
        select: {
          id: true,
          friendId: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.friendConnection.findMany({
        where: { friendId: userId },
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Gather all related user IDs
    const relatedIds = [
      ...outgoing.map((c) => c.friendId),
      ...incoming.map((c) => c.userId),
    ];

    const users =
      relatedIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: relatedIds } },
            select: {
              id: true,
              name: true,
              profileName: true,
              image: true,
              username: true,
            },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const accepted = [
      ...outgoing
        .filter((c) => c.status === "accepted")
        .map((c) => ({
          connectionId: c.id,
          user: userMap.get(c.friendId) ?? null,
          since: c.createdAt,
        })),
      ...incoming
        .filter((c) => c.status === "accepted")
        .map((c) => ({
          connectionId: c.id,
          user: userMap.get(c.userId) ?? null,
          since: c.createdAt,
        })),
    ];

    const pendingSent = outgoing
      .filter((c) => c.status === "pending")
      .map((c) => ({
        connectionId: c.id,
        user: userMap.get(c.friendId) ?? null,
        createdAt: c.createdAt,
      }));

    const pendingReceived = incoming
      .filter((c) => c.status === "pending")
      .map((c) => ({
        connectionId: c.id,
        user: userMap.get(c.userId) ?? null,
        createdAt: c.createdAt,
      }));

    return NextResponse.json({ accepted, pendingSent, pendingReceived });
  } catch (err) {
    console.error("Friends GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send a friend request.
 * Body: { friendId } or { username }
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`friends:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    let targetId: string | undefined = body.friendId;

    // Look up by username if friendId not provided
    if (!targetId && body.username) {
      const target = await prisma.user.findUnique({
        where: { username: body.username },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      targetId = target.id;
    }

    if (!targetId) {
      return NextResponse.json(
        { error: "friendId or username is required" },
        { status: 400 }
      );
    }

    if (targetId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send a friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if connection already exists in either direction
    const existing = await prisma.friendConnection.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: targetId },
          { userId: targetId, friendId: session.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "blocked") {
        return NextResponse.json({ error: "Cannot connect with this user" }, { status: 403 });
      }
      return NextResponse.json(
        { error: "Friend request already exists", status: existing.status },
        { status: 409 }
      );
    }

    const connection = await prisma.friendConnection.create({
      data: {
        userId: session.user.id,
        friendId: targetId,
        status: "pending",
      },
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (err) {
    console.error("Friends POST error:", err);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
