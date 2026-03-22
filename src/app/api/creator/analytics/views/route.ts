import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getViewTrends } from "@/lib/creator-analytics";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`creator-analytics:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "No approved comedian profile" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "daily") as "daily" | "weekly" | "monthly";
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));

  try {
    const trends = await getViewTrends(comedian.id, period, days);
    return NextResponse.json({ trends, period, days });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch view trends";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
