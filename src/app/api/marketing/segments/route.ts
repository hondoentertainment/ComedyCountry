import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAudienceSegment, getAudienceSegments } from "@/lib/marketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`marketing-segments:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    const segments = await getAudienceSegments(venueId);
    return NextResponse.json({ segments });
  } catch (error) {
    console.error("GET /api/marketing/segments error:", error);
    return NextResponse.json({ error: "Failed to fetch segments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`marketing-segments:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, name, description, criteria } = body;

    if (!name || !criteria) {
      return NextResponse.json(
        { error: "name and criteria are required" },
        { status: 400 },
      );
    }

    const segment = await createAudienceSegment({ venueId, name, description, criteria });
    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketing/segments error:", error);
    return NextResponse.json({ error: "Failed to create segment" }, { status: 500 });
  }
}
