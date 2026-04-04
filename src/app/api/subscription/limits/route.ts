import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canUseLocationAlerts,
  canUseCalendarFeed,
} from "@/lib/subscription-gates";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/subscription/limits
 * Returns feature gates for the authenticated user.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `subscription-limits:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [canAddLocationAlert, canUseCalendar] = await Promise.all([
      canUseLocationAlerts(session.user.id),
      canUseCalendarFeed(session.user.id),
    ]);

    return NextResponse.json({
      canAddLocationAlert,
      canUseCalendarFeed: canUseCalendar,
    });
  } catch (err) {
    logger.error(
      "Subscription limits error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch limits" },
      { status: 500 },
    );
  }
}
