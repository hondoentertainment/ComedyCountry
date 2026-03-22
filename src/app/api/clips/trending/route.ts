import { NextResponse } from "next/server";
import { getTrendingBits } from "@/lib/short-clips";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`clips-trending:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

  try {
    const trending = await getTrendingBits(limit);
    return NextResponse.json(trending);
  } catch {
    return NextResponse.json(
      { error: "Failed to load trending bits" },
      { status: 500 },
    );
  }
}
