import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getEventReviewsSorted,
  getEventRatingStats,
} from "@/lib/event-reviews";
import { checkAndAwardBadges } from "@/lib/badges.achievement";
import {
  hasVerifiedAttendance,
  normalizeExperienceInput,
  upsertEventExperienceFeedback,
  type EventExperienceInput,
} from "@/lib/live-reputation";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/content-moderation";

// GET: List reviews and rating stats for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const sortParam = url.searchParams.get("sort") as
    | "recent"
    | "helpful"
    | "rating_high"
    | "rating_low"
    | null;
  const sort =
    sortParam &&
    ["recent", "helpful", "rating_high", "rating_low"].includes(sortParam)
      ? sortParam
      : "recent";
  const take = 10;
  const skip = (page - 1) * take;

  try {
    const [stats, { reviews, total }] = await Promise.all([
      getEventRatingStats(eventId),
      getEventReviewsSorted(eventId, take, skip, sort),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      pages: Math.ceil(total / take),
      ...stats,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 },
    );
  }
}

// POST: Create or update current user's review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: {
    rating?: number;
    comment?: string;
    experience?: EventExperienceInput;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rating = typeof body.rating === "number" ? body.rating : undefined;
  const comment =
    typeof body.comment === "string" ? body.comment.trim() || null : undefined;
  const experience = normalizeExperienceInput(body.experience);

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 },
    );
  }

  if (rating === undefined && comment === undefined && !experience) {
    return NextResponse.json(
      { error: "Provide rating, comment, or crowd feedback" },
      { status: 400 },
    );
  }

  // Moderate comment text if provided
  if (comment) {
    try {
      const modResult = await moderateContent({
        text: comment,
        userId: session.user.id,
        contentType: "event_review",
        contentId: eventId,
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

  try {
    const verifiedAttendance = await hasVerifiedAttendance(
      eventId,
      session.user.id,
    );
    const review = await prisma.eventReview.upsert({
      where: {
        eventId_userId: { eventId, userId: session.user.id },
      },
      create: {
        eventId,
        userId: session.user.id,
        rating: rating ?? 3,
        comment: comment ?? null,
        verifiedAttendance,
      },
      update: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
        verifiedAttendance,
      },
      include: {
        user: {
          select: { name: true, profileName: true, image: true },
        },
      },
    });

    if (experience) {
      await upsertEventExperienceFeedback(eventId, session.user.id, experience);
    }

    checkAndAwardBadges(session.user.id, "review_event").catch(() => {});
    return NextResponse.json(review);
  } catch {
    return NextResponse.json(
      { error: "Failed to save review" },
      { status: 500 },
    );
  }
}

// DELETE: Remove current user's review
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `events-reviews:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  try {
    await prisma.eventReview.deleteMany({
      where: { eventId, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove review" },
      { status: 500 },
    );
  }
}
