import { prisma } from "./prisma";

/**
 * Phase 9.9: 2-Way Calendar Sync
 *
 * Create, list, and delete calendar syncs.
 * Generate iCal format events and sync to external providers.
 */

/** Create a new calendar sync for a user + provider */
export async function createCalendarSync(
  userId: string,
  provider: string,
  data?: { calendarId?: string; accessToken?: string; refreshToken?: string }
) {
  const validProviders = ["google", "apple", "outlook"];
  if (!validProviders.includes(provider)) {
    throw new Error(
      `Invalid provider "${provider}". Must be one of: ${validProviders.join(", ")}`
    );
  }

  // Upsert — if a sync already exists for this user+provider, update it
  return prisma.calendarSync.upsert({
    where: {
      userId_provider: { userId, provider },
    },
    create: {
      userId,
      provider,
      calendarId: data?.calendarId ?? null,
      accessToken: data?.accessToken ?? null,
      refreshToken: data?.refreshToken ?? null,
      isActive: true,
    },
    update: {
      calendarId: data?.calendarId ?? undefined,
      accessToken: data?.accessToken ?? undefined,
      refreshToken: data?.refreshToken ?? undefined,
      isActive: true,
    },
  });
}

/** List all calendar syncs for a user */
export async function listCalendarSyncs(userId: string) {
  return prisma.calendarSync.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Delete (disconnect) a calendar sync */
export async function deleteCalendarSync(userId: string, syncId: string) {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: syncId },
  });

  if (!sync) {
    throw new Error("Calendar sync not found");
  }

  if (sync.userId !== userId) {
    throw new Error("Not your calendar sync");
  }

  return prisma.calendarSync.delete({
    where: { id: syncId },
  });
}

/** Deactivate a calendar sync without deleting it */
export async function deactivateCalendarSync(userId: string, syncId: string) {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: syncId },
  });

  if (!sync) {
    throw new Error("Calendar sync not found");
  }

  if (sync.userId !== userId) {
    throw new Error("Not your calendar sync");
  }

  return prisma.calendarSync.update({
    where: { id: syncId },
    data: { isActive: false },
  });
}

/**
 * Escape special characters in iCal text fields.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format a Date as an iCal DTSTART/DTEND value (UTC).
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate an iCal (RFC 5545) VEVENT string for a single event.
 */
export function generateICalEvent(event: {
  id: string;
  title: string;
  date: Date;
  showtime?: string | null;
  venue: { name: string; address?: string | null };
  description?: string;
}): string {
  const dtStart = formatICalDate(event.date);
  // Default 2-hour duration
  const endDate = new Date(event.date.getTime() + 2 * 60 * 60 * 1000);
  const dtEnd = formatICalDate(endDate);

  const location = event.venue.address
    ? `${event.venue.name}, ${event.venue.address}`
    : event.venue.name;

  const summary = escapeICalText(event.title);
  const desc = event.description
    ? escapeICalText(event.description)
    : event.showtime
      ? escapeICalText(`Showtime: ${event.showtime}`)
      : "";

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@comedycountry.com`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${escapeICalText(location)}`,
  ];

  if (desc) {
    lines.push(`DESCRIPTION:${desc}`);
  }

  lines.push(
    `DTSTAMP:${formatICalDate(new Date())}`,
    "END:VEVENT"
  );

  return lines.join("\r\n");
}

/**
 * Generate a full iCal calendar feed for a user's upcoming events.
 * Includes events the user has tickets for or is attending.
 */
export async function generateUserCalendarFeed(userId: string): Promise<string> {
  const now = new Date();

  // Get events from tickets
  const tickets = await prisma.ticket.findMany({
    where: {
      userId,
      status: "VALID",
      event: { date: { gte: now } },
    },
    include: {
      event: {
        include: {
          venue: { select: { name: true } },
          comedians: { include: { comedian: { select: { name: true } } } },
        },
      },
    },
  });

  // Get events from RSVP attendance
  const attendances = await prisma.eventAttendance.findMany({
    where: {
      userId,
      status: "going",
      event: { date: { gte: now } },
    },
    include: {
      event: {
        include: {
          venue: { select: { name: true } },
          comedians: { include: { comedian: { select: { name: true } } } },
        },
      },
    },
  });

  // Deduplicate events by ID
  const eventMap = new Map<string, (typeof tickets)[0]["event"]>();
  for (const t of tickets) {
    eventMap.set(t.event.id, t.event);
  }
  for (const a of attendances) {
    eventMap.set(a.event.id, a.event);
  }

  const events = Array.from(eventMap.values());

  const vevents = events.map((event) => {
    const comedianNames = event.comedians
      .map((ec) => ec.comedian.name)
      .join(", ");
    const title = event.title || comedianNames || "Comedy Show";

    return generateICalEvent({
      id: event.id,
      title,
      date: event.date,
      showtime: event.showtime,
      venue: event.venue,
      description: comedianNames ? `Featuring: ${comedianNames}` : undefined,
    });
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ComedyCountry//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:My Comedy Shows",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return calendar;
}

/**
 * Sync user events to an external calendar provider.
 * In production, this would call the provider's API. For now, it marks the
 * sync as having been executed and returns the events that would be synced.
 */
export async function syncToProvider(userId: string, syncId: string) {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: syncId },
  });

  if (!sync) {
    throw new Error("Calendar sync not found");
  }

  if (sync.userId !== userId) {
    throw new Error("Not your calendar sync");
  }

  if (!sync.isActive) {
    throw new Error("Calendar sync is not active");
  }

  // Generate the feed
  const feed = await generateUserCalendarFeed(userId);

  // Mark last sync time
  await prisma.calendarSync.update({
    where: { id: syncId },
    data: { lastSyncAt: new Date() },
  });

  return {
    provider: sync.provider,
    syncedAt: new Date(),
    eventCount: (feed.match(/BEGIN:VEVENT/g) || []).length,
  };
}
