import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import type {
  StripeWebhookEventType,
  WebhookProcessingResult,
} from "@/types/tickets";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Phase 3: Hardened Stripe Webhook Handler
 *
 * Features:
 * - Signature verification via Web Crypto API
 * - Idempotent event processing (dedup by Stripe event ID)
 * - Comprehensive event handling for tickets & subscriptions
 * - Retry logic with exponential backoff tracking
 * - Structured logging for all events
 */

const MAX_RETRIES = 5;

export async function POST(request: Request) {
  const rl = await checkRateLimit(`stripe-webhook:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("Stripe webhook: missing signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // ── Verify signature ─────────────────────────────────────────────────
  const { valid, event } = await verifyWebhookSignature(rawBody, signature);
  if (!valid || !event) {
    logger.warn("Stripe webhook: invalid signature", { signature: signature.slice(0, 20) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const stripeEventId = event.id as string;
  const eventType = event.type as string;
  const data = (event.data as { object: Record<string, unknown> }).object;

  logger.info("Stripe webhook received", { stripeEventId, eventType });

  // ── Idempotency check ────────────────────────────────────────────────
  try {
    const existingEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId },
    });

    if (existingEvent?.processed) {
      logger.info("Stripe webhook: duplicate event, already processed", {
        stripeEventId,
        eventType,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (existingEvent && existingEvent.retryCount >= MAX_RETRIES) {
      logger.error("Stripe webhook: max retries exceeded", {
        stripeEventId,
        eventType,
        retryCount: existingEvent.retryCount,
      });
      return NextResponse.json({ received: true, maxRetries: true });
    }

    // Upsert the event record (create if first time, update retry count if retry)
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId },
      create: {
        stripeEventId,
        eventType,
        payload: event as unknown as Prisma.InputJsonValue,
        processed: false,
        retryCount: 0,
      },
      update: {
        retryCount: { increment: 1 },
        lastError: null,
      },
    });
  } catch (err) {
    logger.error(
      "Stripe webhook: idempotency check failed",
      { stripeEventId, eventType },
      err instanceof Error ? err : new Error(String(err))
    );
    // Continue processing even if idempotency check fails — better to
    // double-process than drop an event entirely.
  }

  // ── Process the event ────────────────────────────────────────────────
  let result: WebhookProcessingResult;

  try {
    switch (eventType) {
      case "checkout.session.completed":
        result = await handleCheckoutSessionCompleted(stripeEventId, data);
        break;
      case "payment_intent.succeeded":
        result = await handlePaymentIntentSucceeded(stripeEventId, data);
        break;
      case "payment_intent.payment_failed":
        result = await handlePaymentIntentFailed(stripeEventId, data);
        break;
      case "charge.refunded":
        result = await handleChargeRefunded(stripeEventId, data);
        break;
      case "customer.subscription.created":
        result = await handleSubscriptionCreated(stripeEventId, data);
        break;
      case "customer.subscription.updated":
        result = await handleSubscriptionUpdated(stripeEventId, data);
        break;
      case "customer.subscription.deleted":
        result = await handleSubscriptionDeleted(stripeEventId, data);
        break;
      case "invoice.paid":
        result = await handleInvoicePaid(stripeEventId, data);
        break;
      case "invoice.payment_failed":
        result = await handleInvoicePaymentFailed(stripeEventId, data);
        break;
      default:
        // Unhandled event type — acknowledge receipt
        logger.info("Stripe webhook: unhandled event type", { eventType });
        result = {
          success: true,
          eventId: stripeEventId,
          eventType,
        };
        break;
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      `Stripe webhook handler error for ${eventType}`,
      { stripeEventId, eventType },
      error
    );

    // Mark the event with the error for retry tracking
    try {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId },
        data: { lastError: error.message },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json(
      { error: "Webhook handler failed", retryable: true },
      { status: 500 }
    );
  }

  // ── Mark event as processed ──────────────────────────────────────────
  try {
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processed: true,
        processedAt: new Date(),
        lastError: result.success ? null : result.error || null,
      },
    });
  } catch (err) {
    logger.error(
      "Stripe webhook: failed to mark event as processed",
      { stripeEventId },
      err instanceof Error ? err : new Error(String(err))
    );
  }

  logger.info("Stripe webhook processed", {
    stripeEventId,
    eventType,
    success: result.success,
  });

  return NextResponse.json({ received: true, success: result.success });
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleCheckoutSessionCompleted(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const userId = (data.client_reference_id ||
    (data.metadata as Record<string, string>)?.userId) as string;
  const subscriptionId = data.subscription as string | null;
  const customerId = data.customer as string;
  const plan = ((data.metadata as Record<string, string>)?.plan || "") as string;
  const mode = data.mode as string;
  const paymentIntentId = data.payment_intent as string | null;
  const sessionId = data.id as string;

  if (!userId) {
    return { success: false, eventId, eventType: "checkout.session.completed", error: "No userId in session" };
  }

  // Handle subscription checkout
  if (mode === "subscription" && subscriptionId) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: plan as never,
        status: "ACTIVE",
        stripeSubId: subscriptionId,
        stripeCustId: customerId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        plan: plan as never,
        status: "ACTIVE",
        stripeSubId: subscriptionId,
        stripeCustId: customerId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await createNotificationSafe(userId, "subscription_activated", "Welcome to Pro!", `Your ${plan.replace(/_/g, " ")} subscription is now active.`);
  }

  // Handle ticket/order checkout (payment mode)
  if (mode === "payment" && sessionId) {
    // Find the corresponding order and mark as completed
    try {
      const order = await prisma.ticketOrder.findFirst({
        where: { stripeSessionId: sessionId },
      });

      if (order) {
        await prisma.ticketOrder.update({
          where: { id: order.id },
          data: {
            status: "completed",
            stripePaymentId: paymentIntentId,
          },
        });

        // Update all tickets with the payment ID
        if (order.ticketIds.length > 0) {
          await prisma.ticket.updateMany({
            where: { id: { in: order.ticketIds } },
            data: { stripePaymentId: paymentIntentId },
          });
        }

        // Send confirmation email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });

        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: "Your Punchline Atlas Tickets - Order Confirmed!",
            html: orderConfirmationEmailHtml(
              user.name || "Comedy Fan",
              order.id,
              Number(order.total),
              order.ticketIds.length
            ),
          });
        }

        await createNotificationSafe(
          userId,
          "order_confirmed",
          "Tickets Confirmed!",
          `Your order #${order.id.slice(0, 8)} has been confirmed. ${order.ticketIds.length} ticket(s) purchased.`
        );
      }
    } catch (err) {
      logger.error("Failed to process ticket order from checkout", { sessionId }, err instanceof Error ? err : undefined);
    }
  }

  return { success: true, eventId, eventType: "checkout.session.completed" };
}

