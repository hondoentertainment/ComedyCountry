import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSocialProof, computeSocialProof } from "@/lib/discovery-engine";

/**
 * GET - Get social proof for an entity.
 * Query params: entityType, entityId
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const refresh = searchParams.get("refresh") === "true";

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required query params: entityType, entityId" },
        { status: 400 },
      );
    }

    const validTypes = ["EVENT", "COMEDIAN", "VENUE", "CLIP", "PODCAST"];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    if (refresh) {
      const proof = await computeSocialProof(
        entityType as "EVENT" | "COMEDIAN" | "VENUE" | "CLIP" | "PODCAST",
        entityId,
      );
      return NextResponse.json(proof);
    }

    const proof = await getSocialProof(
      entityType as "EVENT" | "COMEDIAN" | "VENUE" | "CLIP" | "PODCAST",
      entityId,
      userId,
    );

    if (!proof) {
      return NextResponse.json(
        { error: "No social proof found for this entity" },
        { status: 404 },
      );
    }

    return NextResponse.json(proof);
  } catch (err) {
    console.error("Discovery social-proof GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch social proof" },
      { status: 500 },
    );
  }
}
