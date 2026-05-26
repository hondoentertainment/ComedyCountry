import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, pushToComedianFollowers } from "@/lib/push";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/notifications/send
 *
 * Send a notification to user(s). Admin/system use only.
 *
 * Supported notification types:
 * - event_reminder: Remind about an upcoming event
 * - new_show_nearby: New show in user's area
 * - comedian_update: Update from a followed comedian
 * - ticket_confirmation: Ticket purchase confirmation
 * - price_drop: Ticket price decrease
 * - system: System-wide announcement
 *
 * Body:
 * {
 *   type: string,
 *   title: string,
 *   message: string,
 *   userId?: string,          // Send to specific user
 *   comedianId?: string,      // Send to all followers of comedian
 *   eventId?: string,         // Associated event
 *   venueId?: string,         // Associated venue
 *   url?: string,             // Deep link URL for push notification
 *   broadcast?: boolean,      // Send to all users (admin only)
 * }
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `notifications-send:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only admins can send notifications
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      type,
      title,
      message,
      userId,
      comedianId,
      eventId,
      venueId,
      url,
      broadcast,
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 },
      );
    }

    const validTypes = [
      "event_reminder",
      "new_show_nearby",
      "comedian_update",
      "ticket_confirmation",
      "price_drop",
      "system",
      "new_event",
      "event_update",
      "location_alert",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    let notificationsCreated = 0;
    let pushesSent = 0;

    if (userId) {
      // Send to specific user
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          eventId: eventId ?? null,
          venueId: venueId ?? null,
          comedianId: comedianId ?? null,
        },
      });
      notificationsCreated++;

      pushesSent += await sendPushToUser(userId, {
        title,
        body: message,
        url: url ?? undefined,
      });
    } else if (comedianId) {
      // Send to all followers of a comedian
      const followers = await prisma.comedianFollow.findMany({
        where: { comedianId },
        select: { userId: true },
      });

      for (const follower of followers) {
        // Check notification preferences
        const pref = await prisma.notificationPreference.findUnique({
          where: { userId: follower.userId },
        });
        if (pref?.inApp === false) continue;

        await prisma.notification.create({
          data: {
            userId: follower.userId,
            type,
            title,
            message,
            eventId: eventId ?? null,
            venueId: venueId ?? null,
            comedianId: comedianId ?? null,
          },
        });
        notificationsCreated++;
      }

      pushesSent += await pushToComedianFollowers(comedianId, {
        title,
        body: message,
        url: url ?? undefined,
      });
    } else if (broadcast) {
      // Broadcast to all users (batch to avoid memory issues)
      const batchSize = 100;
      let cursor: string | undefined;

      while (true) {
        const users = await prisma.user.findMany({
          take: batchSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          select: { id: true },
          orderBy: { id: "asc" },
        });

        if (users.length === 0) break;

        for (const u of users) {
          const pref = await prisma.notificationPreference.findUnique({
            where: { userId: u.id },
          });
          if (pref?.inApp === false) continue;

          await prisma.notification.create({
            data: {
              userId: u.id,
              type,
              title,
              message,
              eventId: eventId ?? null,
              venueId: venueId ?? null,
              comedianId: comedianId ?? null,
            },
          });
          notificationsCreated++;

          try {
            pushesSent += await sendPushToUser(u.id, {
              title,
              body: message,
              url: url ?? undefined,
            });
          } catch {
            // Non-critical
          }
        }

        cursor = users[users.length - 1].id;
        if (users.length < batchSize) break;
      }
    } else {
      return NextResponse.json(
        {
          error: "Must specify userId, comedianId, or broadcast: true",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      pushesSent,
    });
  } catch (err) {
    logger.error(
      "POST /api/notifications/send error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}
