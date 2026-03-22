import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Public discovery API for AI agents and search engines.
 * Returns structured data about comedians, venues, and events.
 *
 * Query params:
 * - type: "comedian" | "venue" | "event" | "all" (default: "all")
 * - q: search query (optional)
 * - city: filter by city (optional)
 * - state: filter by state (optional)
 * - limit: number of results (default: 20, max: 50)
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`discover:${getRateLimitKey(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";
  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const result: Record<string, unknown> = {
    _metadata: {
      api: "Punchline Atlas Discovery API",
      version: "1.0",
      description: "Comedy venue, comedian, and event discovery platform. The most comprehensive comedy intelligence database.",
      documentation: "Query comedians, venues, and upcoming comedy events across the United States.",
    },
  };

  try {
    if (type === "all" || type === "comedian") {
      const comedians = await prisma.comedian.findMany({
        where: q ? { name: { contains: q, mode: "insensitive" } } : {},
        select: {
          name: true,
          slug: true,
          bio: true,
          headshotUrl: true,
          touringStatus: true,
          website: true,
          genres: { select: { genre: true } },
          _count: { select: { followers: true, events: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: limit,
      });
      result.comedians = comedians.map((c) => ({
        name: c.name,
        slug: c.slug,
        bio: c.bio,
        headshotUrl: c.headshotUrl,
        touringStatus: c.touringStatus,
        website: c.website,
        genres: c.genres.map((g) => g.genre),
        followerCount: c._count.followers,
        eventCount: c._count.events,
        profileUrl: `/comedians/${c.slug}`,
      }));
    }

    if (type === "all" || type === "venue") {
      const venues = await prisma.venue.findMany({
        where: {
          ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
          ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
          ...(state ? { state: { equals: state, mode: "insensitive" as const } } : {}),
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          type: true,
          website: true,
          capacity: true,
          _count: { select: { followers: true, events: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: limit,
      });
      result.venues = venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        city: v.city,
        state: v.state,
        type: v.type,
        website: v.website,
        capacity: v.capacity,
        followerCount: v._count.followers,
        eventCount: v._count.events,
        profileUrl: `/venues/${v.id}`,
      }));
    }

    if (type === "all" || type === "event") {
      const events = await prisma.event.findMany({
        where: {
          date: { gte: new Date() },
          ...(city || state
            ? {
                venue: {
                  ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
                  ...(state ? { state: { equals: state, mode: "insensitive" as const } } : {}),
                },
              }
            : {}),
        },
        include: {
          venue: { select: { name: true, city: true, state: true, address: true } },
          comedians: { include: { comedian: { select: { name: true, slug: true } } } },
        },
        orderBy: { date: "asc" },
        take: limit,
      });
      result.events = events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        showtime: e.showtime,
        ticketUrl: e.ticketUrl,
        showType: e.showType,
        venue: e.venue,
        comedians: e.comedians.map((ec) => ({
          name: ec.comedian.name,
          slug: ec.comedian.slug,
          role: ec.role,
        })),
        eventUrl: `/events/${e.id}`,
      }));
    }
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable", ...result },
      { status: 503 }
    );
  }

  // Set cache headers for agents
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex",
    },
  });
}
