import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
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

    const { id } = await context.params;
    const body = await request.json();
    const { status, startDate, endDate } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "inquiry",
      "negotiating",
      "confirmed",
      "active",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    const sponsorship = await prisma.sponsorship.update({
      where: { id },
      data: {
        status,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json(sponsorship);
  } catch (error) {
    logger.error(
      "PUT /api/sponsorships/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update sponsorship" },
      { status: 500 },
    );
  }
}