async function handlePaymentIntentSucceeded(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const paymentIntentId = data.id as string;
  const metadata = data.metadata as Record<string, string> | undefined;
  const userId = metadata?.userId;

  logger.info("Payment intent succeeded", { paymentIntentId, userId });

  // Update any orders linked to this payment intent
  try {
    await prisma.ticketOrder.updateMany({
      where: { stripePaymentId: paymentIntentId, status: "pending" },
      data: { status: "completed" },
    });
  } catch {
    // Order might not exist yet if checkout.session.completed hasn't fired
  }

  return { success: true, eventId, eventType: "payment_intent.succeeded" };
}

async function handlePaymentIntentFailed(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const paymentIntentId = data.id as string;
  const metadata = data.metadata as Record<string, string> | undefined;
  const userId = metadata?.userId;
  const lastError = data.last_payment_error as Record<string, unknown> | undefined;
  const errorMessage = (lastError?.message as string) || "Payment failed";

  logger.warn("Payment intent failed", { paymentIntentId, userId, errorMessage });

  // Mark related orders as failed
  try {
    await prisma.ticketOrder.updateMany({
      where: { stripePaymentId: paymentIntentId, status: "pending" },
      data: { status: "failed" },
    });
  } catch {
    // Non-critical
  }

  // Notify user
  if (userId) {
    await createNotificationSafe(
      userId,
      "payment_failed",
      "Payment Failed",
      `Your payment could not be processed: ${errorMessage}. Please try again or use a different payment method.`
    );
  }

  return { success: true, eventId, eventType: "payment_intent.payment_failed" };
}

async function handleChargeRefunded(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const chargeId = data.id as string;
  const paymentIntentId = data.payment_intent as string;
  const amountRefunded = (data.amount_refunded as number) || 0;
  const refundStatus = data.refunded as boolean;

  logger.info("Charge refunded", { chargeId, paymentIntentId, amountRefunded, refundStatus });

  // Find tickets with this payment ID and update refund records
  try {
    const refunds = data.refunds as { data?: Array<{ id: string; amount: number; status: string }> } | undefined;
    const latestRefund = refunds?.data?.[0];

    if (latestRefund && paymentIntentId) {
      // Update any pending refund records for tickets with this payment
      await prisma.ticketRefund.updateMany({
        where: {
          stripeRefundId: null,
          status: "processing",
        },
        data: {
          stripeRefundId: latestRefund.id,
          status: latestRefund.status === "succeeded" ? "completed" : "failed",
          processedAt: new Date(),
        },
      });
    }

    // If fully refunded, mark all tickets as refunded
    if (refundStatus && paymentIntentId) {
      const tickets = await prisma.ticket.findMany({
        where: { stripePaymentId: paymentIntentId },
        select: { id: true, userId: true },
      });

      for (const ticket of tickets) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "REFUNDED" },
        });
      }

      // Notify the user
      if (tickets[0]?.userId) {
        await createNotificationSafe(
          tickets[0].userId,
          "refund_completed",
          "Refund Processed",
          `Your refund of $${(amountRefunded / 100).toFixed(2)} has been processed and will appear on your statement.`
        );
      }
    }
  } catch (err) {
    logger.error("Failed to process charge.refunded", { chargeId }, err instanceof Error ? err : undefined);
  }

  return { success: true, eventId, eventType: "charge.refunded" };
}

