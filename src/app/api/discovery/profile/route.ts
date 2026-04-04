import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDiscoveryProfile,
  computeDiscoveryProfile,
} from "@/lib/discovery-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET - Get user's discovery profile. Auto-computes if missing.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `discovery-profile:${getRateLimitKey(request)}`,
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

    let profile = await getDiscoveryProfile(session.user.id);

    if (!profile) {
      profile = await computeDiscoveryProfile(session.user.id);
    }

    return NextResponse.json(profile);
  } catch (err) {
    logger.error(
      "Discovery profile GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch discovery profile" },
      { status: 500 },
    );
  }
}
