import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/badges.achievement";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`follow-comedian:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
    return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
  }

  const existing = await prisma.comedianFollow.findUnique({
    where: {
      userId_comedianId: { userId: session.user.id, comedianId },
    },
  });

  if (existing) {
    await prisma.comedianFollow.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ following: false });
  }

  await prisma.comedianFollow.create({
    data: {
      userId: session.user.id,
      comedianId,
    },
  });
  checkAndAwardBadges(session.user.id, "follow_comedian").catch(() => {});
  return NextResponse.json({ following: true });
}
