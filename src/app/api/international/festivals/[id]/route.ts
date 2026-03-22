import { NextResponse } from "next/server";
import { getFestivalById } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`international-festivals:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { id } = await params;
    const festival = await getFestivalById(id);

    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    return NextResponse.json(festival);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch festival" },
      { status: 500 },
    );
  }
}
