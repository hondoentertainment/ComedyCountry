import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { matchInfluencers } from "@/lib/marketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `marketing-influencers:${getRateLimitKey(request)}`,
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

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    const platform = searchParams.get("platform") ?? undefined;
    const minFollowers = searchParams.get("minFollowers")
      ? Number(searchParams.get("minFollowers"))
      : undefined;
    const minEngagement = searchParams.get("minEngagement")
      ? Number(searchParams.get("minEngagement"))
      : undefined;
    const genres = searchParams.get("genres")
      ? searchParams.get("genres")!.split(",")
      : undefined;

    const influencers = await matchInfluencers(venueId, {
      platform,
      minFollowers,
      minEngagement,
      genres,
    });

    return NextResponse.json({ influencers });
  } catch (error) {
    logger.error(
      "GET /api/marketing/influencers error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch influencers" },
      { status: 500 },
    );
  }
}
