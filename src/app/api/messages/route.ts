import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConversations,
  sendDirectMessage,
  getUnreadCount,
  getCreatorInbox,
  searchMessages,
} from "@/lib/direct-messages";

/**
 * Direct Messages API — inbox, send, search
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    switch (action) {
      case "inbox": {
        const conversations = await getConversations(
          session.user.id,
          limit,
          cursor
        );
        return NextResponse.json({ conversations });
      }

      case "unread": {
        const count = await getUnreadCount(session.user.id);
        return NextResponse.json({ unreadCount: count });
      }

      case "creator-inbox": {
        const inbox = await getCreatorInbox(session.user.id, limit);
        return NextResponse.json(inbox);
      }

      case "search": {
        const query = searchParams.get("q");
        if (!query) {
          return NextResponse.json(
            { error: "q parameter required for search" },
            { status: 400 }
          );
        }
        const results = await searchMessages(session.user.id, query, limit);
        return NextResponse.json({ messages: results });
      }

      default: {
        const conversations = await getConversations(
          session.user.id,
          limit,
          cursor
        );
        return NextResponse.json({ conversations });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recipientId, content } = body;

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: "recipientId and content are required" },
        { status: 400 }
      );
    }

    const message = await sendDirectMessage(
      session.user.id,
      recipientId,
      content
    );
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
