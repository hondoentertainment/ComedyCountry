import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(`specials-rate:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
            where: { specialId_userId: { specialId: id, userId: session.user.id } },
          })
        : null,
    ]);

    return NextResponse.json({
      avgRating: stats._avg.rating,
      count: stats._count,
      userRating: userRating?.rating ?? null,
    });
  } catch (err) {
    logger.requestError(request, "Failed to get special ratings", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(`specials-rate:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const result = await prisma.specialRating.upsert({
      where: { specialId_userId: { specialId: id, userId: session.user.id } },
      update: { rating },
      create: { specialId: id, userId: session.user.id, rating },
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.requestError(request, "Failed to rate special", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
