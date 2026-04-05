import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`sponsorships:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId") ?? undefined;
    const comedianId = searchParams.get("comedianId") ?? undefined;
    const venueId = searchParams.get("venueId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (eventId) where.eventId = eventId;
    if (comedianId) where.comedianId = comedianId;
    if (venueId) where.venueId = venueId;
    if (status) where.status = status;

    const sponsorships = await prisma.sponsorship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sponsorships });
  } catch (error) {
    logger.error(
      "GET /api/sponsorships error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch sponsorships" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`sponsorships:${getRateLimitKey(request)}`, {
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

    const body = await request.json();
    const {
      brandName,
      contactEmail,
      eventId,
      comedianId,
      venueId,
      package: pkg,
      amount,
    } = body;

    if (!brandName || !contactEmail || !pkg || !amount) {
      return NextResponse.json(
        { error: "brandName, contactEmail, package, and amount are required" },
        { status: 400 },
      );
    }

    const sponsorship = await prisma.sponsorship.create({
      data: {
        brandName,
        contactEmail,
        eventId,
        comedianId,
        venueId,
        package: pkg,
        amount,
      },
    });

    return NextResponse.json(sponsorship, { status: 201 });
  } catch (error) {
    logger.error(
      "POST /api/sponsorships error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create sponsorship" },
      { status: 500 },
    );
  }
}
