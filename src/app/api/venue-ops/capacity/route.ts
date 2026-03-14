import { NextResponse } from "next/server";
import { logCapacity, getCapacityStatus } from "@/lib/venue-ops";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const eventId = searchParams.get("eventId") ?? undefined;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    const status = await getCapacityStatus(venueId, eventId);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { venueId, eventId, count, source } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    if (count === undefined || count === null) {
      return NextResponse.json(
        { error: "count is required" },
        { status: 400 }
      );
    }

    const log = await logCapacity(venueId, eventId ?? null, count, source ?? "manual");
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
