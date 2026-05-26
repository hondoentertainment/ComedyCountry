import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeAudienceProfile,
  cosineSimilarity,
  findSimilarAudiences,
  getAudienceGrowthTrend,
  getAudienceOverlap,
  getExpansionMarkets,
} from "./audience-analytics";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
    venue: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  event: {
    findMany: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
  };
  venue: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("audience analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes cosine similarity for identical and empty distributions", () => {
    expect(cosineSimilarity({ standup: 1 }, { standup: 1 })).toBe(1);
    expect(cosineSimilarity({}, {})).toBe(0);
  });

  it("returns an empty audience profile when a venue has no events", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const profile = await computeAudienceProfile("venue-1");

    expect(profile).toMatchObject({
      venueId: "venue-1",
      totalAttendees: 0,
      genreDistribution: {},
      locationDistribution: {},
      topComedians: [],
    });
  });

  it("computes an audience profile from ticket data", async () => {
    mockPrisma.event.findMany.mockResolvedValue([{ id: "evt-1" }, { id: "evt-2" }]);
    mockPrisma.ticket.findMany.mockResolvedValue([
      {
        userId: "user-1",
        purchasePrice: 25,
        event: {
          comedians: [{ comedian: { id: "com-1", name: "Alice" } }],
        },
      },
      {
        userId: "user-1",
        purchasePrice: 30,
        event: {
          comedians: [{ comedian: { id: "com-2", name: "Bob" } }],
        },
      },
      {
        userId: "user-2",
        purchasePrice: 20,
        event: {
          comedians: [{ comedian: { id: "com-1", name: "Alice" } }],
        },
      },
    ]);

    const profile = await computeAudienceProfile("venue-1");

    expect(profile.totalAttendees).toBe(2);
    expect(profile.avgVisitsPerMember).toBe(1.5);
    expect(profile.avgSpendPerMember).toBe(37.5);
    expect(profile.genreDistribution).toHaveProperty("Alice");
    expect(profile.topComedians[0]).toMatchObject({ name: "Alice", count: 2 });
  });

  it("finds similar audiences across venues", async () => {
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId: string } }) => {
      if (where.venueId === "venue-1") {
        return [{ id: "evt-1" }];
      }

      if (where.venueId === "venue-2") {
        return [{ id: "evt-2" }];
      }

      return [];
    });
    mockPrisma.venue.findMany.mockResolvedValue([{ id: "venue-2", name: "Laugh Factory" }]);
    mockPrisma.ticket.findMany.mockImplementation(
      ({ where }: { where: { eventId: { in: string[] } } }) => {
        if (where.eventId.in.includes("evt-1")) {
          return [
            {
              userId: "user-1",
              purchasePrice: 25,
              event: {
                comedians: [{ comedian: { id: "com-1", name: "Alice" } }],
              },
            },
          ];
        }

        if (where.eventId.in.includes("evt-2")) {
          return [
            {
              userId: "user-2",
              purchasePrice: 20,
              event: {
                comedians: [{ comedian: { id: "com-1", name: "Alice" } }],
              },
            },
          ];
        }

        return [];
      }
    );

    const results = await findSimilarAudiences("venue-1");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      venueId: "venue-2",
      venueName: "Laugh Factory",
    });
    expect(results[0].similarityScore).toBeGreaterThan(0);
    expect(results[0].sharedGenres).toContain("Alice");
  });

  it("computes audience overlap between venues", async () => {
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId: string } }) => {
      if (where.venueId === "venue-a") {
        return [{ id: "evt-a1" }];
      }

      if (where.venueId === "venue-b") {
        return [{ id: "evt-b1" }];
      }

      return [];
    });
    mockPrisma.ticket.findMany.mockImplementation(
      ({ where }: { where: { eventId: { in: string[] } } }) => {
        if (where.eventId.in.includes("evt-a1")) {
          return [{ userId: "user-1" }, { userId: "user-2" }, { userId: "user-3" }];
        }

        if (where.eventId.in.includes("evt-b1")) {
          return [{ userId: "user-2" }, { userId: "user-3" }, { userId: "user-4" }];
        }

        return [];
      }
    );

    const result = await getAudienceOverlap("venue-a", "venue-b");

    expect(result).toEqual({
      overlapCount: 2,
      overlapPercentage: 50,
      uniqueToA: 1,
      uniqueToB: 1,
      totalCombined: 4,
    });
  });

  it("builds a non-decreasing growth trend", async () => {
    mockPrisma.event.findMany.mockResolvedValue([{ id: "evt-1" }]);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10);

    mockPrisma.ticket.findMany.mockResolvedValue([
      { userId: "user-1", createdAt: twoMonthsAgo },
      { userId: "user-2", createdAt: twoMonthsAgo },
      { userId: "user-3", createdAt: lastMonth },
    ]);

    const result = await getAudienceGrowthTrend("venue-1", 3);

    expect(result).toHaveLength(4);
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i].totalAttendees).toBeGreaterThanOrEqual(result[i - 1].totalAttendees);
    }
  });

  it("returns no expansion markets when the source venue has no attendees", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    await expect(getExpansionMarkets("venue-1")).resolves.toEqual([]);
  });
});
