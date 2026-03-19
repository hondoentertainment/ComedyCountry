import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Phase 3: Season Pass System — Purchase & List
 *
 * GET  /api/season-passes — List user's season passes
 * POST /api/season-passes — Purchase a new season pass
 */

// ── GET: List user's season passes with venue details ──────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const venueId = url.searchParams.get("venueId");
  const includeExpired = url.searchParams.get("includeExpired") === "true";

  try {
    const now = new Date();

    const passes = await prisma.seasonPass.findMany({
      where: {
        userId: session.user.id,
        ...(venueId ? { venueId } : {}),
        ...(!includeExpired ? { expiresAt: { gte: now } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        redemptions: {
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    // Enrich with venue info
    const venueIds: string[] = [];
    for (const p of passes) {
      if (!venueIds.includes(p.venueId)) venueIds.push(p.venueId);
    }
    const venues = await prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true, name: true, city: true, state: true },
    });
    type VenueInfo = { id: string; name: string; city: string; state: string };
    const venueMap = new Map<string, VenueInfo>(venues.map((v: VenueInfo) => [v.id, v]));

    const enriched = passes.map((pass: typeof passes[number]) => {
      const venue = venueMap.get(pass.venueId);
      const isExpired = pass.expiresAt < now;
      const remainingShows = Math.max(0, pass.totalShows - pass.usedShows);

      return {
        ...pass,
        venue: venue || { id: pass.venueId, name: "Unknown", city: "", state: "" },
        isExpired,
        remainingShows,
        usagePercent: pass.totalShows > 0
          ? Math.round((pass.usedShows / pass.totalShows) * 100)
          : 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    logger.error("Failed to load season passes", {}, err instanceof Error ? err : undefined);
    return NextResponse.json(
      { error: "Failed to load season passes" },
      { status: 500 }
    );
  }
}

// ── POST: Purchase a season pass ──────────────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    venueId?: string;
    name?: string;
    totalShows?: number;
    price?: number;
    expiresAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { venueId, name, totalShows, price, expiresAt } = body;

  if (!venueId || !name || !totalShows || price == null) {
    return NextResponse.json(
      { error: "venueId, name, totalShows, and price are required" },
      { status: 400 }
    );
  }

  if (totalShows < 1 || totalShows > 100) {
    return NextResponse.json(
      { error: "totalShows must be between 1 and 100" },
      { status: 400 }
    );
  }

  if (price < 0) {
    return NextResponse.json(
      { error: "price must be non-negative" },
      { status: 400 }
    );
  }

  try {
    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, name: true, city: true, state: true },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Check if user already has an active season pass for this venue
    const existingPass = await prisma.seasonPass.findFirst({
      where: {
        userId: session.user.id,
        venueId,
        expiresAt: { gte: new Date() },
      },
    });

    // Filter further: check if the pass still has remaining shows
    const hasRemainingShows = existingPass
      ? existingPass.usedShows < existingPass.totalShows
      : false;

    if (existingPass && hasRemainingShows) {
      return NextResponse.json(
        {
          error: "You already have an active season pass for this venue",
          existingPassId: existingPass.id,
        },
        { status: 409 }
      );
    }

    // Parse expiration date or default to 1 year
    let expiration: Date;
    if (expiresAt) {
      expiration = new Date(expiresAt);
      if (isNaN(expiration.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date format" },
          { status: 400 }
        );
      }
    } else {
      expiration = new Date();
      expiration.setFullYear(expiration.getFullYear() + 1);
    }

    const pass = await prisma.seasonPass.create({
      data: {
        venueId,
        userId: session.user.id,
        name,
        totalShows,
        price,
        expiresAt: expiration,
      },
    });

    // Create notification
    try {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "season_pass_purchased",
          title: "Season Pass Activated!",
          message: `Your "${name}" season pass for ${venue.name} is now active with ${totalShows} shows.`,
          venueId,
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json(
      {
        ...pass,
        venue,
        remainingShows: totalShows,
        isExpired: false,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("Failed to purchase season pass", {}, err instanceof Error ? err : undefined);
    return NextResponse.json(
      { error: "Failed to purchase season pass" },
      { status: 500 }
    );
  }
}
