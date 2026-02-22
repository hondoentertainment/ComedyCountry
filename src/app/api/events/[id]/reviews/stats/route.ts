import { NextResponse } from "next/server";
import { getEventRatingStats } from "@/lib/event-reviews";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  try {
    const stats = await getEventRatingStats(eventId);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
