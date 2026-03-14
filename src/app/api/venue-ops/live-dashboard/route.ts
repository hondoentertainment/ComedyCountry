import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildVenueDashboardSnapshot,
  createDashboardStream,
} from "@/lib/venue-realtime";

/**
 * Real-Time Venue Dashboard API
 *
 * GET with Accept: text/event-stream → SSE stream (live updates every 5s)
 * GET without SSE header → single snapshot
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const eventId = searchParams.get("eventId");
  const interval = parseInt(searchParams.get("interval") ?? "5000", 10);

  if (!venueId || !eventId) {
    return NextResponse.json(
      { error: "venueId and eventId are required" },
      { status: 400 }
    );
  }

  // Check if client wants SSE stream
  const acceptHeader = request.headers.get("accept") ?? "";
  if (acceptHeader.includes("text/event-stream")) {
    const safeInterval = Math.max(interval, 2000); // min 2s
    const stream = createDashboardStream(venueId, eventId, safeInterval);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Single snapshot
  try {
    const snapshot = await buildVenueDashboardSnapshot(venueId, eventId);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
