import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, parseBody, badRequest, serverError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import {
  createBookingRequest,
  getBookingRequestsForComedian,
  getBookingRequestsForVenue,
} from "@/lib/booking";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`bookings:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { session, error } = await requireAuth();
  if (error) return error;

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

    return badRequest("comedianId or venueId is required");
  } catch (err) {
    logger.error("Failed to get bookings", {}, err instanceof Error ? err : undefined);
    return serverError();
  }
}

const createBookingSchema = z.object({
  venueId: z.string().min(1),
  comedianId: z.string().min(1),
  date: z.string().min(1),
  showType: z.string().optional(),
  budget: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`bookings:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { data, error: valErr } = await parseBody(request, createBookingSchema);
  if (valErr) return valErr;

  try {
    const booking = await createBookingRequest({
      venueId: data.venueId,
      comedianId: data.comedianId,
      requesterId: session!.user!.id,
      date: new Date(data.date),
      showType: data.showType,
      budget: data.budget,
      message: data.message,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    logger.error("Failed to create booking", {}, err instanceof Error ? err : undefined);
    const message = err instanceof Error ? err.message : "Failed to create booking";
    return badRequest(message);
  }
}
