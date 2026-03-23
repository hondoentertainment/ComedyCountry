import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getBookingRequest,
  respondToBooking,
  negotiateBooking,
} from "@/lib/booking";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(`bookings:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const booking = await getBookingRequest(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const isAdmin = (session.user as { role?: string }).role === "admin";
    const isRequester = booking.requesterId === userId;
    const isComedian = !isAdmin && !isRequester
      ? !!(await prisma.comedianClaim.findFirst({
          where: { userId, comedianId: booking.comedianId, status: "APPROVED" },
        }))
      : false;

    if (!isAdmin && !isRequester && !isComedian) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const rl = await checkRateLimit(`bookings:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
