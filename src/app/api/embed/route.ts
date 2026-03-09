import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Embeddable widget data endpoint.
 * Returns JSON for embedding comedian/venue cards on external sites.
 *
 * GET /api/embed?type=comedian&slug=dave-chappelle
 * GET /api/embed?type=venue&id=abc123
 * GET /api/embed?type=event&id=abc123
 *
 * Also supports ?format=html for a self-contained HTML embed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const slug = searchParams.get("slug");
  const id = searchParams.get("id");
  const format = searchParams.get("format") || "json";

  if (!type || (!slug && !id)) {
    return NextResponse.json({ error: "type and slug/id required" }, { status: 400 });
  }

  try {
    let data: Record<string, unknown> | null = null;

    if (type === "comedian" && slug) {
      const comedian = await prisma.comedian.findUnique({
        where: { slug },
        select: {
          name: true,
          slug: true,
          headshotUrl: true,
          bio: true,
          touringStatus: true,
          genres: { select: { genre: true } },
          _count: { select: { followers: true, events: true } },
        },
      });
      if (comedian) {
        data = {
          type: "comedian",
          name: comedian.name,
          slug: comedian.slug,
          headshotUrl: comedian.headshotUrl,
          bio: comedian.bio?.slice(0, 200),
          touringStatus: comedian.touringStatus,
          genres: comedian.genres.map((g) => g.genre),
          followers: comedian._count.followers,
          events: comedian._count.events,
          profileUrl: `/comedians/${comedian.slug}`,
        };
      }
    }

    if (type === "venue" && id) {
      const venue = await prisma.venue.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          type: true,
          capacity: true,
          website: true,
          _count: { select: { followers: true, events: true } },
        },
      });
      if (venue) {
        data = {
          type: "venue",
          id: venue.id,
          name: venue.name,
          location: `${venue.city}, ${venue.state}`,
          venueType: venue.type,
          capacity: venue.capacity,
          website: venue.website,
          followers: venue._count.followers,
          upcomingEvents: venue._count.events,
          profileUrl: `/venues/${venue.id}`,
        };
      }
    }

    if (type === "event" && id) {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          venue: { select: { name: true, city: true, state: true } },
          comedians: { include: { comedian: { select: { name: true, slug: true } } } },
          _count: { select: { attendees: true } },
        },
      });
      if (event) {
        data = {
          type: "event",
          id: event.id,
          title: event.title,
          date: event.date.toISOString(),
          showtime: event.showtime,
          venue: event.venue,
          comedians: event.comedians.map((ec) => ({
            name: ec.comedian.name,
            slug: ec.comedian.slug,
            role: ec.role,
          })),
          attendees: event._count.attendees,
          ticketUrl: event.ticketUrl,
          eventUrl: `/events/${event.id}`,
        };
      }
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // HTML embed format
    if (format === "html") {
      const origin = new URL(request.url).origin;
      const html = generateEmbedHtml(data, origin);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return NextResponse.json({ embed: data }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load embed data" }, { status: 500 });
  }
}

function generateEmbedHtml(data: Record<string, unknown>, origin: string): string {
  const profileUrl = `${origin}${data.profileUrl}`;
  const name = data.name as string;

  if (data.type === "comedian") {
    const genres = (data.genres as string[]).slice(0, 3).join(", ");
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;color:#fff}
.card{display:flex;align-items:center;gap:16px;padding:16px;border-radius:12px;background:#1a1a1a;border:1px solid #333;max-width:400px;text-decoration:none;color:inherit}
.card:hover{border-color:#d4a843}
.avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;background:#333}
.name{font-size:16px;font-weight:600;color:#d4a843}
.meta{font-size:12px;color:#888;margin-top:4px}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;background:#d4a84320;color:#d4a843;font-size:10px;margin-top:6px}
.powered{text-align:right;font-size:9px;color:#555;margin-top:8px}
</style></head><body>
<a href="${profileUrl}" target="_blank" rel="noopener" class="card">
${data.headshotUrl ? `<img src="${data.headshotUrl}" alt="${name}" class="avatar"/>` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#666">${name[0]}</div>`}
<div>
<div class="name">${name}</div>
<div class="meta">${data.followers} followers · ${data.events} shows${genres ? ` · ${genres}` : ""}</div>
<span class="badge">${(data.touringStatus as string).replace("_", " ")}</span>
</div>
</a>
<div class="powered">Powered by Punchline Atlas</div>
</body></html>`;
  }

  if (data.type === "venue") {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;color:#fff}
.card{display:block;padding:16px;border-radius:12px;background:#1a1a1a;border:1px solid #333;max-width:400px;text-decoration:none;color:inherit}
.card:hover{border-color:#d4a843}
.name{font-size:16px;font-weight:600;color:#d4a843}
.loc{font-size:13px;color:#999;margin-top:4px}
.stats{display:flex;gap:12px;margin-top:8px;font-size:12px;color:#666}
.powered{text-align:right;font-size:9px;color:#555;margin-top:8px}
</style></head><body>
<a href="${profileUrl}" target="_blank" rel="noopener" class="card">
<div class="name">${name}</div>
<div class="loc">${data.location}${data.capacity ? ` · ${data.capacity} capacity` : ""}</div>
<div class="stats"><span>${data.followers} followers</span><span>${data.upcomingEvents} events</span></div>
</a>
<div class="powered">Powered by Punchline Atlas</div>
</body></html>`;
  }

  // Event embed
  const comedians = (data.comedians as Array<{ name: string }>).map((c) => c.name).join(", ");
  const venue = data.venue as { name: string; city: string; state: string };
  const date = new Date(data.date as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;color:#fff}
.card{display:block;padding:16px;border-radius:12px;background:#1a1a1a;border:1px solid #333;max-width:400px;text-decoration:none;color:inherit}
.card:hover{border-color:#d4a843}
.title{font-size:16px;font-weight:600;color:#d4a843}
.info{font-size:13px;color:#999;margin-top:4px}
.date{font-size:12px;color:#d4a843;margin-top:8px;font-weight:500}
.btn{display:inline-block;margin-top:10px;padding:6px 16px;border-radius:8px;background:#d4a843;color:#0d0d0d;font-size:12px;font-weight:600;text-decoration:none}
.powered{text-align:right;font-size:9px;color:#555;margin-top:8px}
</style></head><body>
<a href="${profileUrl}" target="_blank" rel="noopener" class="card">
<div class="title">${data.title || comedians}</div>
<div class="info">${venue.name} · ${venue.city}, ${venue.state}</div>
<div class="date">${date}${data.showtime ? ` at ${data.showtime}` : ""}</div>
${data.ticketUrl ? `<span class="btn">Get Tickets</span>` : ""}
</a>
<div class="powered">Powered by Punchline Atlas</div>
</body></html>`;
}
