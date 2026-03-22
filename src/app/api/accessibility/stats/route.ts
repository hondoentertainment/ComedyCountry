import { NextResponse } from "next/server";
import { getAccessibilityStats } from "@/lib/accessibility";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`accessibility-stats:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const stats = await getAccessibilityStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/accessibility/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accessibility stats" },
      { status: 500 },
    );
  }
}
