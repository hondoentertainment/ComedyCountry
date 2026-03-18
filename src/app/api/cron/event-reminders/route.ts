import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, eventReminderHtml } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

/** 24h window: event.date between now+23.5h and now+24.5h */
const MS_23_5_H = 23.5 * 60 * 60 * 1000;
const MS_24_5_H = 24.5 * 60 * 60 * 1000;
/** 1h window: event.date between now+0.9h and now+1.1h */
const MS_54_M = 0.9 * 60 * 60 * 1000;
const MS_66_M = 1.1 * 60 * 60 * 1000;

type ReminderKind = "24h" | "1h";

/**
 * Cron endpoint: Send event reminders to users who RSVP'd or have tickets.
 * Runs every 15 min. Two windows: 24h before and 1h before event.
 * Protected by CRON_SECRET.
 *
 * POST /api/cron/event-reminders
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const window24hStart = new Date(now.getTime() + MS_23_5_H);
  const window24hEnd = new Date(now.getTime() + MS_24_5_H);
  const window1hStart = new Date(now.getTime() + MS_54_M);
  const window1hEnd = new Date(now.getTime() + MS_66_M);

  try {
    // Find events in 24h or 1h window
    const upcomingEvents = await prisma.event.findMany({
      where: {
        OR: [
          { date: { gte: window24hStart, lt: window24hEnd } },
          { date: { gte: window1hStart, lt: window1hEnd } },
        ],
      },
      include: {
        venue: { select: { name: true, city: true, state: true, address: true } },
        comedians: { include: { comedian: { select: { name: true } } } },
      },
    });

    let reminders24h = 0;
    let reminders1h = 0;

    for (const event of upcomingEvents) {
      const kind: ReminderKind =
        event.date >= window24hStart && event.date < window24hEnd ? "24h" : "1h";

      const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
      const eventTitle = event.title || comedianNames || "Comedy Show";
      const showtime = event.showtime || "Check your tickets";
      const venueTime = `${event.venue.name} — ${event.venue.city || ""}, ${event.venue.state || ""} — ${showtime}`.trim();

      // Users: EventAttendance status "going" OR valid Ticket for this event
      const [attendees, ticketHolders] = await Promise.all([
        prisma.eventAttendance.findMany({
          where: { eventId: event.id, status: "going" },
          select: { userId: true },
        }),
        prisma.ticket.findMany({
          where: { eventId: event.id, status: "VALID" },
          select: { userId: true },
        }),
      ]);

      const userIds = [...new Set([...attendees.map((a) => a.userId), ...ticketHolders.map((t) => t.userId)])];
      if (userIds.length === 0) continue;

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          name: true,
          notificationPreference: true,
        },
      });

      for (const user of users) {
        const pref = user.notificationPreference;
        const wants24h = pref?.eventReminder24h !== false;
        const wants1h = pref?.eventReminder1h !== false;
        if (kind === "24h" && !wants24h) continue;
        if (kind === "1h" && !wants1h) continue;

        const inAppEnabled = pref?.inApp !== false;
        const emailDigest = pref?.emailDigest;
        const wantsEmail = !!user.email && emailDigest && emailDigest !== "off";

        // Avoid duplicate: check EventReminder (works for both inApp-on and inApp-off users)
        const existing = await prisma.eventReminder.findUnique({
          where: {
            eventId_userId_kind: { eventId: event.id, userId: user.id, kind },
          },
        });
        if (existing) continue;

        const title = `Reminder: ${eventTitle}`;
        const message =
          kind === "24h"
            ? `${eventTitle} at ${venueTime} — starting in 24 hours`
            : `${eventTitle} at ${venueTime} — starting in 1 hour`;

        // In-app notification (skip if inApp disabled)
        if (inAppEnabled) {
          try {
            await prisma.notification.create({
              data: {
                userId: user.id,
                type: "event_reminder",
                title,
                message,
                eventId: event.id,
                venueId: event.venueId,
              },
            });
          } catch {
            // Non-critical
          }
        }

        // Push notification
        try {
          await sendPushToUser(user.id, {
            title,
            body: message,
            url: `/events/${event.id}`,
          });
        } catch {
          // Push may fail
        }

        // Email if enabled
        if (wantsEmail) {
          const dateStr =
            kind === "24h"
              ? `${event.venue.city || ""}, ${event.venue.state || ""} — ${showtime}`.trim()
              : showtime;
          const whenStr = kind === "24h" ? "in 24 hours" : "in 1 hour";
          try {
            await sendEmail({
              to: user.email!,
              subject: `Reminder: ${eventTitle} ${kind === "24h" ? "tomorrow" : "in 1 hour"} at ${event.venue.name}`,
              html: eventReminderHtml(
                user.name || "Comedy Fan",
                eventTitle,
                event.venue.name,
                dateStr,
                event.ticketUrl || `${process.env.NEXTAUTH_URL || "https://punchline-atlas.vercel.app"}/events/${event.id}`,
                whenStr
              ),
            });
          } catch {
            // Non-critical
          }
        }

        // Record that we sent this reminder (for deduplication)
        try {
          await prisma.eventReminder.create({
            data: { eventId: event.id, userId: user.id, kind },
          });
        } catch {
          // Non-critical; may fail if unique constraint hit (race)
        }

        if (kind === "24h") reminders24h++;
        else reminders1h++;
      }
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: upcomingEvents.length,
      reminders24h,
      reminders1h,
    });
  } catch (err) {
    console.error("Event reminders cron error:", err);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
