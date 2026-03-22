import { NextResponse } from "next/server";
import { logCapacity, getCapacityStatus } from "@/lib/venue-ops";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`venue-ops-capacity:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const eventId = searchParams.get("eventId") ?? undefined;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    const status = await getCapacityStatus(venueId, eventId);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`venue-ops-capacity:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { venueId, eventId, count, source } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    if (count === undefined || count === null) {
      return NextResponse.json(
        { error: "count is required" },
        { status: 400 }
      );
    }

    const log = await logCapacity(venueId, eventId ?? null, count, source ?? "manual");
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
