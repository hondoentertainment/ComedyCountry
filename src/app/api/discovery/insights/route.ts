import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDiscoveryInsights } from "@/lib/discovery-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET - Get "why we recommend this" explanations.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `discovery-insights:${getRateLimitKey(request)}`,
    { limit: 30, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const insights = await getDiscoveryInsights(session.user.id);

    return NextResponse.json({ insights });
  } catch (err) {
    logger.error(
      "Discovery insights GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch discovery insights" },
      { status: 500 },
    );
  }
}
