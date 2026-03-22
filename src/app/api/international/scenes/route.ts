import { NextResponse } from "next/server";
import {
  getInternationalScenes,
  createInternationalScene,
} from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-scenes:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || undefined;
    const region = searchParams.get("region") || undefined;

    const scenes = await getInternationalScenes({ country, region });
    return NextResponse.json({ scenes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scenes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-scenes:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { city, country, countryCode, timezone } = body;

    if (!city || !country || !countryCode || !timezone) {
      return NextResponse.json(
        { error: "city, country, countryCode, and timezone are required" },
        { status: 400 },
      );
    }

    const scene = await createInternationalScene(body);
    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create scene" },
      { status: 500 },
    );
  }
}
