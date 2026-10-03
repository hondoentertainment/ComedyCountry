/**
 * Web Push notification utilities.
 *
 * Uses the Web Push protocol with VAPID authentication.
 * Uses web-push for authenticated, encrypted delivery.
 *
 * Requires VAPID keys in environment variables:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  - base64url-encoded public key
 *   VAPID_PRIVATE_KEY             - base64url-encoded private key
 *   VAPID_SUBJECT                 - mailto: or https:// contact (optional)
 */

import { prisma } from "./prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  /** Notification type for filtering */
  type?: NotificationType;
  /** Data payload (not displayed, available in SW) */
  data?: Record<string, unknown>;
}

export type NotificationType =
  | "event_reminder"
  | "new_show_nearby"
  | "comedian_update"
  | "ticket_confirmation"
  | "price_drop"
  | "system"
  | "new_event"
  | "event_update"
  | "location_alert";

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ─── Web Push Sender ────────────────────────────────────────────────────────

/**
 * Send a push notification to a single subscription endpoint.
 * Only permanent expiration responses invalidate a subscription.
 */
async function sendToSubscription(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<"sent" | "expired" | "failed"> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return "failed";
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/icon-72x72.png",
    tag: payload.tag,
    data: {
      url: payload.url ?? "/",
      type: payload.type,
      ...(payload.data ?? {}),
    },
  });

  try {
    const { default: webpush } = await import("web-push");

    if (webpush) {
      const vapidSubject =
        process.env.VAPID_SUBJECT ?? "mailto:notifications@punchlineatlas.com";

      webpush.setVapidDetails(vapidSubject, publicKey, privateKey);

      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        body,
        {
          TTL: 86400, // 24 hours
          urgency: "normal",
          topic: payload.tag,
        }
      );

      return "sent";
    }

    return "failed";
  } catch (err) {
    // Check if subscription is expired/invalid
    if (err && typeof err === "object" && "statusCode" in err) {
      const statusCode = (err as { statusCode: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return "expired";
      }
    }
    return "failed";
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Send push notification to all subscriptions for a user.
 * Silently skips if VAPID keys are not configured.
 * Cleans up expired subscriptions automatically.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.log("[PUSH] VAPID keys not configured, skipping push");
    return 0;
  }

  let subscriptions: PushSubscriptionRecord[] = [];
  try {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return 0;
  }

  if (subscriptions.length === 0) return 0;

  let sent = 0;
  const expiredIds: string[] = [];

  for (const sub of subscriptions) {
    const result = await sendToSubscription(sub, payload);
    if (result === "sent") {
      sent++;
    } else if (result === "expired") {
      expiredIds.push(sub.id);
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
    } catch {
      // Non-critical cleanup
    }
  }

  return sent;
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<number> {
  let total = 0;
  for (const userId of userIds) {
    total += await sendPushToUser(userId, payload);
  }
  return total;
}

/**
 * Send push to all followers of a comedian.
 */
export async function pushToComedianFollowers(
  comedianId: string,
  payload: PushPayload
): Promise<number> {
  try {
    const followers = await prisma.comedianFollow.findMany({
      where: { comedianId },
      select: { userId: true },
    });

    return await sendPushToUsers(
      followers.map((f) => f.userId),
      { ...payload, type: payload.type ?? "comedian_update" }
    );
  } catch {
    return 0;
  }
}

/**
 * Send push to all followers of a venue.
 */
export async function pushToVenueFollowers(
  venueId: string,
  payload: PushPayload
): Promise<number> {
  try {
    const followers = await prisma.venueFollow.findMany({
      where: { venueId },
      select: { userId: true },
    });

    return await sendPushToUsers(
      followers.map((f) => f.userId),
      { ...payload, type: payload.type ?? "new_event" }
    );
  } catch {
    return 0;
  }
}

/**
 * Send push to all attendees of an event (RSVP'd or ticket holders).
 */
export async function pushToEventAttendees(
  eventId: string,
  payload: PushPayload
): Promise<number> {
  try {
    const [attendees, ticketHolders] = await Promise.all([
      prisma.eventAttendance.findMany({
        where: { eventId, status: "going" },
        select: { userId: true },
      }),
      prisma.ticket.findMany({
        where: { eventId, status: "VALID" },
        select: { userId: true },
      }),
    ]);

    const userIds = Array.from(new Set([
      ...attendees.map((a: { userId: string }) => a.userId),
      ...ticketHolders.map((t: { userId: string }) => t.userId),
    ]));

    return await sendPushToUsers(userIds, {
      ...payload,
      type: payload.type ?? "event_reminder",
    });
  } catch {
    return 0;
  }
}
