import { NextResponse } from "next/server";
import { registerPOSIntegration } from "@/lib/venue-ops";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`venue-ops-pos-integrations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    const integrations = await prisma.pOSIntegration.findMany({
      where: { venueId },
    });
    return NextResponse.json(integrations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`venue-ops-pos-integrations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { venueId, provider, ...config } = body;

    if (!venueId || !provider) {
      return NextResponse.json(
        { error: "venueId and provider are required" },
        { status: 400 }
      );
    }

    const integration = await registerPOSIntegration(venueId, provider, config);
    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
