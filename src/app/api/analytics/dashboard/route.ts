import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAudienceHeatmap,
  getVenueBenchmarks,
  getComedianAnalytics,
  getIndustryTrends,
  generateComedianAnalytics,
  computeVenueBenchmark,
  generateAudienceHeatmap,
} from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Unified Analytics Dashboard API
 * Wires orphaned analytics models (AudienceHeatmap, ComedianAnalytics,
 * VenueBenchmark, IndustryTrend) into a single dashboard endpoint.
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-dashboard:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // comedian | venue | industry | overview
  const comedianId = searchParams.get("comedianId");
  const venueId = searchParams.get("venueId");
  const region = searchParams.get("region") ?? undefined;
  const period = searchParams.get("period") ?? undefined;

  try {
    switch (type) {
      case "comedian": {
        if (!comedianId) {
          return NextResponse.json({ error: "comedianId required" }, { status: 400 });
        }

        const [analytics, heatmap] = await Promise.all([
          getComedianAnalytics(comedianId),
          getAudienceHeatmap(comedianId),
        ]);

        return NextResponse.json({
          type: "comedian",
          comedianId,
          analytics,
          heatmap,
        });
      }

      case "venue": {
        if (!venueId) {
          return NextResponse.json({ error: "venueId required" }, { status: 400 });
        }

        const benchmarks = await getVenueBenchmarks(venueId);

        return NextResponse.json({
          type: "venue",
          venueId,
          benchmarks,
        });
      }

      case "industry": {
        const trends = await getIndustryTrends({ region, period });

        return NextResponse.json({
          type: "industry",
          region: region ?? "all",
          period: period ?? "current",
          trends,
        });
      }

      case "overview": {
        // Full overview: popular trends + any comedian/venue data if provided
        const responses: Record<string, unknown> = { type: "overview" };

        const promises: Promise<void>[] = [];

        promises.push(
          getIndustryTrends({ period }).then((t) => {
            responses.industryTrends = t;
          })
        );

        if (comedianId) {
          promises.push(
            getComedianAnalytics(comedianId).then((a) => {
              responses.comedianAnalytics = a;
            })
          );
          promises.push(
            getAudienceHeatmap(comedianId).then((h) => {
              responses.audienceHeatmap = h;
            })
          );
        }

        if (venueId) {
          promises.push(
            getVenueBenchmarks(venueId).then((b) => {
              responses.venueBenchmarks = b;
            })
          );
        }

        await Promise.all(promises);
        return NextResponse.json(responses);
      }

      default:
        return NextResponse.json(
          { error: "type must be comedian, venue, industry, or overview" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Trigger analytics computation (compute/refresh analytics data).
 */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-dashboard:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, comedianId, venueId, period } = body;

    switch (action) {
      case "compute-comedian": {
        if (!comedianId) {
          return NextResponse.json({ error: "comedianId required" }, { status: 400 });
        }
        const [analytics, heatmap] = await Promise.all([
          generateComedianAnalytics(comedianId, period),
          generateAudienceHeatmap(comedianId),
        ]);
        return NextResponse.json({ analytics, heatmap });
      }

      case "compute-venue": {
        if (!venueId) {
          return NextResponse.json({ error: "venueId required" }, { status: 400 });
        }
        const benchmarks = await computeVenueBenchmark(venueId, period);
        return NextResponse.json({ benchmarks });
      }

      default:
        return NextResponse.json(
          { error: "action must be compute-comedian or compute-venue" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