async function handleSubscriptionCreated(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const subscriptionId = data.id as string;
  const customerId = data.customer as string;
  const status = data.status as string;
  const metadata = data.metadata as Record<string, string> | undefined;
  const userId = metadata?.userId;
  const plan = metadata?.plan || "FAN_PRO";

  logger.info("Subscription created", { subscriptionId, customerId, status, userId });

  if (!userId) {
    // Try to find user by Stripe customer ID
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeCustId: customerId },
      select: { userId: true },
    });

    if (!existingSub) {
      return {
        success: false,
        eventId,
        eventType: "customer.subscription.created",
        error: "Cannot find user for subscription",
        retryable: true,
      };
    }

    await updateSubscriptionFromStripe(existingSub.userId, data);
  } else {
    await updateSubscriptionFromStripe(userId, data);
  }

  return { success: true, eventId, eventType: "customer.subscription.created" };
}

async function handleSubscriptionUpdated(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const subscriptionId = data.id as string;
  const cancelAtPeriodEnd = data.cancel_at_period_end as boolean;
  const currentPeriodEnd = data.current_period_end as number | undefined;
  const status = data.status as string;

  logger.info("Subscription updated", { subscriptionId, status, cancelAtPeriodEnd });

  const mapStatus: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    unpaid: "PAST_DUE",
  };

  const dbStatus = mapStatus[status] || "ACTIVE";

  try {
    const sub = await prisma.subscription.findFirst({
      where: { stripeSubId: subscriptionId },
    });

    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: dbStatus as never,
          cancelAtPeriodEnd: cancelAtPeriodEnd || false,
          ...(currentPeriodEnd
            ? { currentPeriodEnd: new Date(currentPeriodEnd * 1000) }
            : {}),
        },
      });

      if (cancelAtPeriodEnd) {
        await createNotificationSafe(
          sub.userId,
          "subscription_cancelling",
          "Subscription Update",
          "Your subscription will cancel at the end of the current billing period."
        );
      }
    }
  } catch (err) {
    logger.error("Failed to update subscription", { subscriptionId }, err instanceof Error ? err : undefined);
    return {
      success: false,
      eventId,
      eventType: "customer.subscription.updated",
      error: err instanceof Error ? err.message : "Unknown error",
      retryable: true,
    };
  }

  return { success: true, eventId, eventType: "customer.subscription.updated" };
}

async function handleSubscriptionDeleted(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const subscriptionId = data.id as string;

  logger.info("Subscription deleted", { subscriptionId });

  try {
    const sub = await prisma.subscription.findFirst({
      where: { stripeSubId: subscriptionId },
    });

    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "CANCELED",
          cancelAtPeriodEnd: false,
        },
      });

      await createNotificationSafe(
        sub.userId,
        "subscription_cancelled",
        "Subscription Cancelled",
        "Your subscription has been cancelled. You can resubscribe anytime."
      );
    }
  } catch (err) {
    logger.error("Failed to delete subscription", { subscriptionId }, err instanceof Error ? err : undefined);
  }

  return { success: true, eventId, eventType: "customer.subscription.deleted" };
}

async function handleInvoicePaid(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const subscriptionId = data.subscription as string;
  if (!subscriptionId) {
    return { success: true, eventId, eventType: "invoice.paid" };
  }

  const period = data.lines as {
    data?: Array<{ period?: { start: number; end: number } }>;
  };
  const periodData = period?.data?.[0]?.period;

  try {
    await prisma.subscription.updateMany({
      where: { stripeSubId: subscriptionId },
      data: {
        status: "ACTIVE",
        ...(periodData
          ? {
              currentPeriodStart: new Date(periodData.start * 1000),
              currentPeriodEnd: new Date(periodData.end * 1000),
            }
          : {}),
      },
    });
  } catch (err) {
    logger.error("Failed to process invoice.paid", { subscriptionId }, err instanceof Error ? err : undefined);
  }

  return { success: true, eventId, eventType: "invoice.paid" };
}

