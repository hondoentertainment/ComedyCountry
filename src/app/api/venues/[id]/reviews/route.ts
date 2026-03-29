import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { checkAndAwardBadges } from "@/lib/badges.achievement";
import { moderateContent } from "@/lib/content-moderation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `venues-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const sortParam = searchParams.get("sort");
  const take = 10;
  const skip = (page - 1) * take;

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sortParam === "rating_high") orderBy = { rating: "desc" };
  else if (sortParam === "rating_low") orderBy = { rating: "asc" };

  // For helpful sort, fetch all then sort by reaction count
  if (sortParam === "helpful") {
    const [allReviews, total, stats] = await Promise.all([
      prisma.venueReview.findMany({
        where: { venueId: id },
        include: {
          user: { select: { profileName: true, name: true, image: true } },
        },
      }),
      prisma.venueReview.count({ where: { venueId: id } }),
      prisma.venueReview.aggregate({
        where: { venueId: id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    const reactions = await prisma.reviewReaction.groupBy({
      by: ["reviewId"],
      where: {
        reviewType: "venue_review",
        reviewId: { in: allReviews.map((r) => r.id) },
        reactionType: "helpful",
      },
      _count: true,
    });
    const helpfulMap = new Map(reactions.map((r) => [r.reviewId, r._count]));
    allReviews.sort(
      (a, b) => (helpfulMap.get(b.id) ?? 0) - (helpfulMap.get(a.id) ?? 0),
    );
    return NextResponse.json({
      reviews: allReviews.slice(skip, skip + take),
      total,
      avgRating: stats._avg.rating,
      count: stats._count,
      page,
      pages: Math.ceil(total / take),
    });
  }

  const [reviews, total, stats] = await Promise.all([
    prisma.venueReview.findMany({
      where: { venueId: id },
      include: {
        user: { select: { profileName: true, name: true, image: true } },
      },
      orderBy,
      take,
      skip,
    }),
    prisma.venueReview.count({ where: { venueId: id } }),
    prisma.venueReview.aggregate({
      where: { venueId: id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    reviews,
    total,
    avgRating: stats._avg.rating,
    count: stats._count,
    page,
    pages: Math.ceil(total / take),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `venues-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  // Moderate comment text if provided
  if (comment) {
    try {
      const modResult = await moderateContent({
        text: comment.trim(),
        userId: session.user.id,
        contentType: "venue_review",
        contentId: id,
      });
      if (!modResult.allowed) {
        const reason =
          modResult.textResult?.categories
            ?.filter((c) => c !== "clean")
            .join(", ") || "content policy violation";
        return NextResponse.json(
          { error: `Review rejected: ${reason}` },
          { status: 422 },
        );
      }
    } catch {
      // Moderation service failure should not block reviews
    }
  }

  const review = await prisma.venueReview.upsert({
    where: { venueId_userId: { venueId: id, userId: session.user.id } },
    update: { rating, comment: comment?.trim() || null },
    create: {
      venueId: id,
      userId: session.user.id,
      rating,
      comment: comment?.trim() || null,
    },
  });

  checkAndAwardBadges(session.user.id, "review_venue").catch(() => {});
  return NextResponse.json(review);
}

// DELETE: Remove current user's venue review
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `venues-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.venueReview.deleteMany({
      where: { venueId: id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove review" },
      { status: 500 },
    );
  }
}
