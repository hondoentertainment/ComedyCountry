import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Phase 3: Season Pass — Individual Pass Operations
 *
 * GET  /api/season-passes/[id] — Get pass details with redemption history
 * POST /api/season-passes/[id] — Redeem pass for an event or validate
 */

// ── GET: Get season pass details with redemption history ──────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pass = await prisma.seasonPass.findUnique({
      where: { id },
      include: {
        redemptions: {
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    if (!pass) {
      return NextResponse.json({ error: "Season pass not found" }, { status: 404 });
    }

    if (pass.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get venue info
    const venue = await prisma.venue.findUnique({
      where: { id: pass.venueId },
      select: { id: true, name: true, city: true, state: true },
    });

    // Get event details for each redemption
    const eventIds = pass.redemptions.map((r: { eventId: string }) => r.eventId);
    const events = eventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            title: true,
            date: true,
            showtime: true,
            venue: { select: { name: true } },
            comedians: {
              include: { comedian: { select: { name: true } } },
            },
          },
        })
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventMap = new Map(events.map((e: any) => [e.id, e]));

    const now = new Date();
    const isExpired = pass.expiresAt < now;
    const remainingShows = Math.max(0, pass.totalShows - pass.usedShows);

    // Get upcoming events at this venue for potential redemption
    const upcomingEvents = await prisma.event.findMany({
      where: {
        venueId: pass.venueId,
        date: { gte: now },
      },
      select: {
        id: true,
        title: true,
        date: true,
        showtime: true,
        comedians: {
          include: { comedian: { select: { name: true } } },
        },
      },
      orderBy: { date: "asc" },
      take: 10,
    });

    // Mark which upcoming events have already been redeemed
    const redeemedEventIds = new Set(eventIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableEvents = upcomingEvents.map((e: any) => ({
      ...e,
      alreadyRedeemed: redeemedEventIds.has(e.id),
    }));

    return NextResponse.json({
      ...pass,
      venue: venue || { id: pass.venueId, name: "Unknown", city: "", state: "" },
      isExpired,
      remainingShows,
      usagePercent: pass.totalShows > 0
        ? Math.round((pass.usedShows / pass.totalShows) * 100)
        : 0,
      redemptions: pass.redemptions.map((r: { eventId: string }) => ({
        ...r,
        event: eventMap.get(r.eventId) || null,
      })),
      availableEvents,
    });
  } catch (err) {
    logger.error("Failed to load season pass", { id }, err instanceof Error ? err : undefined);
    return NextResponse.json(
      { error: "Failed to load season pass" },
      { status: 500 }
    );
  }
}

// ── POST: Redeem or validate season pass ──────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    action?: "redeem" | "validate";
    eventId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, eventId } = body;

  if (!action || !["redeem", "validate"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'redeem' or 'validate'" },
      { status: 400 }
    );
  }

  try {
    const pass = await prisma.seasonPass.findUnique({
      where: { id },
      include: {
        redemptions: true,
      },
    });

    if (!pass) {
      return NextResponse.json({ error: "Season pass not found" }, { status: 404 });
    }

    if (pass.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ── Validate action ──────────────────────────────────────────────
    if (action === "validate") {
      const now = new Date();
      const isExpired = pass.expiresAt < now;
      const remainingShows = Math.max(0, pass.totalShows - pass.usedShows);

      return NextResponse.json({
        valid: !isExpired && remainingShows > 0,
        passId: pass.id,
        remainingShows,
        expired: isExpired,
        error: isExpired
          ? "Season pass has expired"
          : remainingShows <= 0
            ? "All shows have been used"
            : undefined,
      });
    }

    // ── Redeem action ────────────────────────────────────────────────
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required for redemption" },
        { status: 400 }
      );
    }

    // Validate pass is still active
    const now = new Date();
    if (pass.expiresAt < now) {
      return NextResponse.json(
        { error: "Season pass has expired" },
        { status: 400 }
      );
    }

    const remainingShows = pass.totalShows - pass.usedShows;
    if (remainingShows <= 0) {
      return NextResponse.json(
        { error: "No remaining shows on this season pass" },
        { status: 400 }
      );
    }

    // Verify event exists and belongs to the same venue
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        venueId: true,
        title: true,
        date: true,
        showtime: true,
        comedians: {
          include: { comedian: { select: { name: true } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.venueId !== pass.venueId) {
      return NextResponse.json(
        { error: "Event is not at the venue for this season pass" },
        { status: 400 }
      );
    }

    // Check if already redeemed for this event
    const existingRedemption = pass.redemptions.find(
      (r) => r.eventId === eventId
    );

    if (existingRedemption) {
      return NextResponse.json(
        { error: "Already redeemed for this event" },
        { status: 409 }
      );
    }

    // Process redemption in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redemption = await prisma.$transaction(async (tx: any) => {
      // Re-check pass state inside transaction
      const freshPass = await tx.seasonPass.findUnique({
        where: { id },
      });

      if (!freshPass || freshPass.usedShows >= freshPass.totalShows) {
        throw new Error("No remaining shows on this season pass");
      }

      // Increment used shows
      await tx.seasonPass.update({
        where: { id },
        data: { usedShows: { increment: 1 } },
      });

      // Create redemption record
      return tx.seasonPassRedemption.create({
        data: {
          passId: id,
          eventId,
          showNumber: freshPass.usedShows + 1,
        },
      });
    });

    const newRemainingShows = remainingShows - 1;

    // Create notification
    try {
      const eventTitle =
        event.title ||
        event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") ||
        "Comedy Show";

      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "season_pass_redeemed",
          title: "Season Pass Redeemed",
          message: `Show ${redemption.showNumber}/${pass.totalShows} used for "${eventTitle}". ${newRemainingShows} remaining.`,
          eventId,
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      passId: pass.id,
      eventId,
      redeemedAt: redemption.redeemedAt,
      showNumber: redemption.showNumber,
      remainingShows: newRemainingShows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    logger.error("Season pass operation failed", { id, action }, err instanceof Error ? err : undefined);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
