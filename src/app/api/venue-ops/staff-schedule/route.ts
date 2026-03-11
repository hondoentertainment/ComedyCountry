import { NextResponse } from "next/server";
import { createStaffShift, getStaffSchedule } from "@/lib/venue-ops";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    const dateRange = {
      start: start ? new Date(start) : new Date(),
      end: end ? new Date(end) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const shifts = await getStaffSchedule(venueId, dateRange);
    return NextResponse.json(shifts);
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
    const { venueId, ...data } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    // Parse date strings to Date objects
    const shiftData = {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    };

    const shift = await createStaffShift(venueId, shiftData);
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
