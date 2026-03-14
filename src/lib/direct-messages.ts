import { prisma } from "./prisma";

/**
 * Direct Messaging System — private one-on-one messaging between
 * fans and creators. Supports conversations, read receipts,
 * and creator inbox management.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isCreatorConversation: boolean;
}

// ── Conversations ────────────────────────────────────────────────────────────

/**
 * Get or create a conversation between two users.
 * Conversations are symmetric — (A, B) and (B, A) map to the same record.
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
) {
  if (userId1 === userId2) {
    throw new Error("Cannot create a conversation with yourself");
  }

  // Normalize ordering so we always find the same record
  const [participantA, participantB] =
    userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const existing = await prisma.directConversation.findUnique({
    where: {
      participantAId_participantBId: {
        participantAId: participantA,
        participantBId: participantB,
      },
    },
  });

  if (existing) return existing;

  return prisma.directConversation.create({
    data: {
      participantAId: participantA,
      participantBId: participantB,
    },
  });
}

/**
 * Get all conversations for a user, ordered by most recent message.
 */
export async function getConversations(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<ConversationSummary[]> {
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [
        { participantAId: userId },
        { participantBId: userId },
      ],
      ...(cursor ? { lastMessageAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    include: {
      participantA: { select: { id: true, name: true, image: true } },
      participantB: { select: { id: true, name: true, image: true } },
    },
  });

  // Build summaries with unread counts
  const summaries: ConversationSummary[] = [];

  for (const conv of conversations) {
    const isA = conv.participantAId === userId;
    const otherUser = isA ? conv.participantB : conv.participantA;

    // Get unread count
    const unreadCount = await prisma.directMessage.count({
      where: {
        conversationId: conv.id,
        senderId: { not: userId },
        readAt: null,
      },
    });

    // Get last message
    const lastMsg = await prisma.directMessage.findFirst({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true },
    });

    // Check if other user is a comedian (creator)
    const isCreator = await prisma.comedianClaim.findFirst({
      where: { userId: otherUser.id, status: "APPROVED" },
    });

    summaries.push({
      id: conv.id,
      otherUserId: otherUser.id,
      otherUserName: otherUser.name ?? "Unknown",
      otherUserImage: otherUser.image,
      lastMessage: lastMsg?.content ?? "",
      lastMessageAt: lastMsg?.createdAt ?? conv.createdAt,
      unreadCount,
      isCreatorConversation: !!isCreator,
    });
  }

  return summaries;
}

// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * Send a direct message in a conversation.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  if (!content.trim()) {
    throw new Error("Message cannot be empty");
  }

  if (content.length > 5000) {
    throw new Error("Message too long (max 5000 characters)");
  }

  // Verify sender is a participant
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (
    conversation.participantAId !== senderId &&
    conversation.participantBId !== senderId
  ) {
    throw new Error("Not a participant in this conversation");
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId,
      content: content.trim(),
    },
  });

  // Update conversation's lastMessageAt
  await prisma.directConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return message;
}

/**
 * Send a DM to a user — creates conversation if needed.
 */
export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  content: string
) {
  const conversation = await getOrCreateConversation(senderId, recipientId);
  return sendMessage(conversation.id, senderId, content);
}

/**
 * Get messages in a conversation (paginated, newest first).
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  // Verify user is a participant
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (
    conversation.participantAId !== userId &&
    conversation.participantBId !== userId
  ) {
    throw new Error("Not a participant in this conversation");
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return messages;
}

// ── Read Receipts ────────────────────────────────────────────────────────────

/**
 * Mark all messages in a conversation as read for a user.
 */
export async function markConversationRead(
  conversationId: string,
  userId: string
) {
  const updated = await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return { markedRead: updated.count };
}

// ── Unread Counts ────────────────────────────────────────────────────────────

/**
 * Get total unread message count across all conversations.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  // Find all conversations for this user
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    },
    select: { id: true },
  });

  const convIds = conversations.map((c) => c.id);
  if (convIds.length === 0) return 0;

  return prisma.directMessage.count({
    where: {
      conversationId: { in: convIds },
      senderId: { not: userId },
      readAt: null,
    },
  });
}

// ── Creator Inbox ────────────────────────────────────────────────────────────

/**
 * Get creator inbox — all fan conversations for a comedian.
 * Requires the user to have an approved comedian claim.
 */
export async function getCreatorInbox(
  userId: string,
  limit = 20
): Promise<{
  conversations: ConversationSummary[];
  totalUnread: number;
  totalConversations: number;
}> {
  const conversations = await getConversations(userId, limit);
  const totalUnread = await getUnreadCount(userId);

  const totalConversations = await prisma.directConversation.count({
    where: {
      OR: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    },
  });

  return {
    conversations,
    totalUnread,
    totalConversations,
  };
}

// ── Message Search ───────────────────────────────────────────────────────────

/**
 * Search messages across all conversations for a user.
 */
export async function searchMessages(
  userId: string,
  query: string,
  limit = 20
) {
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    },
    select: { id: true },
  });

  const convIds = conversations.map((c) => c.id);
  if (convIds.length === 0) return [];

  return prisma.directMessage.findMany({
    where: {
      conversationId: { in: convIds },
      content: { contains: query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });
}
