import { NextResponse } from "next/server";
import { getComedyStyles, createComedyStyle } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-styles:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || undefined;

    const styles = await getComedyStyles(country);
    return NextResponse.json({ styles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch styles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-styles:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, country, description } = body;

    if (!name || !country || !description) {
      return NextResponse.json(
        { error: "name, country, and description are required" },
        { status: 400 },
      );
    }

    const style = await createComedyStyle(body);
    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create style" },
      { status: 500 },
    );
  }
}
