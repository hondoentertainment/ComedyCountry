import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Decimal } from "@prisma/client/runtime/library";
import crypto from "crypto";
import type { OrderConfirmation } from "@/types/tickets";

/**
 * Phase 3: Checkout Flow — Multi-Ticket Cart Checkout
 *
 * POST /api/checkout/session — Create a checkout session with cart, promo, tax
 *
 * Features:
 * - Cart management (multiple ticket types/quantities)
 * - Promo code / discount validation & application
 * - Tax calculation (configurable per jurisdiction)
 * - Anti-scalping purchase limit enforcement
 * - Stripe Checkout Session creation
 * - Order confirmation with ticket details
 */

// Fee rates
const SERVICE_FEE_RATE = 0.10; // 10%
const PROCESSING_FEE_RATE = 0.029; // 2.9%
const PROCESSING_FEE_FLAT = 0.30; // $0.30
const DEFAULT_TAX_RATE = 0.0; // 0% default, configurable per state

// State tax rates for entertainment/amusement
const STATE_TAX_RATES: Record<string, number> = {
  NY: 0.08875,
  CA: 0.0725,
  TX: 0.0625,
  IL: 0.0925,
  FL: 0.06,
  PA: 0.06,
  OH: 0.0575,
  GA: 0.04,
  NC: 0.0475,
  NJ: 0.06625,
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    eventId?: string;
    items?: Array<{ ticketTypeId: string; quantity: number }>;
    promoCode?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, items, promoCode, successUrl, cancelUrl } = body;

  if (!eventId || !items || items.length === 0) {
    return NextResponse.json(
      { error: "eventId and items are required" },
      { status: 400 }
    );
  }

  try {
    // Validate event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        ticketTypes: true,
        comedians: { include: { comedian: true } },
        fairPricePolicy: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check event hasn't passed
    if (event.date < new Date()) {
      return NextResponse.json(
        { error: "This event has already occurred" },
        { status: 400 }
      );
    }

    // Build cart and validate availability
    type TicketTypeRecord = (typeof event.ticketTypes)[number];
    const ticketTypeMap = new Map<string, TicketTypeRecord>(
      event.ticketTypes.map((tt: TicketTypeRecord) => [tt.id, tt])
    );

    let subtotal = 0;
    const validatedItems: Array<{
      ticketTypeId: string;
      ticketTypeName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    let totalQuantity = 0;

    for (const item of items) {
      if (!item.ticketTypeId || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: "Each item must have ticketTypeId and quantity >= 1" },
          { status: 400 }
        );
      }

      const ticketType = ticketTypeMap.get(item.ticketTypeId);
      if (!ticketType) {
        return NextResponse.json(
          { error: `Ticket type ${item.ticketTypeId} not found for this event` },
          { status: 400 }
        );
      }

      // Check sale window
      const now = new Date();
      if (ticketType.saleStart && ticketType.saleStart > now) {
        return NextResponse.json(
          { error: `${ticketType.name} tickets are not on sale yet` },
          { status: 400 }
        );
      }
      if (ticketType.saleEnd && ticketType.saleEnd < now) {
        return NextResponse.json(
          { error: `${ticketType.name} ticket sales have ended` },
          { status: 400 }
        );
      }

      // Check availability
      const available = ticketType.capacity - ticketType.sold;
      if (item.quantity > available) {
        return NextResponse.json(
          {
            error: `Only ${available} ${ticketType.name} tickets available`,
          },
          { status: 400 }
        );
      }

      const unitPrice = Number(ticketType.price);
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

      validatedItems.push({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: ticketType.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });

      subtotal += totalPrice;
      totalQuantity += item.quantity;
    }

    // Anti-scalping: enforce purchase limits
    if (event.fairPricePolicy?.antiScalpingEnabled) {
      const { enforcePurchaseLimits } = await import("@/lib/fair-ticketing");
      const limitCheck = await enforcePurchaseLimits(
        session.user.id,
        eventId,
        totalQuantity
      );

      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.reason },
          { status: 400 }
        );
      }
    }

    // Apply promo code discount
    let discount = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode) {
      const promoResult = await validateAndApplyPromoCode(
        promoCode,
        eventId,
        subtotal
      );

      if (!promoResult.valid) {
        return NextResponse.json(
          { error: promoResult.error || "Invalid promo code" },
          { status: 400 }
        );
      }

      discount = promoResult.discountAmount;
      appliedPromoCode = promoCode;
    }

    // Calculate fees
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceFee = Math.round(discountedSubtotal * SERVICE_FEE_RATE * 100) / 100;
    const processingFee =
      Math.round(
        (discountedSubtotal * PROCESSING_FEE_RATE + PROCESSING_FEE_FLAT) * 100
      ) / 100;

    // Calculate tax
    const taxRate = STATE_TAX_RATES[event.venue.state] ?? DEFAULT_TAX_RATE;
    const taxAmount = Math.round(discountedSubtotal * taxRate * 100) / 100;

    const total =
      Math.round(
        (discountedSubtotal + serviceFee + processingFee + taxAmount) * 100
      ) / 100;

    // Create tickets and order in a transaction
    const { order, tickets } = await prisma.$transaction(async (tx: any) => {
      const createdTickets: Array<{
        id: string;
        qrCode: string;
        ticketTypeName: string;
        purchasePrice: number;
      }> = [];

      for (const item of validatedItems) {
        // Re-check availability inside transaction
        const freshType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
        });

        if (!freshType || freshType.sold + item.quantity > freshType.capacity) {
          throw new Error(`${item.ticketTypeName} is no longer available`);
        }

        // Create individual tickets
        for (let i = 0; i < item.quantity; i++) {
          const qrCode = crypto.randomUUID();
          const ticket = await tx.ticket.create({
            data: {
              eventId,
              userId: session.user.id,
              ticketTypeId: item.ticketTypeId,
              qrCode,
              purchasePrice: new Decimal(item.unitPrice.toFixed(2)),
              status: "VALID",
            },
          });

          createdTickets.push({
            id: ticket.id,
            qrCode,
            ticketTypeName: item.ticketTypeName,
            purchasePrice: item.unitPrice,
          });
        }

        // Update sold count
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { sold: { increment: item.quantity } },
        });
      }

      // Create order record
      const orderRecord = await tx.ticketOrder.create({
        data: {
          userId: session.user.id,
          eventId,
          subtotal: new Decimal(subtotal.toFixed(2)),
          serviceFee: new Decimal(serviceFee.toFixed(2)),
          processingFee: new Decimal(processingFee.toFixed(2)),
          tax: new Decimal(taxAmount.toFixed(2)),
          discount: new Decimal(discount.toFixed(2)),
          total: new Decimal(total.toFixed(2)),
          promoCode: appliedPromoCode,
          customerEmail: session.user.email!,
          customerName: session.user.name || null,
          ticketIds: createdTickets.map((t) => t.id),
          status: "pending",
        },
      });

      return { order: orderRecord, tickets: createdTickets };
    });

    // Increment promo code usage if applicable
    if (appliedPromoCode) {
      try {
        await prisma.promoCode.update({
          where: { code: appliedPromoCode },
          data: { currentUses: { increment: 1 } },
        });
      } catch {
        // Non-critical
      }
    }

    // If Stripe is configured, create a Stripe Checkout Session
    if (process.env.STRIPE_SECRET_KEY && total > 0) {
      try {
        const origin = new URL(request.url).origin;
        const resolvedSuccessUrl =
          successUrl || `${origin}/tickets?checkout=success&orderId=${order.id}`;
        const resolvedCancelUrl =
          cancelUrl || `${origin}/events/${eventId}?checkout=cancelled`;

        const stripeSession = await createStripeTicketCheckout({
          orderId: order.id,
          userId: session.user.id,
          email: session.user.email!,
          items: validatedItems,
          total,
          successUrl: resolvedSuccessUrl,
          cancelUrl: resolvedCancelUrl,
        });

        // Link the Stripe session to the order
        await prisma.ticketOrder.update({
          where: { id: order.id },
          data: { stripeSessionId: stripeSession.id },
        });

        return NextResponse.json({
          sessionId: stripeSession.id,
          url: stripeSession.url,
          orderId: order.id,
        });
      } catch (err) {
        logger.error("Stripe checkout creation failed", {}, err instanceof Error ? err : undefined);
        // Fall through to non-Stripe response
      }
    }

    // Non-Stripe flow — mark order as completed directly
    await prisma.ticketOrder.update({
      where: { id: order.id },
      data: { status: "completed" },
    });

    const eventTitle =
      event.title ||
      event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") ||
      "Comedy Show";

    const confirmation: OrderConfirmation = {
      orderId: order.id,
      tickets: tickets.map((t: { id: string; qrCode: string; ticketTypeName: string; purchasePrice: number }) => ({
        id: t.id,
        qrCode: t.qrCode,
        ticketTypeName: t.ticketTypeName,
        eventTitle,
        venueName: event.venue.name,
        eventDate: event.date,
        showtime: event.showtime,
        purchasePrice: t.purchasePrice,
      })),
      subtotal,
      serviceFee,
      processingFee,
      tax: taxAmount,
      discount,
      total,
      promoCode: appliedPromoCode,
      customerEmail: session.user.email!,
      stripePaymentId: null,
      createdAt: order.createdAt,
    };

    return NextResponse.json(confirmation, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    logger.error("Checkout error", { eventId }, err instanceof Error ? err : undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// =============================================================================
// Promo Code Validation
// =============================================================================

async function validateAndApplyPromoCode(
  code: string,
  eventId: string,
  subtotal: number
): Promise<{
  valid: boolean;
  discountAmount: number;
  error?: string;
}> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    return { valid: false, discountAmount: 0, error: "Promo code not found" };
  }

  if (!promo.isActive) {
    return { valid: false, discountAmount: 0, error: "Promo code is no longer active" };
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, discountAmount: 0, error: "Promo code has expired" };
  }

  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return { valid: false, discountAmount: 0, error: "Promo code usage limit reached" };
  }

  if (promo.minPurchase && subtotal < Number(promo.minPurchase)) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum purchase of $${Number(promo.minPurchase).toFixed(2)} required`,
    };
  }

  // Check event applicability
  if (promo.applicableEventIds.length > 0 && !promo.applicableEventIds.includes(eventId)) {
    return {
      valid: false,
      discountAmount: 0,
      error: "Promo code is not valid for this event",
    };
  }

  // Calculate discount
  let discountAmount: number;
  if (promo.discountType === "percentage") {
    discountAmount = Math.round(subtotal * (Number(promo.discountValue) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(Number(promo.discountValue), subtotal);
  }

  return {
    valid: true,
    discountAmount: Math.round(discountAmount * 100) / 100,
  };
}

// =============================================================================
// Stripe Checkout for Ticket Purchases
// =============================================================================

async function createStripeTicketCheckout(params: {
  orderId: string;
  userId: string;
  email: string;
  items: Array<{
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const lineItems = params.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.ticketTypeName,
      },
      unit_amount: Math.round(item.unitPrice * 100), // cents
    },
    quantity: item.quantity,
  }));

  const bodyObj: Record<string, unknown> = {
    mode: "payment",
    line_items: lineItems,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.email,
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId,
      orderId: params.orderId,
    },
  };

  const formBody = encodeFormData(bodyObj);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe error: ${err.error?.message || res.statusText}`);
  }

  const session = await res.json();
  return { id: session.id, url: session.url };
}

/** Encode nested object to x-www-form-urlencoded format for Stripe API */
function encodeFormData(obj: Record<string, unknown>, prefix = ""): URLSearchParams {
  const params = new URLSearchParams();

  function flatten(data: unknown, key: string) {
    if (Array.isArray(data)) {
      data.forEach((item, i) => flatten(item, `${key}[${i}]`));
    } else if (typeof data === "object" && data !== null) {
      Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
        flatten(v, key ? `${key}[${k}]` : k);
      });
    } else if (data !== undefined && data !== null) {
      params.append(key, String(data));
    }
  }

  flatten(obj, prefix);
  return params;
}
