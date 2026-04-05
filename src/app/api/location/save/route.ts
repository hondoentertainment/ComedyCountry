import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidCoordinates } from "@/lib/geo";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/location/save
 *
 * Save or update a user's location alert preference.
 * Users can save multiple locations with different radii.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`location-save:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { latitude, longitude, radiusMi, label } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 },
      );
    }

    if (!isValidCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    }

    const radius =
      typeof radiusMi === "number" && radiusMi > 0 && radiusMi <= 500
        ? radiusMi
        : 50;

    // Check existing alerts count (limit per user)
    const existingCount = await prisma.locationAlert.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 location alerts allowed" },
        { status: 400 },
      );
    }

    const alert = await prisma.locationAlert.create({
      data: {
        userId: session.user.id,
        latitude,
        longitude,
        radiusMi: radius,
        isActive: true,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    logger.error(
      "POST /api/location/save error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to save location" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/location/save
 *
 * Get all saved location alerts for the current user.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(`location-save:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const alerts = await prisma.locationAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    logger.error(
      "GET /api/location/save error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/location/save
 *
 * Update a location alert (toggle active, change radius).
 */
export async function PATCH(request: Request) {
  const rl = await checkRateLimit(`location-save:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alertId, isActive, radiusMi } = body;

    if (!alertId || typeof alertId !== "string") {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await prisma.locationAlert.findFirst({
      where: { id: alertId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Location alert not found" },
        { status: 404 },
      );
    }

    const data: { isActive?: boolean; radiusMi?: number } = {};
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof radiusMi === "number" && radiusMi > 0 && radiusMi <= 500) {
      data.radiusMi = radiusMi;
    }

    const updated = await prisma.locationAlert.update({
      where: { id: alertId },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error(
      "PATCH /api/location/save error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/location/save
 *
 * Delete a saved location alert.
 */
export async function DELETE(request: Request) {
  const rl = await checkRateLimit(`location-save:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alertId } = body;

    if (!alertId || typeof alertId !== "string") {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 },
      );
    }

    // Verify ownership before deleting
    const existing = await prisma.locationAlert.findFirst({
      where: { id: alertId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Location alert not found" },
        { status: 404 },
      );
    }

    await prisma.locationAlert.delete({ where: { id: alertId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(
      "DELETE /api/location/save error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 },
    );
  }
}
