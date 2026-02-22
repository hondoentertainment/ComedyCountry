import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserComedianBadges, getUserBadgeForComedian } from "./badges";

vi.mock("./prisma", () => ({
  prisma: {
    eventReview: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as {
  eventReview: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserComedianBadges", () => {
    it("returns empty array when no reviews", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([]);

      const result = await getUserComedianBadges("user-1");

      expect(result).toEqual([]);
    });

    it("aggregates badges by comedian from reviews", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([
        {
          eventId: "e1",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Dave Chappelle",
                  slug: "dave-chappelle",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
        {
          eventId: "e2",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Dave Chappelle",
                  slug: "dave-chappelle",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
      ]);

      const result = await getUserComedianBadges("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        comedianId: "c1",
        comedianName: "Dave Chappelle",
        comedianSlug: "dave-chappelle",
        roundCount: 2,
        firstTime: true,
        multiRound: true,
        eventIds: expect.arrayContaining(["e1", "e2"]),
      });
    });

    it("sorts badges by roundCount descending", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([
        {
          eventId: "e1",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Comedian A",
                  slug: "comedian-a",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
        {
          eventId: "e2",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Comedian A",
                  slug: "comedian-a",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
        {
          eventId: "e3",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c2",
                  name: "Comedian B",
                  slug: "comedian-b",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
      ]);

      const result = await getUserComedianBadges("user-1");

      expect(result[0].roundCount).toBeGreaterThanOrEqual(result[1].roundCount);
      expect(result[0].comedianName).toBe("Comedian A");
      expect(result[1].comedianName).toBe("Comedian B");
    });
  });

  describe("getUserBadgeForComedian", () => {
    it("returns badge for specific comedian", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([
        {
          eventId: "e1",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Dave Chappelle",
                  slug: "dave-chappelle",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
      ]);

      const result = await getUserBadgeForComedian("user-1", "c1");

      expect(result).not.toBeNull();
      expect(result?.comedianId).toBe("c1");
    });

    it("returns null when user has no badge for comedian", async () => {
      mockPrisma.eventReview.findMany.mockResolvedValue([
        {
          eventId: "e1",
          event: {
            comedians: [
              {
                comedian: {
                  id: "c1",
                  name: "Dave Chappelle",
                  slug: "dave-chappelle",
                  headshotUrl: null,
                },
              },
            ],
          },
        },
      ]);

      const result = await getUserBadgeForComedian("user-1", "c2");

      expect(result).toBeNull();
    });
  });
});
