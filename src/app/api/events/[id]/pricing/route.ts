import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventPricingSummary, createPricingTier } from "@/lib/pricing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// GET: Public endpoint — returns pricing summary for the event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-pricing:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: eventId } = await params;

  try {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const summary = await getEventPricingSummary(eventId);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json(
      { error: "Failed to load pricing" },
      { status: 500 }
    );
  }
}

// POST: Create a pricing tier (requires auth + admin or venue owner)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-pricing:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check: admin or venue owner (approved claim)
    const isAdmin = session.user.role === "admin";
    let isVenueOwner = false;

    if (!isAdmin) {
      const claim = await prisma.venueClaim.findFirst({
        where: {
          venueId: event.venueId,
          userId: session.user.id,
          status: "APPROVED",
        },
      });
      isVenueOwner = !!claim;
    }

    if (!isAdmin && !isVenueOwner) {
      return NextResponse.json(
        { error: "Only admins or venue owners can create pricing tiers" },
        { status: 403 }
      );
    }

    let body: {
      ticketTypeId?: string;
      name?: string;
      price?: number;
      startsAt?: string;
      endsAt?: string;
      maxQuantity?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { ticketTypeId, name, price, startsAt, endsAt, maxQuantity } = body;

    if (!ticketTypeId || !name || price == null || !startsAt) {
      return NextResponse.json(
        { error: "ticketTypeId, name, price, and startsAt are required" },
        { status: 400 }
      );
    }

    // Verify ticket type belongs to this event
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });
    if (!ticketType || ticketType.eventId !== eventId) {
      return NextResponse.json(
        { error: "Ticket type not found for this event" },
        { status: 404 }
      );
    }

    const tier = await createPricingTier({
      ticketTypeId,
      name,
      price,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      maxQuantity: maxQuantity ?? null,
    });

    return NextResponse.json(tier, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create pricing tier" },
      { status: 500 }
    );
  }
}
