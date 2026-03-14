import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/stripe";

/**
 * Stripe webhook handler for subscription lifecycle events.
 * Handles: checkout.session.completed, invoice.paid, invoice.payment_failed,
 * customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const { valid, event } = await verifyWebhookSignature(rawBody, signature);
  if (!valid || !event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = event.type as string;
  const data = (event.data as { object: Record<string, unknown> }).object;

  try {
    switch (type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(data);
        break;
      case "invoice.paid":
        await handleInvoicePaid(data);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(data);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(data);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(data);
        break;
      default:
        // Unhandled event type - acknowledge receipt
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(data: Record<string, unknown>) {
  const userId = (data.client_reference_id || (data.metadata as Record<string, string>)?.userId) as string;
  const subscriptionId = data.subscription as string;
  const customerId = data.customer as string;
  const plan = ((data.metadata as Record<string, string>)?.plan || "FAN_PRO") as string;

  if (!userId) return;

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

  // Create welcome notification
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "subscription_activated",
        title: "Welcome to Pro!",
        message: `Your ${plan.replace("_", " ")} subscription is now active.`,
      },
    });
  } catch {
    // Notification creation is non-critical
  }
}

async function handleInvoicePaid(data: Record<string, unknown>) {
  const subscriptionId = data.subscription as string;
  if (!subscriptionId) return;

  const period = data.lines as { data?: Array<{ period?: { start: number; end: number } }> };
  const periodData = period?.data?.[0]?.period;

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
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const subscriptionId = data.subscription as string;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "PAST_DUE" },
  });

  // Notify the user
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubId: subscriptionId },
    select: { userId: true },
  });
  if (sub) {
    try {
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: "payment_failed",
          title: "Payment Failed",
          message: "We couldn't process your subscription payment. Please update your payment method.",
        },
      });
    } catch {
      // Non-critical
    }
  }
}

async function handleSubscriptionUpdated(data: Record<string, unknown>) {
  const subscriptionId = data.id as string;
  const cancelAtPeriodEnd = data.cancel_at_period_end as boolean;
  const currentPeriod = data.current_period_end as number;

  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: {
      cancelAtPeriodEnd: cancelAtPeriodEnd || false,
      ...(currentPeriod ? { currentPeriodEnd: new Date(currentPeriod * 1000) } : {}),
    },
  });
}

async function handleSubscriptionDeleted(data: Record<string, unknown>) {
  const subscriptionId = data.id as string;
  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "CANCELED", cancelAtPeriodEnd: false },
  });
}
