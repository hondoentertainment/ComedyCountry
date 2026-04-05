import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { canUseLocationAlerts } from "@/lib/subscription-gates";
import { logger } from "@/lib/logger";

/**
 * GET - List user's location alerts.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const alerts = await prisma.locationAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    logger.error(
      "Location alerts GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch location alerts" },
      { status: 500 },
    );
  }
}

/**
 * POST - Create or update a location alert.
 * Body: { latitude, longitude, radiusMi }
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(getRateLimitKey(request), {
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, radiusMi } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required numbers" },
        { status: 400 },
      );
    }

    const radius =
      typeof radiusMi === "number" ? Math.max(1, Math.min(radiusMi, 500)) : 50;

    const allowed = await canUseLocationAlerts(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Free accounts can have 1 location alert. Upgrade to Pro for unlimited.",
        },
        { status: 403 },
      );
    }

    const alert = await prisma.locationAlert.create({
      data: {
        userId: session.user.id,
        latitude,
        longitude,
        radiusMi: radius,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    logger.error(
      "Location alerts POST error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create location alert" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove a location alert.
 * Body: { alertId }
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const alert = await prisma.locationAlert.findFirst({
      where: { id: alertId, userId: session.user.id },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await prisma.locationAlert.delete({ where: { id: alertId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(
      "Location alerts DELETE error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete location alert" },
      { status: 500 },
    );
  }
}
