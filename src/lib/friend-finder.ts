import { prisma } from "./prisma";
import crypto from "crypto";

/**
 * Phase 9.10: Friend Finder & Contacts Sync
 *
 * Search users, generate invite links, and import contacts
 * to find friends on the platform.
 */

/** Search users by username or name (partial match) */
export async function searchUsers(
  query: string,
  options?: { limit?: number; excludeUserId?: string }
) {
  const limit = options?.limit ?? 20;

  if (!query || query.trim().length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  const trimmed = query.trim();

  const users = await prisma.user.findMany({
    where: {
      AND: [
        options?.excludeUserId ? { id: { not: options.excludeUserId } } : {},
        {
          OR: [
            { username: { contains: trimmed, mode: "insensitive" } },
            { name: { contains: trimmed, mode: "insensitive" } },
            { profileName: { contains: trimmed, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return users;
}

/** Look up a user by exact username */
export async function findByUsername(username: string) {
  if (!username) {
    throw new Error("Username is required");
  }

  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
    },
  });
}

/**
 * Generate a shareable invite link token.
 * The token is stored as a notification or can be used
 * to create a friend connection when redeemed.
 */
export async function generateInviteLink(userId: string): Promise<{
  token: string;
  url: string;
  expiresAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

  // Store the invite as a notification entry for tracking
  await prisma.notification.create({
    data: {
      userId,
      type: "friend_invite",
      title: "Invite link created",
      message: `Your invite link token: ${token}`,
      metadata: JSON.stringify({ token, expiresAt: expiresAt.toISOString() }),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://comedycountry.com";

  return {
    token,
    url: `${baseUrl}/invite/${token}`,
    expiresAt,
  };
}

/**
 * Import contacts by email addresses and find which ones are already on the platform.
 * Returns matched users and emails that aren't registered yet.
 */
export async function importContacts(
  userId: string,
  emails: string[]
): Promise<{
  found: Array<{
    id: string;
    name: string | null;
    profileName: string | null;
    username: string | null;
    image: string | null;
    email: string;
    alreadyFriends: boolean;
  }>;
  notFound: string[];
}> {
  if (!emails || emails.length === 0) {
    return { found: [], notFound: [] };
  }

  // Normalize and deduplicate emails
  const uniqueEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];

  // Find users with matching emails (exclude self)
  const matchedUsers = await prisma.user.findMany({
    where: {
      email: { in: uniqueEmails },
      id: { not: userId },
    },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
      email: true,
    },
  });

  // Check existing friend connections
  const matchedIds = matchedUsers.map((u) => u.id);
  const existingConnections =
    matchedIds.length > 0
      ? await prisma.friendConnection.findMany({
          where: {
            OR: [
              { userId, friendId: { in: matchedIds } },
              { userId: { in: matchedIds }, friendId: userId },
            ],
            status: { in: ["pending", "accepted"] },
          },
          select: { userId: true, friendId: true },
        })
      : [];

  const connectedIds = new Set<string>();
  for (const conn of existingConnections) {
    connectedIds.add(conn.userId === userId ? conn.friendId : conn.userId);
  }

  const matchedEmails = new Set(matchedUsers.map((u) => u.email?.toLowerCase()));

  const found = matchedUsers.map((u) => ({
    id: u.id,
    name: u.name,
    profileName: u.profileName,
    username: u.username,
    image: u.image,
    email: u.email!,
    alreadyFriends: connectedIds.has(u.id),
  }));

  const notFound = uniqueEmails.filter((e) => !matchedEmails.has(e));

  return { found, notFound };
}

/**
 * Get friend suggestions based on mutual friends and shared event attendance.
 */
export async function getFriendSuggestions(
  userId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 10;

  // Get current friends
  const connections = await prisma.friendConnection.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
      status: "accepted",
    },
    select: { userId: true, friendId: true },
  });

  const friendIds = connections.map((c) =>
    c.userId === userId ? c.friendId : c.userId
  );

  if (friendIds.length === 0) {
    // Fall back to users attending the same events
    const myAttendances = await prisma.eventAttendance.findMany({
      where: { userId, status: "going" },
      select: { eventId: true },
    });

    const eventIds = myAttendances.map((a) => a.eventId);
    if (eventIds.length === 0) return [];

    const coAttendees = await prisma.eventAttendance.findMany({
      where: {
        eventId: { in: eventIds },
        userId: { not: userId },
        status: "going",
      },
      select: { userId: true },
    });

    // Count how many events each co-attendee shares
    const countMap = new Map<string, number>();
    for (const a of coAttendees) {
      countMap.set(a.userId, (countMap.get(a.userId) ?? 0) + 1);
    }

    const topIds = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) return [];

    const users = await prisma.user.findMany({
      where: { id: { in: topIds } },
      select: {
        id: true,
        name: true,
        profileName: true,
        username: true,
        image: true,
      },
    });

    return users.map((u) => ({
      ...u,
      reason: "shared_events" as const,
      sharedCount: countMap.get(u.id) ?? 0,
    }));
  }

  // Find friends-of-friends
  const fofConnections = await prisma.friendConnection.findMany({
    where: {
      OR: [
        { userId: { in: friendIds } },
        { friendId: { in: friendIds } },
      ],
      status: "accepted",
    },
    select: { userId: true, friendId: true },
  });

  const excludeIds = new Set([userId, ...friendIds]);
  const fofCount = new Map<string, number>();

  for (const conn of fofConnections) {
    const otherId =
      friendIds.includes(conn.userId) ? conn.friendId : conn.userId;
    if (!excludeIds.has(otherId)) {
      fofCount.set(otherId, (fofCount.get(otherId) ?? 0) + 1);
    }
  }

  const topFofIds = [...fofCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topFofIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: topFofIds } },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
    },
  });

  return users.map((u) => ({
    ...u,
    reason: "mutual_friends" as const,
    sharedCount: fofCount.get(u.id) ?? 0,
  }));
}
