import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Track analytics events for business intelligence.
 * Used for comedian/venue dashboards, ad performance, and affiliate tracking.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`analytics-track:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { entityType, entityId, action, metadata } = body;

  if (!entityType || !action) {
    return NextResponse.json({ error: "entityType and action required" }, { status: 400 });
  }

  const validActions = ["view", "click", "follow", "rsvp", "ticket_click", "share", "search", "ad_impression", "ad_click"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        entityType,
        entityId: entityId || null,
        action,
        userId: session?.user?.id || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch {
    // Analytics table may not exist yet; silently skip
  }

  return NextResponse.json({ tracked: true });
}
