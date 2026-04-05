import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateICSEvent, icsResponse } from "@/lib/calendar";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/events/[id]/reminder
 *
 * Set a reminder for an event. Creates an EventAttendance record
 * (if not already existing) and returns an ICS file for calendar integration.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reminder:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Fetch the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        comedians: {
          include: { comedian: { select: { name: true } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Ensure user has an attendance record (defaults to "interested")
    const existing = await prisma.eventAttendance.findUnique({
      where: {
        userId_eventId: { userId: session.user.id, eventId },
      },
    });

    if (!existing) {
      await prisma.eventAttendance.create({
        data: {
          userId: session.user.id,
          eventId,
          status: "interested",
        },
      });
    }

    // Parse body for optional format preference
    let format = "json";
    try {
      const body = await request.json();
      if (body.format === "ics") format = "ics";
    } catch {
      // No body or not JSON, default to json
    }

    const comedianNames = event.comedians
      .map((ec) => ec.comedian.name)
      .join(", ");
    const title = event.title ?? comedianNames ?? "Comedy Show";
    const location = [
      event.venue.name,
      event.venue.address,
      event.venue.city,
      event.venue.state,
    ]
      .filter(Boolean)
      .join(", ");
    const siteUrl =
      process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

    if (format === "ics") {
      const icsContent = generateICSEvent({
        id: event.id,
        title,
        startDate: new Date(event.date),
        description: `${title} at ${event.venue.name}\n${
          event.showtime ? `Showtime: ${event.showtime}` : ""
        }\n${siteUrl}/events/${event.id}`,
        location,
        url: `${siteUrl}/events/${event.id}`,
        organizer: { name: "Punchline Atlas" },
        alarms: [1440, 120], // 24h and 2h before
      });

      return icsResponse(icsContent, title);
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      title,
      date: event.date,
      venue: event.venue.name,
      reminder: {
        set: true,
        types: ["24h", "2h"],
      },
    });
  } catch (err) {
    logger.error(
      "POST /api/events/[id]/reminder error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to set reminder" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/events/[id]/reminder
 *
 * Remove a reminder for an event. Removes EventAttendance and any pending EventReminder records.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reminder:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Remove attendance record
    await prisma.eventAttendance.deleteMany({
      where: { userId: session.user.id, eventId },
    });

    // Remove any pending reminder records
    await prisma.eventReminder.deleteMany({
      where: { userId: session.user.id, eventId },
    });

    return NextResponse.json({ success: true, reminderRemoved: true });
  } catch (err) {
    logger.error(
      "DELETE /api/events/[id]/reminder error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to remove reminder" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/events/[id]/reminder
 *
 * Check if the current user has a reminder set for this event.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reminder:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    const attendance = await prisma.eventAttendance.findUnique({
      where: {
        userId_eventId: { userId: session.user.id, eventId },
      },
    });

    const reminders = await prisma.eventReminder.findMany({
      where: { userId: session.user.id, eventId },
      select: { kind: true, createdAt: true },
    });

    return NextResponse.json({
      hasReminder: !!attendance,
      status: attendance?.status ?? null,
      sentReminders: reminders.map((r) => ({
        kind: r.kind,
        sentAt: r.createdAt,
      })),
    });
  } catch (err) {
    logger.error(
      "GET /api/events/[id]/reminder error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to check reminder" },
      { status: 500 },
    );
  }
}
