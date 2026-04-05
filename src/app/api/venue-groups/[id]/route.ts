import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVenueGroup } from "@/lib/marketplace";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  const rl = await checkRateLimit(`venue-groups:${getRateLimitKey(request)}`, {
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
    const group = await getVenueGroup(id);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    logger.error(
      "GET /api/venue-groups/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: Ctx) {
  const rl = await checkRateLimit(`venue-groups:${getRateLimitKey(request)}`, {
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
    const { action, venueId, userId, role } = body;

    if (!action || !["add_venue", "add_staff"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'add_venue' or 'add_staff'" },
        { status: 400 },
      );
    }

    if (action === "add_venue") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 },
        );
      }

      const member = await prisma.venueGroupMember.create({
        data: { groupId: id, venueId },
      });
      return NextResponse.json(member, { status: 201 });
    }

    // add_staff
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const staff = await prisma.venueGroupStaff.create({
      data: { groupId: id, userId, role: role || "staff" },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    logger.error(
      "POST /api/venue-groups/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to modify group" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const rl = await checkRateLimit(`venue-groups:${getRateLimitKey(request)}`, {
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

    await prisma.venueGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "DELETE /api/venue-groups/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 },
    );
  }
}
