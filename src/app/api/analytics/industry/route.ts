import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIndustryTrends } from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-industry:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const region = searchParams.get("region") || undefined;
  const period = searchParams.get("period") || undefined;

  try {
    const trends = await getIndustryTrends({ category, region, period });
    return NextResponse.json(trends);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get industry trends" },
      { status: 500 }
    );
  }
}
