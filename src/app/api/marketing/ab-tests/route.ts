import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createABTest } from "@/lib/marketing";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `marketing-ab-tests:${getRateLimitKey(request)}`,
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
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (venueId) where.venueId = venueId;
    if (status) where.status = status;

    const tests = await prisma.aBTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    logger.error(
      "GET /api/marketing/ab-tests error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch A/B tests" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `marketing-ab-tests:${getRateLimitKey(request)}`,
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
    const { eventId, venueId, name, type, variantA, variantB } = body;

    if (!name || !type || !variantA || !variantB) {
      return NextResponse.json(
        { error: "name, type, variantA, and variantB are required" },
        { status: 400 },
      );
    }

    const test = await createABTest({
      eventId,
      venueId,
      name,
      type,
      variantA,
      variantB,
    });
    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    logger.error(
      "POST /api/marketing/ab-tests error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create A/B test" },
      { status: 500 },
    );
  }
}
