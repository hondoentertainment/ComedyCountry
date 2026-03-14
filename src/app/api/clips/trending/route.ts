import { NextResponse } from "next/server";
import { getTrendingBits } from "@/lib/short-clips";

export async function GET(request: Request) {
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
