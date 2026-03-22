import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAudienceHeatmap } from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-heatmap:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json(
      { error: "comedianId is required" },
      { status: 400 }
    );
  }

  const country = searchParams.get("country") || undefined;
  const state = searchParams.get("state") || undefined;
  const minFanCount = searchParams.get("minFanCount");

  try {
    const heatmap = await getAudienceHeatmap(comedianId, {
      country,
      state,
      minFanCount: minFanCount ? parseInt(minFanCount, 10) : undefined,
    });
    return NextResponse.json(heatmap);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get heatmap" },
      { status: 500 }
    );
  }
}
