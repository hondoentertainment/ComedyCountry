import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// GET: Get refund policy for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-refund-policy:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: eventId } = await params;

  try {
    const policy = await prisma.refundPolicy.findUnique({
      where: { eventId },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "No refund policy for this event" },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch {
    return NextResponse.json(
      { error: "Failed to load refund policy" },
      { status: 500 }
    );
  }
}

// POST: Set refund policy (venue owner only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-refund-policy:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Verify user owns the venue for this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const claim = await prisma.venueClaim.findFirst({
      where: {
        venueId: event.venueId,
        userId: session.user.id,
        status: "APPROVED",
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Only venue owners can set refund policy" },
        { status: 403 }
      );
    }

    let body: {
      refundDeadline?: string;
      refundPercent?: number;
      description?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { refundDeadline, refundPercent, description } = body;

    if (!refundDeadline) {
      return NextResponse.json(
        { error: "refundDeadline is required" },
        { status: 400 }
      );
    }

    const policy = await prisma.refundPolicy.upsert({
      where: { eventId },
      create: {
        eventId,
        refundDeadline: new Date(refundDeadline),
        refundPercent: refundPercent ?? 100,
        description: description || null,
      },
      update: {
        refundDeadline: new Date(refundDeadline),
        refundPercent: refundPercent ?? 100,
        description: description || null,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to set refund policy" },
      { status: 500 }
    );
  }
}
