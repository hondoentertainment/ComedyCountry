import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/subscribe
 *
 * Save a Web Push subscription for the authenticated user.
 * Called after the user grants notification permission and the browser
 * creates a push subscription via the Push API.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `notifications-subscribe:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 },
      );
    }
    if (!p256dh || typeof p256dh !== "string") {
      return NextResponse.json(
        { error: "p256dh key is required" },
        { status: 400 },
      );
    }
    if (!auth || typeof auth !== "string") {
      return NextResponse.json(
        { error: "auth secret is required" },
        { status: 400 },
      );
    }

    // Upsert: update if endpoint already exists, create if new
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh,
        auth,
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json(
      { id: subscription.id, endpoint: subscription.endpoint },
      { status: 201 },
    );
  } catch (err) {
    logger.error(
      "POST /api/notifications/subscribe error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 *
 * Remove a push subscription (e.g., when user revokes permission).
 */
export async function DELETE(request: Request) {
  const rl = await checkRateLimit(
    `notifications-subscribe:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 },
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.user.id,
        endpoint,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(
      "DELETE /api/notifications/subscribe error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 },
    );
  }
}
