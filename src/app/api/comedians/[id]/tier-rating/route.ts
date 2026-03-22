import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const VALID_TIERS = ["S", "A", "B", "C", "D", "F"] as const;

// GET: Current user's tier rating for this comedian
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`comedians-tier-rating:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: comedianId } = await params;
  if (!comedianId) {
    return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
  }

  try {
    const rating = await prisma.comedianTierRating.findUnique({
      where: {
        userId_comedianId: {
          userId: session.user.id,
          comedianId,
        },
      },
    });
    return NextResponse.json(rating ? { tier: rating.tier } : { tier: null });
  } catch {
    return NextResponse.json(
      { error: "Failed to load rating" },
      { status: 500 }
    );
  }
}

// POST: Create or update current user's tier rating
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`comedians-tier-rating:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: comedianId } = await params;
  if (!comedianId) {
    return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
  }

  const comedian = await prisma.comedian.findUnique({
    where: { id: comedianId },
  });
  if (!comedian) {
    return NextResponse.json(
      { error: "Comedian not found" },
      { status: 404 }
    );
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = typeof body.tier === "string" ? body.tier.toUpperCase() : undefined;
  if (!tier || !VALID_TIERS.includes(tier as (typeof VALID_TIERS)[number])) {
    return NextResponse.json(
      { error: "Tier must be one of: S, A, B, C, D, F" },
      { status: 400 }
    );
  }

  try {
    await prisma.comedianTierRating.upsert({
      where: {
        userId_comedianId: {
          userId: session.user.id,
          comedianId,
        },
      },
      create: {
        userId: session.user.id,
        comedianId,
        tier,
      },
      update: { tier },
    });
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

// DELETE: Remove current user's tier rating
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`comedians-tier-rating:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: comedianId } = await params;
  if (!comedianId) {
    return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
  }

  try {
    await prisma.comedianTierRating.deleteMany({
      where: {
        userId: session.user.id,
        comedianId,
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove rating" },
      { status: 500 }
    );
  }
}
