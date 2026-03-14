import { NextRequest, NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import {
  computeSocialPrice,
  getEventSocialPricing,
} from "@/lib/social-pricing";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const ticketTypeId = searchParams.get("ticketTypeId");
  const floor = searchParams.get("floor") ? parseFloat(searchParams.get("floor")!) : undefined;
  const ceiling = searchParams.get("ceiling") ? parseFloat(searchParams.get("ceiling")!) : undefined;

  if (floor !== undefined && (isNaN(floor) || floor < 0)) return badRequest("floor must be a positive number");
  if (ceiling !== undefined && (isNaN(ceiling) || ceiling < 0)) return badRequest("ceiling must be a positive number");

  try {
    if (ticketTypeId) {
      const result = await computeSocialPrice(ticketTypeId, { floor, ceiling });
      return NextResponse.json(result);
    }

    if (eventId) {
      const results = await getEventSocialPricing(eventId, { floor, ceiling });
      return NextResponse.json({ eventId, ticketTypes: results });
    }

    return badRequest("eventId or ticketTypeId is required");
  } catch (err) {
    logger.error("Social pricing failed", {}, err instanceof Error ? err : undefined);
    return serverError();
  }
}
