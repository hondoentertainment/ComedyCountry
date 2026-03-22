import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const rl = await checkRateLimit(`live-chat:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  try {
    const chat = await prisma.liveChat.findUnique({
      where: { eventId },
    });

    if (!chat) {
      return NextResponse.json({ messages: [], chatId: null });
    }

    const where: Record<string, unknown> = { chatId: chat.id };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const messages = await prisma.liveChatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({
      messages,
      chatId: chat.id,
      isActive: chat.isActive,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load chat messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const rl = await checkRateLimit(`live-chat:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { eventId } = await params;

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  try {
    // Upsert chat room for event
    const chat = await prisma.liveChat.upsert({
      where: { eventId },
      create: { eventId, isActive: true },
      update: {},
    });

    if (!chat.isActive) {
      return NextResponse.json(
        { error: "Chat is no longer active" },
        { status: 403 },
      );
    }

    const msg = await prisma.liveChatMessage.create({
      data: {
        chatId: chat.id,
        userId: session.user.id,
        message: body.message.trim(),
      },
    });

    return NextResponse.json(msg, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
