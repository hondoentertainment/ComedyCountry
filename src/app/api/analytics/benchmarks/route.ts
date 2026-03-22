import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVenueBenchmarks } from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-benchmarks:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json(
      { error: "venueId is required" },
      { status: 400 }
    );
  }

  try {
    const benchmarks = await getVenueBenchmarks(venueId);
    return NextResponse.json(benchmarks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get benchmarks" },
      { status: 500 }
    );
  }
}
