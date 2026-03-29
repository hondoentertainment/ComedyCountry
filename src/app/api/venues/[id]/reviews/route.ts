import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { checkAndAwardBadges } from "@/lib/badges.achievement";

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
  const take = 10;
  const skip = (page - 1) * take;

  const [reviews, total, stats] = await Promise.all([
    prisma.venueReview.findMany({
      where: { venueId: id },
      include: {
        user: { select: { profileName: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
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
