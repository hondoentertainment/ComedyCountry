import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createFollowUpSequence, getFollowUpSequences } from "@/lib/marketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `marketing-follow-ups:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    const sequences = await getFollowUpSequences(venueId);
    return NextResponse.json({ sequences });
  } catch (error) {
    logger.error(
      "GET /api/marketing/follow-ups error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `marketing-follow-ups:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, name, triggerEvent, steps } = body;

    if (!venueId || !name || !triggerEvent || !steps) {
      return NextResponse.json(
        { error: "venueId, name, triggerEvent, and steps are required" },
        { status: 400 },
      );
    }

    const sequence = await createFollowUpSequence(venueId, {
      name,
      triggerEvent,
      steps,
    });
    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create sequence";
    const status = msg.includes("Invalid trigger") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
