import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Track ticket clicks for affiliate revenue.
 * Called when a user clicks "Get tickets" on an event page.
 * Appends affiliate tags to ticket URLs when matching partners exist.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { eventId, ticketUrl, referrer } = body;

  if (!eventId || !ticketUrl) {
    return NextResponse.json({ error: "eventId and ticketUrl required" }, { status: 400 });
  }

  // Track the click
  await prisma.ticketClick.create({
    data: {
      eventId,
      userId: session?.user?.id || null,
      referrer: referrer || null,
      ticketUrl,
    },
  });

  // Check for affiliate partner match and append tag
  let finalUrl = ticketUrl;
  try {
    const partners = await prisma.affiliatePartner.findMany({ where: { isActive: true } });
    for (const partner of partners) {
      if (ticketUrl.includes(partner.baseUrl)) {
        const url = new URL(ticketUrl);
        url.searchParams.set("ref", partner.affiliateTag);
        finalUrl = url.toString();
        break;
      }
    }
  } catch {
    // If no partners configured, just use original URL
  }

  return NextResponse.json({ url: finalUrl });
}

/**
 * GET - Get ticket click stats for an event (for dashboards)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const [total, last30d] = await Promise.all([
    prisma.ticketClick.count({ where: { eventId } }),
    prisma.ticketClick.count({
      where: {
        eventId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return NextResponse.json({ eventId, totalClicks: total, last30dClicks: last30d });
}
