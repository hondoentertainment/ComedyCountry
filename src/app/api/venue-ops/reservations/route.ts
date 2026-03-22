import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addToCompList, getCompList, updateCompStatus } from "@/lib/venue-ops";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-reservations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const reservations = await getCompList(eventId);
    return NextResponse.json(reservations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch reservations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-reservations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, guestName, guestEmail, tickets, reason, action, id, status } = body;

    // Handle status update
    if (action === "updateStatus" && id && status) {
      const updated = await updateCompStatus(id, status, session.user.id);
      return NextResponse.json(updated);
    }

    // Create new reservation
    if (!eventId || !guestName) {
      return NextResponse.json(
        { error: "eventId and guestName are required" },
        { status: 400 },
      );
    }

    const reservation = await addToCompList(eventId, {
      guestName,
      guestEmail,
      tickets,
      reason,
      approvedBy: session.user.id,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to manage reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
