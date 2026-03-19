import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPOSSummary } from "@/lib/venue-ops";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const eventId = searchParams.get("eventId") ?? undefined;

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  try {
    const summary = await getPOSSummary(venueId, eventId);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch POS summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
