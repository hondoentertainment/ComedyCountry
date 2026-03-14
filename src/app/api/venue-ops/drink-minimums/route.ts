import { NextResponse } from "next/server";
import { setDrinkMinimum, getDrinkMinimums } from "@/lib/venue-ops";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const minimums = await getDrinkMinimums(eventId);
    return NextResponse.json(minimums);
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
    const { eventId, ticketType, ...config } = body;

    if (!eventId || !ticketType) {
      return NextResponse.json(
        { error: "eventId and ticketType are required" },
        { status: 400 }
      );
    }

    const minimum = await setDrinkMinimum(eventId, ticketType, config);
    return NextResponse.json(minimum, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
