import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`lists:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const featured = searchParams.get("featured") === "true";

  const where = userId
    ? { userId, ...(featured ? {} : {}) }
    : { isPublic: true };

  const lists = await prisma.comedyList.findMany({
    where,
    include: {
      user: { select: { profileName: true, name: true, username: true, image: true } },
      _count: { select: { items: true, saves: true } },
    },
    orderBy: featured ? { saves: { _count: "desc" } } : { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ lists });
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`lists:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, isPublic } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const list = await prisma.comedyList.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      isPublic: isPublic !== false,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
