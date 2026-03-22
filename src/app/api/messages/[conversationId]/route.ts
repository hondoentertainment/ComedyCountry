import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/direct-messages";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const rl = await checkRateLimit(`messages:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const messages = await getMessages(
      params.conversationId,
      session.user.id,
      limit,
      cursor
    );

    // Auto-mark as read when fetched
    await markConversationRead(params.conversationId, session.user.id);

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get messages";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const rl = await checkRateLimit(`messages:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const message = await sendMessage(
      params.conversationId,
      session.user.id,
      content
    );
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const rl = await checkRateLimit(`messages:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await markConversationRead(
      params.conversationId,
      session.user.id
    );
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to mark as read";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
