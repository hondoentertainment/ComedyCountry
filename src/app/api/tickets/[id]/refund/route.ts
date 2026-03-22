import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { Decimal } from "@prisma/client/runtime/library";
import type { RefundResult, RefundEligibility } from "@/types/tickets";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Phase 3: Refund Flow API
 *
 * POST /api/tickets/[id]/refund — Request a refund (full or partial)
 * GET  /api/tickets/[id]/refund — Check refund eligibility
 *
 * Features:
 * - Full and partial refund support
 * - Refund policy enforcement (time-based, event-status-based)
 * - Stripe refund integration
 * - Refund status tracking
 * - Email notification on refund
 * - Waitlist redistribution on refund
 */

// ── GET: Check refund eligibility ──────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`tickets-refund:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const eligibility = await checkRefundEligibility(id, session.user.id);
    return NextResponse.json(eligibility);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check refund eligibility";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ── POST: Request a refund ────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`tickets-refund:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    type?: "full" | "partial";
    amount?: number;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const refundType = body.type || "full";
  const reason = body.reason || null;

  try {
    const result = await processRefund(id, session.user.id, {
      type: refundType,
      partialAmount: body.amount,
      reason,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    const status = [
      "Ticket not found",
      "Not your ticket",
      "Ticket cannot be refunded",
      "Refund deadline has passed",
      "Event has already occurred",
      "No refund policy for this event",
    ].includes(message)
      ? 400
      : 500;

    logger.error("Refund request failed", { ticketId: id, error: message });
    return NextResponse.json({ error: message }, { status });
  }
}

// =============================================================================
// Business Logic
// =============================================================================

async function checkRefundEligibility(
  ticketId: string,
  userId: string
): Promise<RefundEligibility> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: { refundPolicy: true },
      },
      ticketType: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new Error("Not your ticket");
  }

  const now = new Date();
  const eventDate = ticket.event.date;

  // Determine event status
  let eventStatus: "upcoming" | "today" | "past" | "cancelled";
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (eventDay.getTime() === today.getTime()) {
    eventStatus = "today";
  } else if (eventDate < now) {
    eventStatus = "past";
  } else {
    eventStatus = "upcoming";
  }

  // Not refundable statuses
  if (ticket.status !== "VALID") {
    return {
      eligible: false,
      maxRefundPercent: 0,
      maxRefundAmount: 0,
      reason: `Ticket status is ${ticket.status} and cannot be refunded`,
      deadlineDate: null,
      daysUntilDeadline: null,
      eventStatus,
    };
  }

  // Past events
  if (eventStatus === "past") {
    return {
      eligible: false,
      maxRefundPercent: 0,
      maxRefundAmount: 0,
      reason: "Event has already occurred",
      deadlineDate: null,
      daysUntilDeadline: null,
      eventStatus,
    };
  }

  // No refund policy
  const policy = ticket.event.refundPolicy;
  if (!policy) {
    return {
      eligible: false,
      maxRefundPercent: 0,
      maxRefundAmount: 0,
      reason: "No refund policy exists for this event",
      deadlineDate: null,
      daysUntilDeadline: null,
      eventStatus,
    };
  }

  // Check deadline
  const withinDeadline = now <= policy.refundDeadline;
  const daysUntilDeadline = Math.max(
    0,
    Math.ceil((policy.refundDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (!withinDeadline) {
    return {
      eligible: false,
      maxRefundPercent: 0,
      maxRefundAmount: 0,
      reason: "Refund deadline has passed",
      deadlineDate: policy.refundDeadline,
      daysUntilDeadline: 0,
      eventStatus,
    };
  }

  // Calculate refund amount based on policy percentage
  const originalAmount = Number(ticket.purchasePrice);
  const maxRefundPercent = policy.refundPercent;
  const maxRefundAmount = Math.round(originalAmount * (maxRefundPercent / 100) * 100) / 100;

  // Day-of-event gets reduced refund
  let adjustedPercent = maxRefundPercent;
  if (eventStatus === "today") {
    adjustedPercent = Math.min(maxRefundPercent, 50); // Max 50% on day of event
  }

  const adjustedAmount = Math.round(originalAmount * (adjustedPercent / 100) * 100) / 100;

  return {
    eligible: true,
    maxRefundPercent: adjustedPercent,
    maxRefundAmount: adjustedAmount,
    reason: eventStatus === "today"
      ? `Eligible for up to ${adjustedPercent}% refund (day-of-event reduced rate)`
      : `Eligible for up to ${adjustedPercent}% refund`,
    deadlineDate: policy.refundDeadline,
    daysUntilDeadline,
    eventStatus,
  };
}

async function processRefund(
  ticketId: string,
  userId: string,
  options: {
    type: "full" | "partial";
    partialAmount?: number;
    reason: string | null;
  }
): Promise<RefundResult> {
  // Check eligibility first
  const eligibility = await checkRefundEligibility(ticketId, userId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: {
          venue: true,
          refundPolicy: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const originalAmount = Number(ticket.purchasePrice);
  let refundAmount: number;
  let refundPercent: number;

  if (options.type === "partial" && options.partialAmount !== undefined) {
    // Validate partial amount
    if (options.partialAmount <= 0) {
      throw new Error("Partial refund amount must be positive");
    }
    if (options.partialAmount > eligibility.maxRefundAmount) {
      throw new Error(
        `Partial refund cannot exceed $${eligibility.maxRefundAmount.toFixed(2)} (${eligibility.maxRefundPercent}% of original price)`
      );
    }
    refundAmount = Math.round(options.partialAmount * 100) / 100;
    refundPercent = Math.round((refundAmount / originalAmount) * 100);
  } else {
    // Full refund (up to policy limit)
    refundAmount = eligibility.maxRefundAmount;
    refundPercent = eligibility.maxRefundPercent;
  }

  // Create refund record and update ticket in a transaction
  const refundRecord = await prisma.$transaction(async (tx: any) => {
    // Mark ticket as refunded
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: "REFUNDED" },
    });

    // Decrement sold count
    await tx.ticketType.update({
      where: { id: ticket.ticketTypeId },
      data: { sold: { decrement: 1 } },
    });

    // Create refund tracking record
    const refund = await tx.ticketRefund.create({
      data: {
        ticketId,
        userId,
        type: options.type,
        originalAmount: new Decimal(originalAmount.toFixed(2)),
        refundAmount: new Decimal(refundAmount.toFixed(2)),
        refundPercent,
        status: ticket.stripePaymentId ? "processing" : "completed",
        reason: options.reason,
        policySnapshot: ticket.event.refundPolicy
          ? {
              refundDeadline: ticket.event.refundPolicy.refundDeadline.toISOString(),
              refundPercent: ticket.event.refundPolicy.refundPercent,
              description: ticket.event.refundPolicy.description,
            }
          : null,
        processedAt: ticket.stripePaymentId ? null : new Date(),
      },
    });

    return refund;
  });

  // Initiate Stripe refund if ticket was paid via Stripe
  let stripeRefundId: string | null = null;
  if (ticket.stripePaymentId && process.env.STRIPE_SECRET_KEY) {
    try {
      stripeRefundId = await initiateStripeRefund(
        ticket.stripePaymentId,
        Math.round(refundAmount * 100) // Stripe uses cents
      );

      await prisma.ticketRefund.update({
        where: { id: refundRecord.id },
        data: {
          stripeRefundId,
          status: "completed",
          processedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error(
        "Stripe refund initiation failed",
        { ticketId, paymentId: ticket.stripePaymentId },
        err instanceof Error ? err : undefined
      );

      await prisma.ticketRefund.update({
        where: { id: refundRecord.id },
        data: {
          status: "failed",
          reason: `Stripe refund failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      });
    }
  }

  // Send refund notification email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user?.email) {
    const eventTitle =
      ticket.event.title ||
      ticket.event.comedians.map((c: { comedian: { name: string } }) => c.comedian.name).join(", ") ||
      "Comedy Show";

    await sendEmail({
      to: user.email,
      subject: "Refund Processed - Punchline Atlas",
      html: refundEmailHtml(
        user.name || "Comedy Fan",
        eventTitle,
        ticket.event.venue.name,
        originalAmount,
        refundAmount,
        options.type
      ),
    });
  }

  // Create notification
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "refund_processed",
        title: "Refund Processed",
        message: `Your ${options.type} refund of $${refundAmount.toFixed(2)} has been processed.`,
        eventId: ticket.eventId,
      },
    });
  } catch {
    // Non-critical
  }

  // Redistribute to waitlist
  try {
    const { redistributeToWaitlist } = await import("@/lib/fair-ticketing");
    await redistributeToWaitlist(ticket.eventId, 1);
  } catch {
    // Waitlist redistribution is non-critical
  }

  return {
    refundId: refundRecord.id,
    ticketId,
    status: stripeRefundId ? "completed" : (ticket.stripePaymentId ? "processing" : "completed"),
    type: options.type,
    originalAmount,
    refundAmount,
    refundPercent,
    stripeRefundId,
    reason: options.reason,
    policyApplied: {
      refundDeadline: ticket.event.refundPolicy!.refundDeadline,
      maxRefundPercent: ticket.event.refundPolicy!.refundPercent,
      withinDeadline: true,
      eventStatus: eligibility.eventStatus,
    },
    createdAt: refundRecord.createdAt,
  };
}

// =============================================================================
// Stripe Refund Helper
// =============================================================================

async function initiateStripeRefund(
  paymentIntentId: string,
  amountInCents: number
): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      payment_intent: paymentIntentId,
      amount: String(amountInCents),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe refund error: ${err.error?.message || res.statusText}`);
  }

  const refund = await res.json();
  return refund.id;
}

// =============================================================================
// Email Template
// =============================================================================

function refundEmailHtml(
  userName: string,
  eventTitle: string,
  venueName: string,
  originalAmount: number,
  refundAmount: number,
  refundType: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#111;color:#eee;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="color:#d4a843;font-size:22px;margin-bottom:4px">Punchline Atlas</h1>
    <p style="color:#ccc">Hey ${userName},</p>
    <p style="color:#ccc">Your ${refundType} refund has been processed.</p>
    <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Event:</strong> ${eventTitle} at ${venueName}</p>
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Original Amount:</strong> $${originalAmount.toFixed(2)}</p>
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Type:</strong> ${refundType === "full" ? "Full Refund" : "Partial Refund"}</p>
    </div>
    <p style="color:#ccc">The refund should appear on your statement within 5-10 business days.</p>
    <p style="color:#666;font-size:12px;margin-top:24px">If you have questions, contact support at support@punchlineatlas.com.</p>
  </div>
</body>
</html>`;
}
