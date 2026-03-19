/**
 * ICS (iCalendar) file generation utilities.
 *
 * Generates standards-compliant .ics files for event reminders,
 * calendar exports, and email attachments.
 */

export interface CalendarEventInput {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  location?: string;
  url?: string;
  organizer?: { name: string; email?: string };
  /** Reminder minutes before event (e.g. [1440, 120] for 24h and 2h) */
  alarms?: number[];
}

/**
 * Escape special characters for ICS text fields per RFC 5545.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format a Date as an iCalendar UTC datetime string: YYYYMMDDTHHMMSSZ
 */
function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Fold long ICS lines at 75 octets per RFC 5545 Section 3.1.
 */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  const parts: string[] = [];
  parts.push(line.substring(0, maxLen));
  let remaining = line.substring(maxLen);

  while (remaining.length > 0) {
    // Continuation lines start with a space, leaving 74 chars of content
    const chunkLen = maxLen - 1;
    parts.push(" " + remaining.substring(0, chunkLen));
    remaining = remaining.substring(chunkLen);
  }

  return parts.join("\r\n");
}

/**
 * Generate a VALARM block for an ICS event.
 */
function generateAlarm(minutesBefore: number, eventTitle: string): string[] {
  return [
    "BEGIN:VALARM",
    "TRIGGER:-PT" + minutesBefore + "M",
    "ACTION:DISPLAY",
    foldLine(`DESCRIPTION:Reminder: ${escapeICSText(eventTitle)}`),
    "END:VALARM",
  ];
}

/**
 * Generate a complete ICS calendar string for a single event.
 */
export function generateICSEvent(input: CalendarEventInput): string {
  const {
    id,
    title,
    startDate,
    endDate,
    description,
    location,
    url,
    organizer,
    alarms,
  } = input;

  const end = endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Punchline Atlas//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Punchline Atlas",
    "BEGIN:VEVENT",
    `UID:${id}@punchlineatlas.com`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(end)}`,
    foldLine(`SUMMARY:${escapeICSText(title)}`),
  ];

  if (location) {
    lines.push(foldLine(`LOCATION:${escapeICSText(location)}`));
  }

  if (description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICSText(description)}`));
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  if (organizer) {
    const email = organizer.email ?? "noreply@punchlineatlas.com";
    lines.push(
      foldLine(`ORGANIZER;CN="${escapeICSText(organizer.name)}":mailto:${email}`)
    );
  }

  lines.push("STATUS:CONFIRMED");
  lines.push("TRANSP:OPAQUE");

  // Add alarm reminders
  const alarmMinutes = alarms ?? [1440, 120]; // Default: 24h and 2h before
  for (const mins of alarmMinutes) {
    lines.push(...generateAlarm(mins, title));
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Generate an ICS string for multiple events (e.g., all events a user is attending).
 */
export function generateICSCalendar(
  events: CalendarEventInput[],
  calendarName = "Punchline Atlas Events"
): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Punchline Atlas//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeICSText(calendarName)}`),
  ];

  for (const input of events) {
    const end =
      input.endDate ?? new Date(input.startDate.getTime() + 2 * 60 * 60 * 1000);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${input.id}@punchlineatlas.com`);
    lines.push(`DTSTAMP:${formatICSDate(now)}`);
    lines.push(`DTSTART:${formatICSDate(input.startDate)}`);
    lines.push(`DTEND:${formatICSDate(end)}`);
    lines.push(foldLine(`SUMMARY:${escapeICSText(input.title)}`));

    if (input.location) {
      lines.push(foldLine(`LOCATION:${escapeICSText(input.location)}`));
    }
    if (input.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(input.description)}`));
    }
    if (input.url) {
      lines.push(`URL:${input.url}`);
    }

    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");

    const alarmMinutes = input.alarms ?? [1440, 120];
    for (const mins of alarmMinutes) {
      lines.push(...generateAlarm(mins, input.title));
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Create a Response with ICS content for downloading.
 */
export function icsResponse(icsContent: string, filename: string): Response {
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, "-");
  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
