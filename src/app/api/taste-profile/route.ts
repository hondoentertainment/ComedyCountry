import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeTasteProfile, getTasteProfile } from "@/lib/taste-profile";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const STALE_DAYS = 7;

/**
 * GET - Get current user's taste profile. Auto-computes if missing or stale (>7 days).
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`taste-profile:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let profile = await getTasteProfile(session.user.id);

    // Recompute if missing or stale
    if (!profile || isStale(profile.lastComputed)) {
      profile = await computeTasteProfile(session.user.id);
    }

    return NextResponse.json(profile);
  } catch (err) {
    logger.error(
      "Taste profile GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch taste profile" },
      { status: 500 },
    );
  }
}

/**
 * POST - Force recompute the user's taste profile.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`taste-profile:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await computeTasteProfile(session.user.id);
    return NextResponse.json(profile);
  } catch (err) {
    logger.error(
      "Taste profile POST error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to compute taste profile" },
      { status: 500 },
    );
  }
}

function isStale(lastComputed: Date): boolean {
  const age = Date.now() - lastComputed.getTime();
  return age > STALE_DAYS * 24 * 60 * 60 * 1000;
}
