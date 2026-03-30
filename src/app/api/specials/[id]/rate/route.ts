import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`specials-rate:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;
  const session = await getServerSession(authOptions);

  const [stats, userRating] = await Promise.all([
    prisma.specialRating.aggregate({
      where: { specialId: id },
      _avg: { rating: true },
      _count: true,
    }),
    session?.user?.id
      ? prisma.specialRating.findUnique({
          where: {
            specialId_userId: { specialId: id, userId: session.user.id },
          },
        })
      : null,
  ]);

  return NextResponse.json({
    avgRating: stats._avg.rating,
    count: stats._count,
    userRating: userRating?.rating ?? null,
    userComment: userRating?.comment ?? null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`specials-rate:${getRateLimitKey(request)}`, {
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

  const { id } = await params;
  const body = await request.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const trimmedComment =
    typeof comment === "string" ? comment.trim() || null : undefined;

  const result = await prisma.specialRating.upsert({
    where: { specialId_userId: { specialId: id, userId: session.user.id } },
    update: {
      rating,
      ...(trimmedComment !== undefined && { comment: trimmedComment }),
    },
    create: {
      specialId: id,
      userId: session.user.id,
      rating,
      comment: trimmedComment ?? null,
    },
  });

  return NextResponse.json(result);
}

// DELETE: Remove current user's special rating
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`specials-rate:${getRateLimitKey(request)}`, {
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

  const { id } = await params;

  try {
    await prisma.specialRating.deleteMany({
      where: { specialId: id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove rating" },
      { status: 500 },
    );
  }
}
