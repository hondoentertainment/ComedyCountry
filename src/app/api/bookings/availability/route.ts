import { NextRequest, NextResponse } from "next/server";
import { getComedianAvailability, getBookingStats } from "@/lib/booking";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`bookings-availability:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");
  const month = parseInt(searchParams.get("month") ?? "", 10);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const stats = searchParams.get("stats") === "true";

  if (!comedianId) {
    return NextResponse.json(
      { error: "comedianId is required" },
      { status: 400 }
    );
  }

  try {
    if (stats) {
      const bookingStats = await getBookingStats(comedianId);
      return NextResponse.json(bookingStats);
    }

    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 }
      );
    }

    const availability = await getComedianAvailability(comedianId, month, year);
    return NextResponse.json({ comedianId, month, year, calendar: availability });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
