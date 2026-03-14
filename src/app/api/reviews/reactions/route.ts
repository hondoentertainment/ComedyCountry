import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Review reactions — helpful/funny votes on event or venue reviews.
 *
 * POST - Toggle a reaction
 * GET  - Get reaction counts for a review
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { reviewType, reviewId, reactionType } = await request.json();

  if (!reviewType || !reviewId || !reactionType) {
    return NextResponse.json({ error: "reviewType, reviewId, and reactionType required" }, { status: 400 });
  }

  const validTypes = ["event_review", "venue_review"];
  const validReactions = ["helpful", "funny"];

  if (!validTypes.includes(reviewType) || !validReactions.includes(reactionType)) {
    return NextResponse.json({ error: "Invalid reviewType or reactionType" }, { status: 400 });
  }

  try {
    // Toggle: if exists, remove; if not, create
    const existing = await prisma.reviewReaction.findUnique({
      where: {
        userId_reviewType_reviewId: {
          userId: session.user.id,
          reviewType,
          reviewId,
        },
      },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        // Same reaction — remove it (toggle off)
        await prisma.reviewReaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ action: "removed", reactionType });
      } else {
        // Different reaction — update it
        await prisma.reviewReaction.update({
          where: { id: existing.id },
          data: { reactionType },
        });
        return NextResponse.json({ action: "updated", reactionType });
      }
    }

    await prisma.reviewReaction.create({
      data: {
        userId: session.user.id,
        reviewType,
        reviewId,
        reactionType,
      },
    });

    return NextResponse.json({ action: "added", reactionType });
  } catch {
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewType = searchParams.get("reviewType");
  const reviewId = searchParams.get("reviewId");

  if (!reviewType || !reviewId) {
    return NextResponse.json({ error: "reviewType and reviewId required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  try {
    const reactions = await prisma.reviewReaction.findMany({
      where: { reviewType, reviewId },
      select: { reactionType: true, userId: true },
    });

    const helpful = reactions.filter((r) => r.reactionType === "helpful").length;
    const funny = reactions.filter((r) => r.reactionType === "funny").length;

    let userReaction: string | null = null;
    if (session?.user?.id) {
      const mine = reactions.find((r) => r.userId === session.user!.id);
      userReaction = mine?.reactionType || null;
    }

    return NextResponse.json({ helpful, funny, userReaction });
  } catch {
    return NextResponse.json({ helpful: 0, funny: 0, userReaction: null });
  }
}
