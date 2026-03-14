import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser, getBookingRequests } from "@/lib/creator";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  try {
    const requests = await getBookingRequests(comedian.id, status);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
        requesterId: session.user.id,
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
