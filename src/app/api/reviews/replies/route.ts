import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/content-moderation";

// GET: Get replies for a review
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `review-replies:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const reviewType = searchParams.get("reviewType");
  const reviewId = searchParams.get("reviewId");

  if (!reviewType || !reviewId) {
    return NextResponse.json(
      { error: "Missing reviewType or reviewId" },
      { status: 400 },
    );
  }

  const replies = (await (prisma as any).reviewReply.findMany({
    where: { reviewType, reviewId },
    orderBy: { createdAt: "asc" },
  })) as Array<{
    id: string;
    reviewType: string;
    reviewId: string;
    userId: string;
    comment: string;
    createdAt: Date;
  }>;

  // Fetch user info for replies
  const userIds = replies.map((r: { userId: string }) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      profileName: true,
      image: true,
      role: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    replies: replies.map(
      (r: {
        id: string;
        userId: string;
        comment: string;
        createdAt: Date;
      }) => ({
        ...r,
        user: userMap.get(r.userId) ?? null,
      }),
    ),
  });
}

// POST: Create a reply to a review (creators/admins only)
export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `review-replies:${getRateLimitKey(request)}`,
    { limit: 30, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reviewType?: string; reviewId?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reviewType, reviewId, comment } = body;
  if (!reviewType || !reviewId || !comment?.trim()) {
    return NextResponse.json(
      { error: "reviewType, reviewId, and comment are required" },
      { status: 400 },
    );
  }

  if (!["event_review", "venue_review"].includes(reviewType)) {
    return NextResponse.json({ error: "Invalid reviewType" }, { status: 400 });
  }

  // Verify the user is a creator (admin or claimed comedian/venue owner)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // Check if user is admin or has a claimed comedian/venue
  const hasClaimedEntity = await (prisma as any).comedianClaim.findFirst({
    where: { userId: session.user.id, status: "APPROVED" },
  });

  if (user?.role !== "admin" && !hasClaimedEntity) {
    return NextResponse.json(
      { error: "Only creators and admins can reply to reviews" },
      { status: 403 },
    );
  }

  // Moderate the reply
  try {
    const modResult = await moderateContent({
      text: comment.trim(),
      userId: session.user.id,
      contentType: "review_reply",
      contentId: reviewId,
    });
    if (!modResult.allowed) {
      return NextResponse.json(
        { error: "Reply rejected by content moderation" },
        { status: 422 },
      );
    }
  } catch {
    // Moderation failure should not block replies
  }

  try {
    const reply = await (prisma as any).reviewReply.upsert({
      where: {
        reviewType_reviewId_userId: {
          reviewType,
          reviewId,
          userId: session.user.id,
        },
      },
      create: {
        reviewType,
        reviewId,
        userId: session.user.id,
        comment: comment.trim(),
      },
      update: {
        comment: comment.trim(),
      },
    });

    return NextResponse.json(reply);
  } catch {
    return NextResponse.json(
      { error: "Failed to save reply" },
      { status: 500 },
    );
  }
}
