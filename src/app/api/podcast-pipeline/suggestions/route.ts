import { NextResponse } from "next/server";
import { suggestPodcastTicketLinks } from "@/lib/podcast-pipeline";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`podcast-pipeline-suggestions:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const suggestions = await suggestPodcastTicketLinks(comedianId);
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
