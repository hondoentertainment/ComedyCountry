import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Check user's subscription status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json({ plan: "free", status: null, features: getFreeFeatures() });
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      features: getPlanFeatures(subscription.plan),
    });
  } catch {
    return NextResponse.json({ plan: "free", status: null, features: getFreeFeatures() });
  }
}

// POST - Create/update subscription (would connect to Stripe in production)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { plan } = body;

  const validPlans = ["FAN_PRO", "COMEDIAN_PRO", "COMEDIAN_PREMIUM", "VENUE_PRO", "VENUE_PREMIUM"];
  if (!plan || !validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: { plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
      create: {
        userId: session.user.id,
        plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      subscription,
      features: getPlanFeatures(plan),
      checkoutUrl: null,
      message: "Subscription created. In production, this would redirect to Stripe Checkout.",
    });
  } catch {
    return NextResponse.json({ error: "Subscription service unavailable" }, { status: 503 });
  }
}

function getFreeFeatures() {
  return {
    adFree: false,
    earlyAccess: false,
    wrappedAccess: true,
    analytics: false,
    verifiedBadge: false,
    promotedProfile: false,
    apiAccess: false,
    featuredPlacement: false,
    venueAnalytics: false,
    eventManagement: false,
  };
}

function getPlanFeatures(plan: string) {
  switch (plan) {
    case "FAN_PRO":
      return {
        adFree: true,
        earlyAccess: true,
        wrappedAccess: true,
        analytics: false,
        verifiedBadge: false,
        promotedProfile: false,
        apiAccess: false,
        featuredPlacement: false,
        venueAnalytics: false,
        eventManagement: false,
      };
    case "COMEDIAN_PRO":
      return {
        adFree: true,
        earlyAccess: true,
        wrappedAccess: true,
        analytics: true,
        verifiedBadge: true,
        promotedProfile: true,
        apiAccess: false,
        featuredPlacement: false,
        venueAnalytics: false,
        eventManagement: false,
      };
    case "COMEDIAN_PREMIUM":
      return {
        adFree: true,
        earlyAccess: true,
        wrappedAccess: true,
        analytics: true,
        verifiedBadge: true,
        promotedProfile: true,
        apiAccess: true,
        featuredPlacement: true,
        venueAnalytics: false,
        eventManagement: false,
      };
    case "VENUE_PRO":
      return {
        adFree: true,
        earlyAccess: true,
        wrappedAccess: true,
        analytics: false,
        verifiedBadge: false,
        promotedProfile: false,
        apiAccess: false,
        featuredPlacement: false,
        venueAnalytics: true,
        eventManagement: true,
      };
    case "VENUE_PREMIUM":
      return {
        adFree: true,
        earlyAccess: true,
        wrappedAccess: true,
        analytics: false,
        verifiedBadge: false,
        promotedProfile: false,
        apiAccess: true,
        featuredPlacement: true,
        venueAnalytics: true,
        eventManagement: true,
      };
    default:
      return getFreeFeatures();
  }
}
