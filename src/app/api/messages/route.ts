import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, parseBody, badRequest, serverError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import {
  getConversations,
  sendDirectMessage,
  getUnreadCount,
  getCreatorInbox,
  searchMessages,
} from "@/lib/direct-messages";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    switch (action) {
      case "inbox": {
        const conversations = await getConversations(session!.user!.id, limit, cursor);
        return NextResponse.json({ conversations });
      }

      case "unread": {
        const count = await getUnreadCount(session!.user!.id);
        return NextResponse.json({ unreadCount: count });
      }

      case "creator-inbox": {
        const inbox = await getCreatorInbox(session!.user!.id, limit);
        return NextResponse.json(inbox);
      }

      case "search": {
        const query = searchParams.get("q");
        if (!query) return badRequest("q parameter required for search");
        const results = await searchMessages(session!.user!.id, query, limit);
        return NextResponse.json({ messages: results });
      }

      default: {
        const conversations = await getConversations(session!.user!.id, limit, cursor);
        return NextResponse.json({ conversations });
      }
    }
  } catch (err) {
    logger.error("Failed to get messages", {}, err instanceof Error ? err : undefined);
    return serverError();
  }
}

const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { data, error: valErr } = await parseBody(request, sendMessageSchema);
  if (valErr) return valErr;

  try {
    if (data.recipientId === session!.user!.id) {
      return badRequest("Cannot send a message to yourself");
    }

    const message = await sendDirectMessage(session!.user!.id, data.recipientId, data.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    logger.error("Failed to send message", {}, err instanceof Error ? err : undefined);
    const msg = err instanceof Error ? err.message : "Failed to send message";
    return badRequest(msg);
  }
}
