import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  removeAccessibilityTag,
  verifyAccessibilityTag,
} from "@/lib/accessibility";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `accessibility-tags:${getRateLimitKey(request)}`,
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

    const { id } = await params;

    const tag = await removeAccessibilityTag(id);

    return NextResponse.json(tag);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Accessibility tag not found"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logger.error(
      "DELETE /api/accessibility/tags/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to remove accessibility tag" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `accessibility-tags:${getRateLimitKey(request)}`,
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

    const { id } = await params;

    const tag = await verifyAccessibilityTag(id, session.user.id);

    return NextResponse.json(tag);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Accessibility tag not found"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logger.error(
      "PATCH /api/accessibility/tags/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to verify accessibility tag" },
      { status: 500 },
    );
  }
}
