import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCheckoutSession,
  createPortalSession,
  isStripeConfigured,
} from "@/lib/stripe";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST - Create a Stripe Checkout Session for subscription.
 * Returns checkout URL for client-side redirect.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `stripe-checkout:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { plan } = await request.json();

  const validPlans = [
    "FAN_PRO",
    "COMEDIAN_PRO",
    "COMEDIAN_PREMIUM",
    "VENUE_PRO",
    "VENUE_PREMIUM",
  ];
  if (!plan || !validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // If Stripe is not configured, fall back to demo mode
  if (!isStripeConfigured()) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    try {
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        update: {
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        create: {
          userId: session.user.id,
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Subscription service unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      mode: "demo",
      message:
        "Demo subscription activated. Configure STRIPE_SECRET_KEY for real payments.",
    });
  }

  // Check for existing Stripe customer
  let customerId: string | null = null;
  try {
    const existing = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustId: true },
    });
    customerId = existing?.stripeCustId || null;
  } catch {
    // Continue without customer ID
  }

  const origin = new URL(request.url).origin;

  try {
    const { url } = await createCheckoutSession({
      plan,
      userId: session.user.id,
      email: session.user.email,
      customerId,
      successUrl: `${origin}/settings?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=canceled`,
    });

    return NextResponse.json({ url });
  } catch (err) {
    logger.error(
      "Stripe checkout error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

/**
 * GET - Create a Stripe billing portal session for managing subscription.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `stripe-checkout:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustId: true },
    });

    if (!sub?.stripeCustId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 404 },
      );
    }

    const origin = new URL(request.url).origin;
    const portalUrl = await createPortalSession(
      sub.stripeCustId,
      `${origin}/settings`,
    );

    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    logger.error(
      "Stripe portal error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
