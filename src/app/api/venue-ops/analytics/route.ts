import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVenueAnalytics } from "@/lib/venue-ops";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  try {
    const analytics = await getVenueAnalytics(venueId);
    return NextResponse.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch venue analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
