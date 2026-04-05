import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { searchAccessibleVenues } from "@/lib/accessibility";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(
    `accessibility-venues:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = request.nextUrl;

    const types = searchParams.get("types")?.split(",").filter(Boolean);
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!, 10)
      : undefined;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!, 10)
      : undefined;

    const result = await searchAccessibleVenues({
      types,
      city,
      state,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      "GET /api/accessibility/venues error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to search accessible venues" },
      { status: 500 },
    );
  }
}
