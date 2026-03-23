import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-calendar:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      comedians: { include: { comedian: { select: { name: true } } } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const location = `${event.venue.name}, ${event.venue.address ?? ""} ${event.venue.city}, ${event.venue.state}`.trim();
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const description = `${title} at ${event.venue.name}\\n${event.showtime ? `Showtime: ${event.showtime}` : ""}\\n${siteUrl}/events/${id}`;

  const startDate = new Date(event.date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours

  const formatICalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Punchline Atlas//EN",
    "BEGIN:VEVENT",
    `UID:${id}@punchline-atlas`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    `URL:${siteUrl}/events/${id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, "-")}.ics"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