async function handleInvoicePaymentFailed(
  eventId: string,
  data: Record<string, unknown>
): Promise<WebhookProcessingResult> {
  const subscriptionId = data.subscription as string;
  if (!subscriptionId) {
    return { success: true, eventId, eventType: "invoice.payment_failed" };
  }

  try {
    await prisma.subscription.updateMany({
      where: { stripeSubId: subscriptionId },
      data: { status: "PAST_DUE" },
    });

    const sub = await prisma.subscription.findFirst({
      where: { stripeSubId: subscriptionId },
      select: { userId: true },
    });

    if (sub) {
      await createNotificationSafe(
        sub.userId,
        "payment_failed",
        "Payment Failed",
        "We couldn't process your subscription payment. Please update your payment method to avoid interruption."
      );

      // Send email notification
      const user = await prisma.user.findUnique({
        where: { id: sub.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Action Required: Payment Failed - Punchline Atlas",
          html: paymentFailedEmailHtml(user.name || "Valued Member"),
        });
      }
    }
  } catch (err) {
    logger.error("Failed to process invoice.payment_failed", { subscriptionId }, err instanceof Error ? err : undefined);
  }

  return { success: true, eventId, eventType: "invoice.payment_failed" };
}

// =============================================================================
// Helper Functions
// =============================================================================

async function updateSubscriptionFromStripe(
  userId: string,
  data: Record<string, unknown>
) {
  const subscriptionId = data.id as string;
  const customerId = data.customer as string;
  const metadata = data.metadata as Record<string, string> | undefined;
  const plan = metadata?.plan || "FAN_PRO";
  const status = data.status as string;
  const currentPeriodStart = data.current_period_start as number | undefined;
  const currentPeriodEnd = data.current_period_end as number | undefined;

  const mapStatus: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
  };

  const now = new Date();

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: plan as never,
      status: (mapStatus[status] || "ACTIVE") as never,
      stripeSubId: subscriptionId,
      stripeCustId: customerId,
      ...(currentPeriodStart
        ? { currentPeriodStart: new Date(currentPeriodStart * 1000) }
        : {}),
      ...(currentPeriodEnd
        ? { currentPeriodEnd: new Date(currentPeriodEnd * 1000) }
        : {}),
    },
    create: {
      userId,
      plan: plan as never,
      status: (mapStatus[status] || "ACTIVE") as never,
      stripeSubId: subscriptionId,
      stripeCustId: customerId,
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart * 1000)
        : now,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

async function createNotificationSafe(
  userId: string,
  type: string,
  title: string,
  message: string
) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message },
    });
  } catch {
    // Notification creation is non-critical
  }
}

// =============================================================================
// Email Templates
// =============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function orderConfirmationEmailHtml(
  userName: string,
  orderId: string,
  total: number,
  ticketCount: number
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#111;color:#eee;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="color:#d4a843;font-size:22px;margin-bottom:4px">Punchline Atlas</h1>
    <p style="color:#ccc">Hey ${escapeHtml(userName)},</p>
    <p style="color:#ccc">Your ticket order has been confirmed!</p>
    <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Order ID:</strong> #${orderId.slice(0, 8)}</p>
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Tickets:</strong> ${ticketCount}</p>
      <p style="color:#aaa;margin:4px 0"><strong style="color:white">Total:</strong> $${total.toFixed(2)}</p>
    </div>
    <p style="color:#ccc">You can view your tickets and QR codes in your account dashboard.</p>
    <a href="${process.env.NEXTAUTH_URL || "https://punchline-atlas.vercel.app"}/tickets" style="display:inline-block;padding:12px 24px;background:#d4a843;color:#111;font-weight:bold;border-radius:8px;text-decoration:none;margin-top:12px">View My Tickets</a>
    <p style="color:#666;font-size:12px;margin-top:24px">Thank you for using Punchline Atlas!</p>
  </div>
</body>
</html>`;
}

function paymentFailedEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#111;color:#eee;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="color:#d4a843;font-size:22px;margin-bottom:4px">Punchline Atlas</h1>
    <p style="color:#ccc">Hey ${escapeHtml(userName)},</p>
    <p style="color:#ccc">We were unable to process your recent payment. Please update your payment method to keep your subscription active.</p>
    <a href="${process.env.NEXTAUTH_URL || "https://punchline-atlas.vercel.app"}/settings" style="display:inline-block;padding:12px 24px;background:#d4a843;color:#111;font-weight:bold;border-radius:8px;text-decoration:none;margin-top:12px">Update Payment Method</a>
    <p style="color:#666;font-size:12px;margin-top:24px">If you need help, contact support at support@punchlineatlas.com.</p>
  </div>
</body>
</html>`;
}
