import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarFeedToken } from "../route";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { canUseCalendarFeed } from "@/lib/subscription-gates";

/**
 * POST /api/calendar-feed/token
 * Generate a subscription token for the authenticated user.
 * Returns { token, url } for adding to calendar apps.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(getRateLimitKey(request), {
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await canUseCalendarFeed(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Calendar feed is a Pro feature. Upgrade to unlock." },
        { status: 403 }
      );
    }

    const token = createCalendarFeedToken(session.user.id);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://punchlineatlas.com");
    const url = `${baseUrl.replace(/\/$/, "")}/api/calendar-feed?token=${token}`;

    return NextResponse.json({ token, url });
  } catch (err) {
    console.error("Calendar feed token error:", err);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
