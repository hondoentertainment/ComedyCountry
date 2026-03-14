import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  redistributeToWaitlist,
  expireAndAdvanceWaitlist,
  handleTicketCancellation,
  getWaitlistOverview,
} from "@/lib/fair-ticketing";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, action, ticketId, ticketCount, reason } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "cancel-ticket": {
        if (!ticketId) {
          return NextResponse.json(
            { error: "ticketId is required for cancel-ticket action" },
            { status: 400 }
          );
        }
        const result = await handleTicketCancellation(eventId, ticketId, reason);
        return NextResponse.json(result);
      }

      case "redistribute": {
        const count = ticketCount ?? 1;
        const result = await redistributeToWaitlist(eventId, count);
        return NextResponse.json(result);
      }

      case "expire-advance": {
        const result = await expireAndAdvanceWaitlist(eventId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "action must be cancel-ticket, redistribute, or expire-advance" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  try {
    const overview = await getWaitlistOverview(eventId);
    return NextResponse.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
