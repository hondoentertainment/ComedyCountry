import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyDiscoveryBoost, getActiveBoosts } from "@/lib/discovery-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const VALID_ENTITY_TYPES = ["EVENT", "COMEDIAN", "VENUE", "CLIP", "PODCAST"] as const;
const VALID_BOOST_TYPES = [
  "NEW_COMEDIAN", "RETURNING_FAVORITE", "FRIEND_RECOMMENDED",
  "TRENDING", "EDITORIAL_PICK",
] as const;

/**
 * POST - Apply a discovery boost (admin only).
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`discovery-boost:${getRateLimitKey(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const user = session.user as { id: string; role?: string };
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { entityType, entityId, boostType, durationHours } = body;

    if (!entityType || !entityId || !boostType || !durationHours) {
      return NextResponse.json(
        { error: "Missing required fields: entityType, entityId, boostType, durationHours" },
        { status: 400 },
      );
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    if (!VALID_BOOST_TYPES.includes(boostType)) {
      return NextResponse.json(
        { error: `Invalid boostType. Must be one of: ${VALID_BOOST_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    if (typeof durationHours !== "number" || durationHours <= 0) {
      return NextResponse.json(
        { error: "durationHours must be a positive number" },
        { status: 400 },
      );
    }

    const boost = await applyDiscoveryBoost(
      entityType,
      entityId,
      boostType,
      durationHours,
    );

    return NextResponse.json(boost, { status: 201 });
  } catch (err) {
    console.error("Discovery boost POST error:", err);
    return NextResponse.json(
      { error: "Failed to apply boost" },
      { status: 500 },
    );
  }
}

/**
 * GET - List all active boosts.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`discovery-boost:${getRateLimitKey(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const boosts = await getActiveBoosts();

    return NextResponse.json({ boosts, count: boosts.length });
  } catch (err) {
    console.error("Discovery boost GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch boosts" },
      { status: 500 },
    );
  }
}
