import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createBookingRequest,
  getBookingRequestsForComedian,
  getBookingRequestsForVenue,
} from "@/lib/booking";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");
  const venueId = searchParams.get("venueId");
  const status = searchParams.get("status") as string | undefined;

  try {
    if (comedianId) {
      const bookings = await getBookingRequestsForComedian(
        comedianId,
        status as Parameters<typeof getBookingRequestsForComedian>[1]
      );
      return NextResponse.json(bookings);
    }

    if (venueId) {
      const bookings = await getBookingRequestsForVenue(
        venueId,
        status as Parameters<typeof getBookingRequestsForVenue>[1]
      );
      return NextResponse.json(bookings);
    }

    return NextResponse.json(
      { error: "comedianId or venueId is required" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { venueId, comedianId, date, showType, budget, message } = body;

    if (!venueId || !comedianId || !date) {
      return NextResponse.json(
        { error: "venueId, comedianId, and date are required" },
        { status: 400 }
      );
    }

    const booking = await createBookingRequest({
      venueId,
      comedianId,
      requesterId: session.user.id,
      date: new Date(date),
      showType,
      budget,
      message,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
