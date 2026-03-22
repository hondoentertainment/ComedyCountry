import { NextResponse } from "next/server";
import { getTouringInfo } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string }> },
) {
  const rl = await checkRateLimit(`international-touring:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { country } = await params;
    const info = await getTouringInfo(decodeURIComponent(country));

    if (!info) {
      return NextResponse.json(
        { error: "Touring info not found for this country" },
        { status: 404 },
      );
    }

    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch touring info" },
      { status: 500 },
    );
  }
}
