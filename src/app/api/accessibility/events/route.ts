import { NextRequest, NextResponse } from "next/server";
import { searchAccessibleEvents } from "@/lib/accessibility";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const types = searchParams.get("types")?.split(",").filter(Boolean);
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!, 10)
      : undefined;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!, 10)
      : undefined;

    const result = await searchAccessibleEvents({
      types,
      city,
      state,
      dateFrom,
      dateTo,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/accessibility/events error:", error);
    return NextResponse.json(
      { error: "Failed to search accessible events" },
      { status: 500 },
    );
  }
}
