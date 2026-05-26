import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSceneIntelligenceBySlug } from "@/lib/scene-intelligence";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> },
) {
  const rl = await checkRateLimit(
    `scenes-insights:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { city } = await params;
    const insights = await getSceneIntelligenceBySlug(city);

    if (!insights) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json(insights, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    logger.error(
      "Scene insights GET error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch scene insights" },
      { status: 500 },
    );
  }
}
