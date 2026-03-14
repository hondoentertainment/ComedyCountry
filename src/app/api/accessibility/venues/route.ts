import { NextRequest, NextResponse } from "next/server";
import { searchAccessibleVenues } from "@/lib/accessibility";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const types = searchParams.get("types")?.split(",").filter(Boolean);
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!, 10)
      : undefined;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!, 10)
      : undefined;

    const result = await searchAccessibleVenues({
      types,
      city,
      state,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/accessibility/venues error:", error);
    return NextResponse.json(
      { error: "Failed to search accessible venues" },
      { status: 500 },
    );
  }
}
