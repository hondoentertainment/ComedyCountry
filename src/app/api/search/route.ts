import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request), { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const take = Math.min(
    parseInt(request.nextUrl.searchParams.get("take") ?? "5", 10) || 5,
    20
  );

  try {
    const results = await search(q, take);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { venues: [], comedians: [], events: [] },
      { status: 200 }
    );
  }
}
