import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ScanResponse } from "@/types/tickets";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Phase 3: QR Code Ticket Validation Endpoint
 *
 * POST /api/tickets/validate — Scan and validate a ticket QR code
 * GET  /api/tickets/validate?qrCode=xxx — Look up ticket info by QR code
 *
 * Features:
 * - Unique QR code validation
 * - Prevent duplicate scans
 * - Check-in timestamp recording
 * - Event-day verification
 * - Capacity tracking
 */

// ── POST: Validate and scan a ticket QR code ──────────────────────────

export async function POST(request: Request) {
  const rl = await checkRateLimit(`tickets-validate:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { valid: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    qrCode?: string;
    scannerId?: string;
    location?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { qrCode, scannerId, location } = body;

  if (!qrCode) {
    return NextResponse.json(
      { valid: false, error: "qrCode is required" },
      { status: 400 }
    );
  }

  try {
    // Look up the ticket by QR code
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: {
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        },
        ticketType: true,
      },
    });

    if (!ticket) {
      logger.warn("Ticket validation: QR code not found", { qrCode: qrCode.slice(0, 10) });
      return NextResponse.json({
        valid: false,
        error: "Ticket not found. Invalid QR code.",
      });
    }

    // Already scanned (duplicate scan)
    if (ticket.status === "USED") {
      logger.info("Ticket validation: duplicate scan", {
        ticketId: ticket.id,
        previousScanAt: ticket.scannedAt?.toISOString(),
      });
      return NextResponse.json({
        valid: false,
        error: "Ticket already used",
        alreadyScanned: true,
        previousScanAt: ticket.scannedAt || undefined,
        ticket: {
          id: ticket.id,
          eventTitle: ticket.event.title || ticket.event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") || "Comedy Show",
          ticketType: ticket.ticketType.name,
          holderName: null,
          scannedAt: ticket.scannedAt!,
        },
      });
    }

    // Invalid status
    if (ticket.status !== "VALID") {
      logger.info("Ticket validation: invalid status", {
        ticketId: ticket.id,
        status: ticket.status,
      });
      return NextResponse.json({
        valid: false,
        error: `Ticket is ${ticket.status.toLowerCase()}. Cannot check in.`,
      });
    }

    // Check if the event is happening today (within reasonable window)
    const now = new Date();
    const eventDate = new Date(ticket.event.date);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.abs(
      (today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Allow check-in same day only (with 1-day buffer for late-night shows)
    if (daysDiff > 1) {
      const dateStr = eventDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (eventDate > now) {
        return NextResponse.json({
          valid: false,
          error: `This ticket is for ${dateStr}. Check-in is only available on the day of the event.`,
        });
      } else {
        return NextResponse.json({
          valid: false,
          error: `This event was on ${dateStr} and has already passed.`,
        });
      }
    }

    // Scan the ticket — mark as used with timestamp
    const checkinTimestamp = new Date();
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        scannedAt: checkinTimestamp,
      },
    });

    // Get ticket holder name
    const holder = await prisma.user.findUnique({
      where: { id: ticket.userId },
      select: { name: true, profileName: true },
    });

    const holderName = holder?.profileName || holder?.name || null;

    const eventTitle =
      ticket.event.title ||
      ticket.event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") ||
      "Comedy Show";

    // Log the check-in for capacity tracking
    try {
      await prisma.venueCapacityLog.create({
        data: {
          venueId: ticket.event.venueId,
          eventId: ticket.eventId,
          currentCount: 1, // increment — will be aggregated
          maxCapacity: ticket.event.venue.capacity || 0,
          source: "checkin",
        },
      });
    } catch {
      // Non-critical
    }

    logger.info("Ticket validated successfully", {
      ticketId: ticket.id,
      eventId: ticket.eventId,
      scannerId,
      location,
    });

    return NextResponse.json({
      valid: true,
      ticket: {
        id: updatedTicket.id,
        eventTitle,
        ticketType: ticket.ticketType.name,
        holderName,
        scannedAt: checkinTimestamp,
      },
    });
  } catch (err) {
    logger.error(
      "Ticket validation error",
      { qrCode: qrCode.slice(0, 10) },
      err instanceof Error ? err : undefined
    );
    return NextResponse.json(
      { valid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}

// ── GET: Look up ticket info by QR code (no scan) ────────────────────

export async function GET(request: Request) {
  const rl = await checkRateLimit(`tickets-validate:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const qrCode = url.searchParams.get("qrCode");

  if (!qrCode) {
    return NextResponse.json(
      { error: "qrCode query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: {
          include: {
            venue: { select: { id: true, name: true, city: true, state: true } },
            comedians: { include: { comedian: { select: { id: true, name: true, slug: true } } } },
          },
        },
        ticketType: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const holder = await prisma.user.findUnique({
      where: { id: ticket.userId },
      select: { name: true, profileName: true },
    });

    const eventTitle =
      ticket.event.title ||
      ticket.event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") ||
      "Comedy Show";

    return NextResponse.json({
      ticketId: ticket.id,
      qrCode: ticket.qrCode,
      status: ticket.status,
      eventId: ticket.eventId,
      eventTitle,
      venueName: ticket.event.venue.name,
      eventDate: ticket.event.date.toISOString(),
      showtime: ticket.event.showtime,
      ticketType: ticket.ticketType.name,
      holderName: holder?.profileName || holder?.name || null,
      purchasePrice: Number(ticket.purchasePrice),
      scannedAt: ticket.scannedAt,
      createdAt: ticket.createdAt,
    });
  } catch (err) {
    logger.error("Ticket lookup error", {}, err instanceof Error ? err : undefined);
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    );
  }
}
