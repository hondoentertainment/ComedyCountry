import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  moderateContent,
  moderateText,
  scoreMediaContent,
  getModerationQueue,
  reviewModerationItem,
  getUserStrikes,
  issueStrike,
  removeStrike,
} from "@/lib/content-moderation";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/moderation — get moderation queue or user strikes
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rl = await checkRateLimit(`moderation:${getRateLimitKey(request)}`, {
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

  // Only admins can view moderation queue
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // Get user strikes
    if (action === "strikes") {
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required" },
          { status: 400 },
        );
      }
      const strikes = await getUserStrikes(userId);
      return NextResponse.json(strikes);
    }

    // Get moderation queue (default)
    const status = searchParams.get("status") as
      | "APPROVED"
      | "FLAGGED"
      | "REJECTED"
      | "PENDING_REVIEW"
      | null;
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
      200,
    );

    const queue = await getModerationQueue(status ?? undefined, limit);
    return NextResponse.json({ items: queue, count: queue.length });
  } catch (error) {
    logger.error(
      "GET /api/moderation error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch moderation data" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/moderation — moderate content or take moderation actions
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const rl = await checkRateLimit(`moderation:${getRateLimitKey(request)}`, {
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
    const { action } = body;

    // Action: moderate — run content through moderation pipeline
    if (action === "moderate") {
      const { text, media, contentType, contentId } = body;

      if (!contentType || !contentId) {
        return NextResponse.json(
          { error: "contentType and contentId are required" },
          { status: 400 },
        );
      }

      const result = await moderateContent({
        text,
        media,
        userId: session.user.id,
        contentType,
        contentId,
      });

      return NextResponse.json(result);
    }

    // Action: check-text — quick text moderation check (no DB writes)
    if (action === "check-text") {
      const { text } = body;
      if (!text || typeof text !== "string") {
        return NextResponse.json(
          { error: "text is required" },
          { status: 400 },
        );
      }

      const result = moderateText(text);
      return NextResponse.json(result);
    }

    // Action: check-media — quick media moderation scoring (no DB writes)
    if (action === "check-media") {
      const { metadata } = body;
      if (!metadata) {
        return NextResponse.json(
          { error: "metadata is required" },
          { status: 400 },
        );
      }

      const result = scoreMediaContent(metadata);
      return NextResponse.json(result);
    }

    // Action: review — admin reviews a queued item
    if (action === "review") {
      const user = session.user as { id: string; role?: string };
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }

      const { itemId, decision } = body;
      if (!itemId || !decision) {
        return NextResponse.json(
          { error: "itemId and decision are required" },
          { status: 400 },
        );
      }

      const validDecisions = [
        "APPROVED",
        "FLAGGED",
        "REJECTED",
        "PENDING_REVIEW",
      ];
      if (!validDecisions.includes(decision)) {
        return NextResponse.json(
          { error: `decision must be one of: ${validDecisions.join(", ")}` },
          { status: 400 },
        );
      }

      const result = await reviewModerationItem(
        itemId,
        decision,
        session.user.id,
      );
      return NextResponse.json(result);
    }

    // Action: issue-strike — admin issues a strike to a user
    if (action === "issue-strike") {
      const user = session.user as { id: string; role?: string };
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }

      const { userId, reason, category } = body;
      if (!userId || !reason || !category) {
        return NextResponse.json(
          { error: "userId, reason, and category are required" },
          { status: 400 },
        );
      }

      const result = await issueStrike(userId, reason, category);
      return NextResponse.json(result);
    }

    // Action: remove-strike — admin removes a strike
    if (action === "remove-strike") {
      const user = session.user as { id: string; role?: string };
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }

      const { userId, strikeId } = body;
      if (!userId || !strikeId) {
        return NextResponse.json(
          { error: "userId and strikeId are required" },
          { status: 400 },
        );
      }

      const result = await removeStrike(userId, strikeId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error(
      "POST /api/moderation error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Moderation action failed" },
      { status: 500 },
    );
  }
}
