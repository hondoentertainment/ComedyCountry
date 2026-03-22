import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser, getFanTipLeaderboard, createFanTip } from "@/lib/creator";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-tips:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  // Only the comedian owner can view all tips
  const comedian = await getComedianForUser(session.user.id);
  if (!comedian || comedian.id !== comedianId) {
    // Non-owners get the leaderboard
    try {
      const leaderboard = await getFanTipLeaderboard(comedianId);
      return NextResponse.json(leaderboard);
    } catch {
      return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 });
    }
  }

  try {
    const tips = await prisma.fanTip.findMany({
      where: { comedianId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(tips);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-tips:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comedianId, amount, giftType, message } = body;

    if (!comedianId || !amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "comedianId and a positive amount are required" }, { status: 400 });
    }

    const comedian = await prisma.comedian.findUnique({ where: { id: comedianId } });
    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    const tip = await createFanTip(comedianId, session.user.id, amount, giftType, message);
    return NextResponse.json(tip, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to send tip" }, { status: 500 });
  }
}
