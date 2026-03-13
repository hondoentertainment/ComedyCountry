import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getBookingRequest,
  respondToBooking,
  negotiateBooking,
} from "@/lib/booking";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const booking = await getBookingRequest(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, status, responseNote, budget, message } = body;

    if (action === "negotiate") {
      const updated = await negotiateBooking(params.id, {
        budget,
        message,
        responseNote,
      });
      return NextResponse.json(updated);
    }

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const updated = await respondToBooking(params.id, status, responseNote);
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update booking";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
