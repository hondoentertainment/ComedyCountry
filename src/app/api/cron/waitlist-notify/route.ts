import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { sendEmail } from "@/lib/email";

/**
 * Cron endpoint: Notify waitlisted users when an event's ticket URL is updated
 * or event status changes (e.g. soldOut flag removed).
 *
 * POST /api/cron/waitlist-notify
 * Body: { eventId } — notify all waitlisted users for this event
 *
 * Can also be called by admin when manually restocking tickets.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await request.json();
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        comedians: { include: { comedian: { select: { name: true } } } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all un-notified waitlist entries
    const waitlistEntries = await prisma.eventWaitlist.findMany({
      where: { eventId, notified: false },
      select: { id: true, userId: true },
    });

    if (waitlistEntries.length === 0) {
      return NextResponse.json({ notified: 0 });
    }

    const comedianNames = event.comedians
      .map((ec) => ec.comedian.name)
      .join(", ");
    const eventTitle = event.title || comedianNames || "Comedy Show";
    let notified = 0;

    for (const entry of waitlistEntries) {
      // Push notification
      try {
        await sendPushToUser(entry.userId, {
          title: "Tickets Available!",
          body: `${eventTitle} at ${event.venue.name} — tickets are now available!`,
          url: `/events/${eventId}`,
        });
      } catch {
        // Push may fail
      }

      // In-app notification
      try {
        await prisma.notification.create({
          data: {
            userId: entry.userId,
            type: "waitlist_available",
            title: "Tickets Available!",
            message: `Tickets for ${eventTitle} at ${event.venue.name} are now available. Get yours before they sell out again!`,
            eventId,
            venueId: event.venueId,
          },
        });
      } catch {
        // Non-critical
      }

      // Email (if user has email and digest enabled)
      try {
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: { email: true, name: true, notificationPreference: true },
        });
        if (user?.email && user.notificationPreference?.emailDigest !== "off") {
          await sendEmail({
            to: user.email,
            subject: `Tickets now available: ${eventTitle}`,
            html: `<p>Hi ${user.name || "there"},</p><p>Tickets for <strong>${eventTitle}</strong> at ${event.venue.name} are now available!</p><p><a href="${event.ticketUrl || `/events/${eventId}`}">Get tickets</a></p>`,
          });
        }
      } catch {
        // Email failure is non-critical
      }

      notified++;
    }

    // Mark all as notified
    await prisma.eventWaitlist.updateMany({
      where: { eventId, notified: false },
      data: { notified: true },
    });

    return NextResponse.json({ notified, total: waitlistEntries.length });
  } catch (err) {
    logger.error(
      "Waitlist notify error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process notifications" },
      { status: 500 },
    );
  }
}
