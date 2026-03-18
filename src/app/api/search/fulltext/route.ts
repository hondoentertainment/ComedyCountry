import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/search/fulltext?q=...&limit=10
 *
 * PostgreSQL full-text search using tsvector/tsquery.
 * Falls back to ILIKE if tsvector columns aren't available.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(getRateLimitKey(request), { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ venues: [], comedians: [], events: [] });
  }

  try {
    // Build tsquery from search terms
    const tsquery = q
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(" & ");

    // Try full-text search with ts_rank
    const [comedians, venues, events] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ id: string; name: string; slug: string; headshot_url: string | null; rank: number }>>(
        `SELECT id, name, slug, "headshotUrl" as headshot_url,
                ts_rank(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(bio,'')), to_tsquery('english', $1)) as rank
         FROM "Comedian"
         WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(bio,'')) @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        tsquery,
        limit,
      ).catch(() =>
        // Fallback to ILIKE
        prisma.comedian.findMany({
          where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { bio: { contains: q, mode: "insensitive" } }] },
          take: limit,
          select: { id: true, name: true, slug: true, headshotUrl: true },
        }).then((r) => r.map((c) => ({ id: c.id, name: c.name, slug: c.slug, headshot_url: c.headshotUrl, rank: 1 }))),
      ),
      prisma.$queryRawUnsafe<Array<{ id: string; name: string; city: string; state: string; type: string; rank: number }>>(
        `SELECT id, name, city, state, type::text,
                ts_rank(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'')), to_tsquery('english', $1)) as rank
         FROM "Venue"
         WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'')) @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        tsquery,
        limit,
      ).catch(() =>
        prisma.venue.findMany({
          where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] },
          take: limit,
          select: { id: true, name: true, city: true, state: true, type: true },
        }).then((r) => r.map((v) => ({ ...v, type: v.type as string, rank: 1 }))),
      ),
      prisma.$queryRawUnsafe<Array<{ id: string; title: string | null; date: Date; venue_name: string; venue_city: string; venue_state: string; rank: number }>>(
        `SELECT e.id, e.title, e.date,
                v.name as venue_name, v.city as venue_city, v.state as venue_state,
                ts_rank(to_tsvector('english', coalesce(e.title,'') || ' ' || coalesce(v.name,'') || ' ' || coalesce(v.city,'')), to_tsquery('english', $1)) as rank
         FROM "Event" e
         JOIN "Venue" v ON v.id = e."venueId"
         WHERE e.date >= NOW()
           AND to_tsvector('english', coalesce(e.title,'') || ' ' || coalesce(v.name,'') || ' ' || coalesce(v.city,'')) @@ to_tsquery('english', $1)
         ORDER BY rank DESC, e.date ASC
         LIMIT $2`,
        tsquery,
        limit,
      ).catch(() => [] as Array<{ id: string; title: string | null; date: Date; venue_name: string; venue_city: string; venue_state: string; rank: number }>),
    ]);

    return NextResponse.json({
      comedians: comedians.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        headshotUrl: c.headshot_url,
        rank: Number(c.rank),
      })),
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        state: v.state,
        type: v.type,
        rank: Number(v.rank),
      })),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        venue: { name: e.venue_name, city: e.venue_city, state: e.venue_state },
        rank: Number(e.rank),
      })),
    });
  } catch {
    return NextResponse.json({ venues: [], comedians: [], events: [] });
  }
}
