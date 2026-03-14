import { NextResponse } from "next/server";
import { getUpcomingFestivals } from "@/lib/international";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const festivals = await getUpcomingFestivals(limit);
    return NextResponse.json({ festivals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch upcoming festivals" },
      { status: 500 },
    );
  }
}
