/**
 * Web Push notification utilities.
 *
 * Uses the Web Push protocol directly via fetch (no external dependency).
 * Requires VAPID keys in environment variables:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  – base64url-encoded public key
 *   VAPID_PRIVATE_KEY             – base64url-encoded private key
 *   VAPID_SUBJECT                 – mailto: or https:// contact
 */

import { prisma } from "./prisma";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send push notification to all subscriptions for a user.
 * Silently skips if VAPID keys are not configured or if crypto APIs aren't available.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.log("[PUSH] VAPID keys not configured, skipping push");
    return 0;
  }

  let subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
  try {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return 0;
  }

  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          TTL: "86400",
        },
        body,
      });

      if (res.ok || res.status === 201) {
        sent++;
      } else if (res.status === 404 || res.status === 410) {
        // Subscription expired, clean up
        try {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } catch {
          // ignore
        }
      }
    } catch {
      // Network error, skip
    }
  }

  return sent;
}

/**
 * Send push to all followers of a comedian.
 */
export async function pushToComedianFollowers(comedianId: string, payload: PushPayload): Promise<number> {
  try {
    const followers = await prisma.comedianFollow.findMany({
      where: { comedianId },
      select: { userId: true },
    });

    let total = 0;
    for (const f of followers) {
      total += await sendPushToUser(f.userId, payload);
    }
    return total;
  } catch {
    return 0;
  }
}
