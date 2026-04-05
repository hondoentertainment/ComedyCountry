import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addAccessibilityTag, getAccessibilityTags } from "@/lib/accessibility";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(
    `accessibility-tags:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get("eventId") ?? undefined;
    const venueId = searchParams.get("venueId") ?? undefined;

    const tags = await getAccessibilityTags(eventId, venueId);

    return NextResponse.json({ tags });
  } catch (error) {
    logger.error(
      "GET /api/accessibility/tags error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch accessibility tags" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(
    `accessibility-tags:${getRateLimitKey(request)}`,
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
    const { eventId, venueId, type, description } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    if (!eventId && !venueId) {
      return NextResponse.json(
        { error: "Either eventId or venueId is required" },
        { status: 400 },
      );
    }

    const tag = await addAccessibilityTag({
      eventId,
      venueId,
      type,
      description,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Invalid accessibility type")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error(
      "POST /api/accessibility/tags error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create accessibility tag" },
      { status: 500 },
    );
  }
}
