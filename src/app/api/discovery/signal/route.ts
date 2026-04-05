import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSignal } from "@/lib/discovery-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const VALID_SIGNAL_TYPES = [
  "VIEW",
  "CLICK",
  "ATTEND",
  "FOLLOW",
  "CLIP_WATCH",
  "SHARE",
  "REVIEW",
  "CHECKIN",
  "PURCHASE",
] as const;

const VALID_ENTITY_TYPES = [
  "EVENT",
  "COMEDIAN",
  "VENUE",
  "CLIP",
  "PODCAST",
] as const;

/**
 * POST - Record an engagement signal for the discovery engine.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `discovery-signal:${getRateLimitKey(request)}`,
    { limit: 30, windowSeconds: 60 },
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
    const { signalType, entityType, entityId } = body;

    if (!signalType || !entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required fields: signalType, entityType, entityId" },
        { status: 400 },
      );
    }

    if (!VALID_SIGNAL_TYPES.includes(signalType)) {
      return NextResponse.json(
        {
          error: `Invalid signalType. Must be one of: ${VALID_SIGNAL_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        {
          error: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const signal = await recordSignal(session.user.id, {
      signalType,
      entityType,
      entityId,
    });

    return NextResponse.json(signal, { status: 201 });
  } catch (err) {
    logger.error(
      "Discovery signal POST error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to record signal" },
      { status: 500 },
    );
  }
}
