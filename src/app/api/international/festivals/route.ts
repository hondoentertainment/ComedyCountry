import { NextResponse } from "next/server";
import { getFestivalCircuit, createFestival } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-festivals:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || undefined;
    const category = searchParams.get("category") || undefined;

    const festivals = await getFestivalCircuit({ country, category });
    return NextResponse.json({ festivals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch festivals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-festivals:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, city, country, countryCode } = body;

    if (!name || !city || !country || !countryCode) {
      return NextResponse.json(
        { error: "name, city, country, and countryCode are required" },
        { status: 400 },
      );
    }

    // Convert date strings to Date objects
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);

    const festival = await createFestival(body);
    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create festival" },
      { status: 500 },
    );
  }
}
