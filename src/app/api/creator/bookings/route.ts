import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getBookingRequests } from "@/lib/creator";

export async function GET(request: Request) {
  const auth = await requireCreator();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  try {
    const requests = await getBookingRequests(auth.comedian.id, status);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCreator();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { venueId, comedianId, date, showType, budget, message } = body;

    if (!venueId || !comedianId || !date) {
      return NextResponse.json(
        { error: "venueId, comedianId, and date are required" },
        { status: 400 },
      );
    }

    const comedian = await prisma.comedian.findUnique({ where: { id: comedianId } });
    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const booking = await prisma.bookingRequest.create({
      data: {
        venueId,
        comedianId,
        requesterId: auth.session.user.id,
        date: new Date(date),
        showType: showType ?? null,
        budget: budget ?? null,
        message: message ?? null,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create booking request" }, { status: 500 });
  }
}
