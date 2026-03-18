import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUseLocationAlerts, canUseCalendarFeed } from "@/lib/subscription-gates";

/**
 * GET /api/subscription/limits
 * Returns feature gates for the authenticated user.
 */
export async function GET() {
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
    console.error("Subscription limits error:", err);
    return NextResponse.json(
      { error: "Failed to fetch limits" },
      { status: 500 }
    );
  }
}
