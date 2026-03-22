import { NextResponse } from "next/server";
import { recordPodcastClick } from "@/lib/podcast-pipeline";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await checkRateLimit(`podcast-pipeline-ticket-links:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const link = await recordPodcastClick(linkId);
    return NextResponse.json(link);
  } catch {
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}
