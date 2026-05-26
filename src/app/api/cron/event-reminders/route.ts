import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail, eventReminderHtml } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

/** 24h window: event.date between now+23.5h and now+24.5h */
const MS_23_5_H = 23.5 * 60 * 60 * 1000;
const MS_24_5_H = 24.5 * 60 * 60 * 1000;
/** 2h window: event.date between now+1.75h and now+2.25h */
const MS_1_75_H = 1.75 * 60 * 60 * 1000;
const MS_2_25_H = 2.25 * 60 * 60 * 1000;
/** 1h window: event.date between now+0.9h and now+1.1h */
const MS_54_M = 0.9 * 60 * 60 * 1000;
const MS_66_M = 1.1 * 60 * 60 * 1000;

type ReminderKind = "24h" | "2h" | "1h";

/**
 * Cron endpoint: Send event reminders to users who RSVP'd or have tickets.
 * Runs every 15 min. Three windows: 24h, 2h, and 1h before event.
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
  const window2hStart = new Date(now.getTime() + MS_1_75_H);
  const window2hEnd = new Date(now.getTime() + MS_2_25_H);
  const window1hStart = new Date(now.getTime() + MS_54_M);
  const window1hEnd = new Date(now.getTime() + MS_66_M);

  try {
    // Find events in any reminder window
    const upcomingEvents = await prisma.event.findMany({
      where: {
        OR: [
          { date: { gte: window24hStart, lt: window24hEnd } },
          { date: { gte: window2hStart, lt: window2hEnd } },
          { date: { gte: window1hStart, lt: window1hEnd } },
        ],
      },
      include: {
        venue: {
          select: {
            name: true,
            city: true,
            state: true,
            address: true,
          },
        },
        comedians: {
          include: { comedian: { select: { name: true } } },
        },
      },
    });

    let reminders24h = 0;
    let reminders2h = 0;
    let reminders1h = 0;

    for (const event of upcomingEvents) {
      // Determine which reminder window this event falls into
      let kind: ReminderKind;
      if (event.date >= window24hStart && event.date < window24hEnd) {
        kind = "24h";
      } else if (event.date >= window2hStart && event.date < window2hEnd) {
        kind = "2h";
      } else {
        kind = "1h";
      }

      const comedianNames = event.comedians
        .map((ec) => ec.comedian.name)
        .join(", ");
      const eventTitle = event.title || comedianNames || "Comedy Show";
      const showtime = event.showtime || "Check your tickets";
      const venueInfo =
        `${event.venue.name} — ${event.venue.city || ""}, ${event.venue.state || ""}`.trim();
      const venueTime = `${venueInfo} — ${showtime}`;

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

      const userIds = [
        ...new Set([
          ...attendees.map((a) => a.userId),
          ...ticketHolders.map((t) => t.userId),
        ]),
      ];
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
        // 2h reminders follow the 1h preference (both are "close to event" reminders)
        const wants2h = pref?.eventReminder1h !== false;

        if (kind === "24h" && !wants24h) continue;
        if (kind === "2h" && !wants2h) continue;
        if (kind === "1h" && !wants1h) continue;

        const inAppEnabled = pref?.inApp !== false;
        const emailDigest = pref?.emailDigest;
        const wantsEmail = !!user.email && emailDigest && emailDigest !== "off";

        // Avoid duplicate: check EventReminder
        const existing = await prisma.eventReminder.findUnique({
          where: {
            eventId_userId_kind: {
              eventId: event.id,
              userId: user.id,
              kind,
            },
          },
        });
        if (existing) continue;

        const timeLabel =
          kind === "24h" ? "24 hours" : kind === "2h" ? "2 hours" : "1 hour";
        const title = `Reminder: ${eventTitle}`;
        const message = `${eventTitle} at ${venueTime} — starting in ${timeLabel}`;

        // In-app notification
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
            type: "event_reminder",
            tag: `reminder-${event.id}-${kind}`,
          });
        } catch {
          // Push may fail
        }

        // Email with ICS calendar attachment for 24h reminders
        if (wantsEmail) {
          const whenLabel =
            kind === "24h"
              ? "tomorrow"
              : kind === "2h"
                ? "in 2 hours"
                : "in 1 hour";
          const siteUrl =
            process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
          const eventUrl = event.ticketUrl ?? `${siteUrl}/events/${event.id}`;
          const dateStr = kind === "24h" ? venueInfo : showtime;
          const whenStr = `in ${timeLabel}`;

          try {
            // For 24h reminders, include a calendar link in the email
            const calendarUrl =
              kind === "24h"
                ? `${siteUrl}/api/events/${event.id}/calendar`
                : undefined;

            // Build the email HTML with optional calendar download link
            const emailHtml = eventReminderHtml(
              user.name || "Comedy Fan",
              eventTitle,
              event.venue.name,
              dateStr,
              eventUrl,
              whenStr,
            );

            // Append calendar link for 24h reminders
            const finalHtml = calendarUrl
              ? emailHtml.replace(
                  "</body>",
                  `<p style="text-align:center;margin-top:16px"><a href="${calendarUrl}" style="color:#d4a843;text-decoration:underline;font-size:14px">Add to Calendar (.ics)</a></p></body>`,
                )
              : emailHtml;

            await sendEmail({
              to: user.email!,
              subject: `Reminder: ${eventTitle} ${whenLabel} at ${event.venue.name}`,
              html: finalHtml,
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
        else if (kind === "2h") reminders2h++;
        else reminders1h++;
      }
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: upcomingEvents.length,
      reminders24h,
      reminders2h,
      reminders1h,
    });
  } catch (err) {
    logger.error(
      "Event reminders cron error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 },
    );
  }
}
