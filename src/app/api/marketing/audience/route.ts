import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  computeAudienceProfile,
  findSimilarAudiences,
  getExpansionMarkets,
  getAudienceOverlap,
  getAudienceGrowthTrend,
} from "@/lib/audience-analytics";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`marketing-audience:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
    const action = searchParams.get("action") ?? "profile";

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    switch (action) {
      case "profile": {
        const profile = await computeAudienceProfile(venueId);
        return NextResponse.json({ profile });
      }

      case "similar": {
        const limit = Math.min(
          50,
          Math.max(
            1,
            parseInt(searchParams.get("limit") ?? "10", 10),
          ),
        );
        const similar = await findSimilarAudiences(venueId, limit);
        return NextResponse.json({ similar });
      }

      case "expansion": {
        const limit = Math.min(
          20,
          Math.max(
            1,
            parseInt(searchParams.get("limit") ?? "5", 10),
          ),
        );
        const markets = await getExpansionMarkets(venueId, limit);
        return NextResponse.json({ markets });
      }

      case "overlap": {
        const compareVenueId = searchParams.get("compareVenueId");
        if (!compareVenueId) {
          return NextResponse.json(
            { error: "compareVenueId is required for overlap analysis" },
            { status: 400 },
          );
        }
        const overlap = await getAudienceOverlap(venueId, compareVenueId);
        return NextResponse.json({ overlap });
      }

      case "growth": {
        const months = Math.min(
          24,
          Math.max(
            1,
            parseInt(searchParams.get("months") ?? "6", 10),
          ),
        );
        const trend = await getAudienceGrowthTrend(venueId, months);
        return NextResponse.json({ trend });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: profile, similar, expansion, overlap, growth`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("GET /api/marketing/audience error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch audience data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
