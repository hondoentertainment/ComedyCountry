import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, eventReminderHtml } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

/**
 * Cron endpoint: Send event reminders to users who RSVP'd.
 * Should be called daily. Sends reminders for events happening tomorrow.
 * Protected by CRON_SECRET.
 *
 * POST /api/cron/event-reminders
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  try {
    // Find events happening tomorrow with RSVP'd users
    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: { gte: tomorrow, lt: dayAfter },
        attendees: { some: {} },
      },
      include: {
        venue: { select: { name: true, city: true, state: true, address: true } },
        comedians: { include: { comedian: { select: { name: true } } } },
        attendees: {
          where: { status: "going" },
          include: {
            user: { select: { id: true, email: true, name: true, notificationPreference: true } },
          },
        },
      },
    });

    let emailsSent = 0;
    let pushSent = 0;

    for (const event of upcomingEvents) {
      const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
      const eventTitle = event.title || comedianNames || "Comedy Show";
      const showtime = event.showtime || "Check your tickets";

      for (const attendance of event.attendees) {
        const user = attendance.user;

        // Send push notification
        try {
          await sendPushToUser(user.id, {
            title: "Show Tomorrow!",
            body: `${eventTitle} at ${event.venue.name} — ${showtime}`,
            url: `/events/${event.id}`,
          });
          pushSent++;
        } catch {
          // Push may fail for users without subscriptions
        }

        // Send email reminder if enabled
        const emailDigest = user.notificationPreference?.emailDigest;
        if (user.email && emailDigest && emailDigest !== "off") {
          try {
            await sendEmail({
              to: user.email,
              subject: `Reminder: ${eventTitle} tomorrow at ${event.venue.name}`,
              html: eventReminderHtml(
                user.name || "Comedy Fan",
                eventTitle,
                event.venue.name,
                `${event.venue.city}, ${event.venue.state} — ${showtime}`,
                event.ticketUrl || `/events/${event.id}`
              ),
            });
            emailsSent++;
          } catch {
            // Email failure is non-critical
          }
        }

        // Create in-app notification
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "event_reminder",
              title: "Show Tomorrow!",
              message: `${eventTitle} at ${event.venue.name} — ${showtime}`,
              eventId: event.id,
              venueId: event.venueId,
            },
          });
        } catch {
          // Non-critical
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: upcomingEvents.length,
      emailsSent,
      pushSent,
    });
  } catch (err) {
    console.error("Event reminders cron error:", err);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
