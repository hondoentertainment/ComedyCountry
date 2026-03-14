import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Embeddable Checkout API — processes ticket purchases from the white-label widget.
 * Designed to be called from external venue websites via the EmbeddableCheckout component.
 *
 * Supports CORS for cross-origin embedding.
 */

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? undefined;
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? undefined;
  const headers = corsHeaders(origin);

  // Rate limit
  const rl = checkRateLimit(getRateLimitKey(request), { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers }
    );
  }

  try {
    const body = await request.json();
    const { eventId, items, customerEmail, customerName, total } = body;

    if (!eventId || !items || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: "eventId, items, customerEmail, and customerName are required" },
        { status: 400, headers }
      );
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404, headers }
      );
    }

    // Validate ticket availability
    for (const item of items) {
      const ticketType = event.ticketTypes.find(
        (tt) => tt.id === item.ticketTypeId
      );
      if (!ticketType) {
        return NextResponse.json(
          { error: `Ticket type ${item.ticketTypeId} not found` },
          { status: 400, headers }
        );
      }
      const available = ticketType.capacity - ticketType.sold;
      if (item.quantity > available) {
        return NextResponse.json(
          {
            error: `Only ${available} tickets available for ${ticketType.name}`,
          },
          { status: 400, headers }
        );
      }
    }

    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: customerEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
        },
      });
    }

    // Create tickets and update sold counts
    const createdTickets = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const qrCode = `EMB-${eventId.slice(0, 6)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ticket = await prisma.ticket.create({
          data: {
            eventId,
            userId: user.id,
            ticketTypeId: item.ticketTypeId,
            qrCode,
            purchasePrice: item.unitPrice,
            status: "VALID",
          },
        });
        createdTickets.push(ticket);
      }

      // Update sold count
      await prisma.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { sold: { increment: item.quantity } },
      });
    }

    return NextResponse.json(
      {
        orderId: createdTickets[0]?.id ?? "confirmed",
        ticketCount: createdTickets.length,
        total,
        customerEmail,
        eventId,
      },
      { status: 201, headers }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}
