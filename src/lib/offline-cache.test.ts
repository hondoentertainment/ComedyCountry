import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cacheContent,
  getCachedContent,
  getUserCachedItems,
  refreshCache,
  purgeExpiredCache,
  getCacheStats,
} from "./offline-cache";

vi.mock("./prisma", () => ({
  prisma: {
    cachedContent: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  cachedContent: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe("offline-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cacheContent", () => {
    it("caches content with default TTL", async () => {
      const cached = {
        id: "c1",
        userId: "u1",
        contentType: "event",
        contentId: "e1",
        data: { name: "Comedy Show" },
        version: 1,
      };
      mockPrisma.cachedContent.upsert.mockResolvedValue(cached);

      const result = await cacheContent("u1", "event", "e1", { name: "Comedy Show" });

      expect(result).toEqual(cached);
      expect(mockPrisma.cachedContent.upsert).toHaveBeenCalledWith({
        where: {
          userId_contentType_contentId: {
            userId: "u1",
            contentType: "event",
            contentId: "e1",
          },
        },
        update: expect.objectContaining({
          data: { name: "Comedy Show" },
          version: { increment: 1 },
        }),
        create: expect.objectContaining({
          userId: "u1",
          contentType: "event",
          contentId: "e1",
          data: { name: "Comedy Show" },
          version: 1,
        }),
      });
    });

    it("caches content with custom TTL", async () => {
      mockPrisma.cachedContent.upsert.mockResolvedValue({
        id: "c2",
        userId: "u1",
        contentType: "ticket",
        contentId: "t1",
      });

      await cacheContent("u1", "ticket", "t1", { seat: "A1" }, 48);

      const call = mockPrisma.cachedContent.upsert.mock.calls[0][0];
      const expiresAt = call.create.expiresAt as Date;
      // 48 hours from now, with some tolerance
      const expectedMin = new Date();
      expectedMin.setHours(expectedMin.getHours() + 47);
      expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
    });

    it("throws for invalid content type", async () => {
      await expect(
        cacheContent("u1", "invalid_type", "x1", {}),
      ).rejects.toThrow("Invalid content type: invalid_type");
    });

    it("throws for non-positive TTL", async () => {
      await expect(
        cacheContent("u1", "event", "e1", {}, 0),
      ).rejects.toThrow("TTL must be a positive number");
    });

    it("throws for negative TTL", async () => {
      await expect(
        cacheContent("u1", "event", "e1", {}, -5),
      ).rejects.toThrow("TTL must be a positive number");
    });

    it("accepts all valid content types", async () => {
      for (const type of ["ticket", "venue", "event", "comedian"]) {
        mockPrisma.cachedContent.upsert.mockResolvedValue({ id: `c-${type}`, contentType: type });
        const result = await cacheContent("u1", type, "id1", {});
        expect(result.contentType).toBe(type);
      }
    });
  });

  describe("getCachedContent", () => {
    it("returns cached content when not expired", async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);
      const cached = {
        id: "c1",
        userId: "u1",
        contentType: "event",
        contentId: "e1",
        data: { name: "Show" },
        expiresAt: futureDate,
      };
      mockPrisma.cachedContent.findUnique.mockResolvedValue(cached);

      const result = await getCachedContent("u1", "event", "e1");

      expect(result).toEqual(cached);
    });

    it("returns null when content not found", async () => {
      mockPrisma.cachedContent.findUnique.mockResolvedValue(null);

      const result = await getCachedContent("u1", "event", "nonexistent");

      expect(result).toBeNull();
    });

    it("returns null when content is expired", async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      mockPrisma.cachedContent.findUnique.mockResolvedValue({
        id: "c1",
        expiresAt: pastDate,
      });

      const result = await getCachedContent("u1", "event", "e1");

      expect(result).toBeNull();
    });
  });

  describe("getUserCachedItems", () => {
    it("returns all cached items for a user", async () => {
      const items = [
        { id: "c1", contentType: "event" },
        { id: "c2", contentType: "venue" },
      ];
      mockPrisma.cachedContent.findMany.mockResolvedValue(items);

      const result = await getUserCachedItems("u1");

      expect(result).toHaveLength(2);
      expect(mockPrisma.cachedContent.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("returns empty array for user with no cache", async () => {
      mockPrisma.cachedContent.findMany.mockResolvedValue([]);

      const result = await getUserCachedItems("u1");

      expect(result).toEqual([]);
    });
  });

  describe("refreshCache", () => {
    it("refreshes items expiring within the next hour", async () => {
      const soonExpiring = [
        { id: "c1", expiresAt: new Date() },
        { id: "c2", expiresAt: new Date() },
      ];
      mockPrisma.cachedContent.findMany.mockResolvedValue(soonExpiring);
      mockPrisma.cachedContent.update
        .mockResolvedValueOnce({ ...soonExpiring[0], version: 2 })
        .mockResolvedValueOnce({ ...soonExpiring[1], version: 2 });

      const result = await refreshCache("u1");

      expect(result.refreshedCount).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(mockPrisma.cachedContent.update).toHaveBeenCalledTimes(2);
    });

    it("returns zero when no items need refresh", async () => {
      mockPrisma.cachedContent.findMany.mockResolvedValue([]);

      const result = await refreshCache("u1");

      expect(result.refreshedCount).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe("purgeExpiredCache", () => {
    it("deletes expired entries and returns count", async () => {
      mockPrisma.cachedContent.deleteMany.mockResolvedValue({ count: 5 });

      const result = await purgeExpiredCache();

      expect(result.purgedCount).toBe(5);
      expect(mockPrisma.cachedContent.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it("returns zero when nothing to purge", async () => {
      mockPrisma.cachedContent.deleteMany.mockResolvedValue({ count: 0 });

      const result = await purgeExpiredCache();

      expect(result.purgedCount).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("calculates stats for a user with mixed items", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      const past = new Date(now.getTime() - 86400000);

      mockPrisma.cachedContent.findMany.mockResolvedValue([
        { contentType: "event", expiresAt: future, data: { name: "Show A" } },
        { contentType: "event", expiresAt: future, data: { name: "Show B" } },
        { contentType: "venue", expiresAt: future, data: { name: "Club" } },
        { contentType: "ticket", expiresAt: past, data: { seat: "A1" } },
      ]);

      const stats = await getCacheStats("u1");

      expect(stats.totalItems).toBe(4);
      expect(stats.activeItems).toBe(3);
      expect(stats.expiredItems).toBe(1);
      expect(stats.byType).toEqual({ event: 2, venue: 1 });
      expect(stats.estimatedSizeBytes).toBeGreaterThan(0);
    });

    it("returns empty stats for user with no cache", async () => {
      mockPrisma.cachedContent.findMany.mockResolvedValue([]);

      const stats = await getCacheStats("u1");

      expect(stats.totalItems).toBe(0);
      expect(stats.activeItems).toBe(0);
      expect(stats.expiredItems).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.estimatedSizeBytes).toBe(0);
    });
  });
});
