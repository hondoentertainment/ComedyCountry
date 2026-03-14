import { prisma } from "./prisma";

/**
 * Phase 17: Offline Content Caching
 */

const VALID_CONTENT_TYPES = ["ticket", "venue", "event", "comedian"] as const;
export type CacheContentType = (typeof VALID_CONTENT_TYPES)[number];

/* ─── Cache content for offline access ──────────────────────────────── */

export async function cacheContent(
  userId: string,
  contentType: string,
  contentId: string,
  data: object,
  ttlHours: number = 24,
) {
  if (!VALID_CONTENT_TYPES.includes(contentType as CacheContentType)) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  if (ttlHours <= 0) {
    throw new Error("TTL must be a positive number");
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  return prisma.cachedContent.upsert({
    where: {
      userId_contentType_contentId: {
        userId,
        contentType,
        contentId,
      },
    },
    update: {
      data: data as any,
      expiresAt,
      version: { increment: 1 },
    },
    create: {
      userId,
      contentType,
      contentId,
      data: data as any,
      expiresAt,
      version: 1,
    },
  });
}

/* ─── Retrieve a cached item ────────────────────────────────────────── */

export async function getCachedContent(
  userId: string,
  contentType: string,
  contentId: string,
) {
  const cached = await prisma.cachedContent.findUnique({
    where: {
      userId_contentType_contentId: {
        userId,
        contentType,
        contentId,
      },
    },
  });

  if (!cached) {
    return null;
  }

  // Check if expired
  if (cached.expiresAt < new Date()) {
    return null;
  }

  return cached;
}

/* ─── List all cached items for a user ──────────────────────────────── */

export async function getUserCachedItems(userId: string) {
  return prisma.cachedContent.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/* ─── Refresh items that are expiring soon ──────────────────────────── */

export async function refreshCache(userId: string) {
  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

  // Find items expiring within the next hour
  const expiringItems = await prisma.cachedContent.findMany({
    where: {
      userId,
      expiresAt: { lte: oneHourFromNow },
    },
  });

  // Extend their TTL by 24 hours
  const newExpiry = new Date();
  newExpiry.setHours(newExpiry.getHours() + 24);

  const refreshed = [];
  for (const item of expiringItems) {
    const updated = await prisma.cachedContent.update({
      where: { id: item.id },
      data: {
        expiresAt: newExpiry,
        version: { increment: 1 },
      },
    });
    refreshed.push(updated);
  }

  return { refreshedCount: refreshed.length, items: refreshed };
}

/* ─── Purge all expired cache entries ───────────────────────────────── */

export async function purgeExpiredCache() {
  const result = await prisma.cachedContent.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return { purgedCount: result.count };
}

/* ─── Get cache stats for a user ────────────────────────────────────── */

export async function getCacheStats(userId: string) {
  const items = await prisma.cachedContent.findMany({
    where: { userId },
    select: { contentType: true, expiresAt: true, data: true },
  });

  const now = new Date();
  const activeItems = items.filter((i) => i.expiresAt > now);
  const expiredItems = items.filter((i) => i.expiresAt <= now);

  // Count by type
  const byType: Record<string, number> = {};
  for (const item of activeItems) {
    byType[item.contentType] = (byType[item.contentType] || 0) + 1;
  }

  // Estimate total size (rough JSON size)
  const totalSizeBytes = items.reduce((sum, item) => {
    return sum + JSON.stringify(item.data).length;
  }, 0);

  return {
    totalItems: items.length,
    activeItems: activeItems.length,
    expiredItems: expiredItems.length,
    byType,
    estimatedSizeBytes: totalSizeBytes,
  };
}
