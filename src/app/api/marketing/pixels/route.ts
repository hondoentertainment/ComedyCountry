import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  registerRetargetingPixel,
  getRetargetingPixels,
} from "@/lib/marketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `marketing-pixels:${getRateLimitKey(request)}`,
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

    const pixels = await getRetargetingPixels(venueId);
    return NextResponse.json({ pixels });
  } catch (error) {
    logger.error(
      "GET /api/marketing/pixels error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch pixels" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `marketing-pixels:${getRateLimitKey(request)}`,
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
    const { venueId, provider, pixelId, events } = body;

    if (!venueId || !provider || !pixelId) {
      return NextResponse.json(
        { error: "venueId, provider, and pixelId are required" },
        { status: 400 },
      );
    }

    const pixel = await registerRetargetingPixel(
      venueId,
      provider,
      pixelId,
      events,
    );
    return NextResponse.json(pixel, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to register pixel";
    const status = msg.includes("Invalid provider") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
