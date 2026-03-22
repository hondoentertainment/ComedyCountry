import { NextResponse } from "next/server";
import { getRecentEpisodes } from "@/lib/podcast-pipeline";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`podcast-pipeline-episodes:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const episodes = await getRecentEpisodes(comedianId, limit);
    return NextResponse.json(episodes);
  } catch {
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
