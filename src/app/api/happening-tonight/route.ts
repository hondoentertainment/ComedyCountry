import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getHappeningTonight } from "@/lib/taste-profile";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET - Events happening today/tonight.
 * Query params: latitude, longitude, radiusMi (all optional).
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `happening-tonight:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("latitude");
    const lonStr = searchParams.get("longitude");
    const radiusStr = searchParams.get("radiusMi");

    const latitude = latStr ? parseFloat(latStr) : undefined;
    const longitude = lonStr ? parseFloat(lonStr) : undefined;
    const radiusMi = radiusStr ? parseInt(radiusStr, 10) : undefined;

    const events = await getHappeningTonight(
      undefined,
      latitude,
      longitude,
      radiusMi,
    );

    return NextResponse.json(
      { events },
      {
        headers: { "Cache-Control": "public, max-age=120" },
      },
    );
  } catch (err) {
    logger.error(
      "Happening tonight error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch tonight's events" },
      { status: 500 },
    );
  }
}
