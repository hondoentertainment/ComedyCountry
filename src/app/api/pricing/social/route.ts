import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  computeSocialPrice,
  getEventSocialPricing,
} from "@/lib/social-pricing";

/**
 * Social Signal Pricing API
 *
 * GET ?eventId=xxx — get social-signal pricing for all ticket types
 * GET ?ticketTypeId=xxx — get social-signal pricing for a specific ticket type
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const ticketTypeId = searchParams.get("ticketTypeId");
  const floor = searchParams.get("floor")
    ? parseFloat(searchParams.get("floor")!)
    : undefined;
  const ceiling = searchParams.get("ceiling")
    ? parseFloat(searchParams.get("ceiling")!)
    : undefined;

  try {
    if (ticketTypeId) {
      const result = await computeSocialPrice(ticketTypeId, { floor, ceiling });
      return NextResponse.json(result);
    }

    if (eventId) {
      const results = await getEventSocialPricing(eventId, { floor, ceiling });
      return NextResponse.json({ eventId, ticketTypes: results });
    }

    return NextResponse.json(
      { error: "eventId or ticketTypeId is required" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute pricing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
