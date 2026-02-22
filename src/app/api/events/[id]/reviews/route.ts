import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventReviews, getEventRatingStats } from "@/lib/event-reviews";

// GET: List reviews and rating stats for an event
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const url = new URL(_request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const take = 10;
  const skip = (page - 1) * take;

  try {
    const [stats, { reviews, total }] = await Promise.all([
      getEventRatingStats(eventId),
      getEventReviews(eventId, take, skip),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      pages: Math.ceil(total / take),
      ...stats,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

// POST: Create or update current user's review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let body: { rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rating = typeof body.rating === "number" ? body.rating : undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim() || null : undefined;

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }

  if (rating === undefined && comment === undefined) {
    return NextResponse.json(
      { error: "Provide rating and/or comment" },
      { status: 400 }
    );
  }

  try {
    const review = await prisma.eventReview.upsert({
      where: {
        eventId_userId: { eventId, userId: session.user.id },
      },
      create: {
        eventId,
        userId: session.user.id,
        rating: rating ?? 3,
        comment: comment ?? null,
      },
      update: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        user: {
          select: { name: true, profileName: true, image: true },
        },
      },
    });

    return NextResponse.json(review);
  } catch {
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
