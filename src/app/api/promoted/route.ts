import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET - Fetch active promoted listings for a given placement type.
 * Used by frontend components to display promoted content.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`promoted:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // VENUE_FEATURED, EVENT_FEATURED, etc.
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "3", 10), 10);

  const now = new Date();

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    startDate: { lte: now },
    endDate: { gte: now },
  };

  if (type) {
    where.type = type;
  }

  try {
    const promotions = await prisma.promotedListing.findMany({
      where,
      orderBy: { cpmRate: "desc" }, // Higher paying promotions get priority
      take: limit,
    });

    // Track impressions
    if (promotions.length > 0) {
      await prisma.promotedListing.updateMany({
        where: { id: { in: promotions.map((p) => p.id) } },
        data: { impressions: { increment: 1 } },
      });
    }

    // Resolve entity details
    const venueIds = promotions.filter((p) => p.venueId).map((p) => p.venueId!);
    const eventIds = promotions.filter((p) => p.eventId).map((p) => p.eventId!);
    const comedianIds = promotions.filter((p) => p.comedianId).map((p) => p.comedianId!);

    const [venues, events, comedians] = await Promise.all([
      venueIds.length > 0
        ? prisma.venue.findMany({
            where: { id: { in: venueIds } },
            select: { id: true, name: true, city: true, state: true, type: true },
          })
        : [],
      eventIds.length > 0
        ? prisma.event.findMany({
            where: { id: { in: eventIds } },
            include: {
              venue: { select: { name: true, city: true, state: true } },
              comedians: { include: { comedian: { select: { name: true, slug: true } } } },
            },
          })
        : [],
      comedianIds.length > 0
        ? prisma.comedian.findMany({
            where: { id: { in: comedianIds } },
            select: { id: true, name: true, slug: true, headshotUrl: true },
          })
        : [],
    ]);

    const venueMap = new Map(venues.map((v) => [v.id, v]));
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const comedianMap = new Map(comedians.map((c) => [c.id, c]));

    const result = promotions.map((p) => ({
      id: p.id,
      type: p.type,
      headline: p.headline,
      venue: p.venueId ? venueMap.get(p.venueId) : null,
      event: p.eventId ? eventMap.get(p.eventId) : null,
      comedian: p.comedianId ? comedianMap.get(p.comedianId) : null,
    }));

    return NextResponse.json({ promotions: result });
  } catch {
    return NextResponse.json({ promotions: [] });
  }
}
