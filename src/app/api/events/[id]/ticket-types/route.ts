import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTicketTypesForEvent } from "@/lib/tickets";

// GET: List ticket types for an event
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const ticketTypes = await getTicketTypesForEvent(eventId);
    return NextResponse.json(ticketTypes);
  } catch {
    return NextResponse.json(
      { error: "Failed to load ticket types" },
      { status: 500 }
    );
  }
}

// POST: Create a ticket type (venue owner only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Verify user owns the venue for this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const claim = await prisma.venueClaim.findFirst({
      where: {
        venueId: event.venueId,
        userId: session.user.id,
        status: "APPROVED",
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Only venue owners can create ticket types" },
        { status: 403 }
      );
    }

    let body: {
      name?: string;
      price?: number;
      capacity?: number;
      description?: string;
      saleStart?: string;
      saleEnd?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { name, price, capacity, description, saleStart, saleEnd } = body;

    if (!name || price == null || !capacity) {
      return NextResponse.json(
        { error: "name, price, and capacity are required" },
        { status: 400 }
      );
    }

    // Get current max sort order
    const maxSort = await prisma.ticketType.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId,
        name,
        price,
        capacity,
        description: description || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        saleStart: saleStart ? new Date(saleStart) : null,
        saleEnd: saleEnd ? new Date(saleEnd) : null,
      },
    });

    return NextResponse.json(ticketType, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create ticket type" },
      { status: 500 }
    );
  }
}
