import { NextResponse } from "next/server";
import { getAllTouringInfo, createTouringInfo } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-touring:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const info = await getAllTouringInfo();
    return NextResponse.json({ touringInfo: info });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch touring info" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-touring:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { country, countryCode } = body;

    if (!country || !countryCode) {
      return NextResponse.json(
        { error: "country and countryCode are required" },
        { status: 400 },
      );
    }

    const info = await createTouringInfo(body);
    return NextResponse.json(info, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create touring info" },
      { status: 500 },
    );
  }
}
