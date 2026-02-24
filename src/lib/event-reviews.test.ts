import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEventReviews,
  getEventRatingStats,
  getUserReview,
  getEventRatingStatsBatch,
} from "./event-reviews";

vi.mock("./prisma", () => ({
  prisma: {
    eventReview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as {
  eventReview: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
};

describe("event-reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEventReviews", () => {
    it("returns reviews and total", async () => {
      const mockReviews = [
        {
          id: "r1",
          eventId: "e1",
          userId: "u1",
          rating: 5,
          comment: "Great show",
          createdAt: new Date(),
          user: { name: "Alice", profileName: null, image: null },
        },
      ];
      mockPrisma.eventReview.findMany.mockResolvedValue(mockReviews);
      mockPrisma.eventReview.count.mockResolvedValue(1);

      const result = await getEventReviews("e1");

      expect(result).toEqual({ reviews: mockReviews, total: 1 });
      expect(mockPrisma.eventReview.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1" },
        take: 20,
        skip: 0,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, profileName: true, image: true },
          },
        },
      });
    });

    it("respects take and skip", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.eventReview.count.mockResolvedValue(100);

      await getEventReviews("e1", 10, 20);

      expect(mockPrisma.eventReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("getEventRatingStats", () => {
    it("returns count and rounded average", async () => {
      mockPrisma.eventReview.aggregate.mockResolvedValue({
        _count: 5,
        _avg: { rating: 4.333333 },
      });

      const result = await getEventRatingStats("e1");

      expect(result).toEqual({ count: 5, avgRating: 4.3 });
    });

    it("returns null avgRating when no reviews", async () => {
      mockPrisma.eventReview.aggregate.mockResolvedValue({
        _count: 0,
        _avg: { rating: null },
      });

      const result = await getEventRatingStats("e1");

      expect(result).toEqual({ count: 0, avgRating: null });
    });
  });

  describe("getUserReview", () => {
    it("returns user review when found", async () => {
      const mockReview = {
        id: "r1",
        eventId: "e1",
        userId: "u1",
        rating: 4,
        comment: "Good",
        user: { name: "Alice", profileName: null, image: null },
      };
      mockPrisma.eventReview.findUnique.mockResolvedValue(mockReview);

      const result = await getUserReview("e1", "u1");

      expect(result).toEqual(mockReview);
      expect(mockPrisma.eventReview.findUnique).toHaveBeenCalledWith({
        where: {
          eventId_userId: { eventId: "e1", userId: "u1" },
        },
        include: {
          user: {
            select: { name: true, profileName: true, image: true },
          },
        },
      });
    });

    it("returns null when not found", async () => {
      mockPrisma.eventReview.findUnique.mockResolvedValue(null);

      const result = await getUserReview("e1", "u1");

      expect(result).toBeNull();
    });
  });

  describe("getEventRatingStatsBatch", () => {
    it("returns empty map for empty eventIds", async () => {
      const result = await getEventRatingStatsBatch([]);

      expect(result).toEqual(new Map());
      expect(mockPrisma.eventReview.groupBy).not.toHaveBeenCalled();
    });

    it("returns map of stats per event", async () => {
      mockPrisma.eventReview.groupBy.mockResolvedValue([
        { eventId: "e1", _count: 3, _avg: { rating: 4.5 } },
        { eventId: "e2", _count: 0, _avg: { rating: null } },
      ]);

      const result = await getEventRatingStatsBatch(["e1", "e2"]);

      expect(result.size).toBe(2);
      expect(result.get("e1")).toEqual({ count: 3, avgRating: 4.5 });
      expect(result.get("e2")).toEqual({ count: 0, avgRating: null });
    });
  });
});
