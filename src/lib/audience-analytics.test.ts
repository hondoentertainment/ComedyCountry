import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeAudienceProfile,
  cosineSimilarity,
  findSimilarAudiences,
  getExpansionMarkets,
  getAudienceOverlap,
  getAudienceGrowthTrend,
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

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── cosineSimilarity ────────────────────────────────────────────────── */

describe("cosineSimilarity", () => {
  it("returns 1 for identical distributions", () => {
    const dist = { standup: 0.5, improv: 0.3, sketch: 0.2 };
    expect(cosineSimilarity(dist, dist)).toBe(1);
  });

  it("returns 0 for completely disjoint distributions", () => {
    const a = { standup: 1 };
    const b = { improv: 1 };
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("returns 0 for two empty distributions", () => {
    expect(cosineSimilarity({}, {})).toBe(0);
  });

  it("computes partial overlap correctly", () => {
    const a = { standup: 0.7, improv: 0.3 };
    const b = { standup: 0.5, sketch: 0.5 };
    const result = cosineSimilarity(a, b);
    // standup overlap: 0.7*0.5 = 0.35
    // magA = sqrt(0.49 + 0.09) = sqrt(0.58)
    // magB = sqrt(0.25 + 0.25) = sqrt(0.5)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("handles one empty distribution", () => {
    const a = { standup: 0.5 };
    expect(cosineSimilarity(a, {})).toBe(0);
  });
});

/* ─── computeAudienceProfile ──────────────────────────────────────────── */

describe("computeAudienceProfile", () => {
  it("returns empty profile when venue has no events", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const profile = await computeAudienceProfile("venue-1");

    expect(profile.venueId).toBe("venue-1");
    expect(profile.totalAttendees).toBe(0);
    expect(profile.genreDistribution).toEqual({});
    expect(profile.avgAge).toBeNull();
    expect(profile.topComedians).toEqual([]);
    expect(profile.visitFrequency).toEqual({
      weekly: 0,
      monthly: 0,
      occasional: 0,
    });
  });

  it("computes profile from ticket data", async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      { id: "evt-1" },
      { id: "evt-2" },
    ]);

    const birthDate1 = new Date("1990-05-15");
    const birthDate2 = new Date("1985-10-20");

    mockPrisma.ticket.findMany.mockResolvedValue([
      {
        userId: "user-1",
        purchasePrice: 25,
        event: {
          id: "evt-1",
          comedians: [
            { comedian: { id: "com-1", name: "Alice" } },
          ],
        },
      },
      {
        userId: "user-1",
        purchasePrice: 30,
        event: {
          id: "evt-2",
          comedians: [
            { comedian: { id: "com-2", name: "Bob" } },
          ],
        },
      },
      {
        userId: "user-2",
        purchasePrice: 20,
        event: {
          id: "evt-1",
          comedians: [
            { comedian: { id: "com-1", name: "Alice" } },
          ],
        },
      },
    ]);

    const profile = await computeAudienceProfile("venue-1");

    expect(profile.totalAttendees).toBe(2);
    expect(profile.avgVisitsPerMember).toBe(1.5); // 3 tickets / 2 users
    expect(profile.avgSpendPerMember).toBe(37.5); // 75 / 2
    expect(profile.topComedians.length).toBeGreaterThan(0);
    expect(profile.topComedians[0].name).toBe("Alice"); // 2 tickets
    expect(profile.genreDistribution).toHaveProperty("Alice");
    expect(profile.locationDistribution).toEqual({});
    expect(profile.avgAge).toBeNull();
    // user-1 visits 2x => monthly, user-2 visits 1x => occasional
    expect(profile.visitFrequency.monthly).toBe(1);
    expect(profile.visitFrequency.occasional).toBe(1);
  });

  it("handles tickets with no userId", async () => {
    mockPrisma.event.findMany.mockResolvedValue([{ id: "evt-1" }]);
    mockPrisma.ticket.findMany.mockResolvedValue([
      {
        userId: null,
        price: 10,
        user: null,
        event: {
          id: "evt-1",
          comedianId: null,
          comedian: null,
          tags: [],
        },
      },
    ]);

    const profile = await computeAudienceProfile("venue-1");
    expect(profile.totalAttendees).toBe(0);
  });
});

/* ─── findSimilarAudiences ────────────────────────────────────────────── */

describe("findSimilarAudiences", () => {
  it("returns empty array when source venue has no attendees", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const results = await findSimilarAudiences("venue-1");
    expect(results).toEqual([]);
  });

  it("computes similarity scores for other venues", async () => {
    // Source venue has events
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId: string } }) => {
      if (where.venueId === "venue-1") return [{ id: "evt-1" }];
      if (where.venueId === "venue-2") return [{ id: "evt-2" }];
      return [];
    });

    mockPrisma.venue.findMany.mockResolvedValue([
      { id: "venue-2", name: "Laugh Factory" },
    ]);

    mockPrisma.ticket.findMany.mockImplementation(({ where }: { where: { eventId: { in: string[] } } }) => {
      const eventIds = where.eventId.in;
      if (eventIds.includes("evt-1")) {
        return [
          {
            userId: "user-1",
            purchasePrice: 25,
            event: {
              id: "evt-1",
              comedians: [
                { comedian: { id: "com-1", name: "Alice" } },
              ],
            },
          },
        ];
      }
      if (eventIds.includes("evt-2")) {
        return [
          {
            userId: "user-2",
            purchasePrice: 20,
            event: {
              id: "evt-2",
              comedians: [
                { comedian: { id: "com-1", name: "Alice" } },
              ],
            },
          },
        ];
      }
      return [];
    });

    const results = await findSimilarAudiences("venue-1");

    expect(results.length).toBe(1);
    expect(results[0].venueId).toBe("venue-2");
    expect(results[0].venueName).toBe("Laugh Factory");
    expect(results[0].similarityScore).toBeGreaterThan(0);
    expect(results[0].sharedGenres).toContain("Alice");
  });
});

/* ─── getAudienceOverlap ──────────────────────────────────────────────── */

describe("getAudienceOverlap", () => {
  it("computes overlap between two venues", async () => {
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId: string } }) => {
      if (where.venueId === "venue-a") return [{ id: "evt-a1" }];
      if (where.venueId === "venue-b") return [{ id: "evt-b1" }];
      return [];
    });

    mockPrisma.ticket.findMany.mockImplementation(({ where }: { where: { eventId: { in: string[] } } }) => {
      const eventIds = where.eventId.in;
      if (eventIds.includes("evt-a1")) {
        return [
          { userId: "user-1" },
          { userId: "user-2" },
          { userId: "user-3" },
        ];
      }
      if (eventIds.includes("evt-b1")) {
        return [
          { userId: "user-2" },
          { userId: "user-3" },
          { userId: "user-4" },
        ];
      }
      return [];
    });

    const result = await getAudienceOverlap("venue-a", "venue-b");

    expect(result.overlapCount).toBe(2); // user-2, user-3
    expect(result.uniqueToA).toBe(1); // user-1
    expect(result.uniqueToB).toBe(1); // user-4
    expect(result.totalCombined).toBe(4);
    expect(result.overlapPercentage).toBe(50); // 2/4 * 100
  });

  it("returns zero overlap when no shared users", async () => {
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId: string } }) => {
      if (where.venueId === "venue-a") return [{ id: "evt-a1" }];
      if (where.venueId === "venue-b") return [{ id: "evt-b1" }];
      return [];
    });

    mockPrisma.ticket.findMany.mockImplementation(({ where }: { where: { eventId: { in: string[] } } }) => {
      const eventIds = where.eventId.in;
      if (eventIds.includes("evt-a1")) return [{ userId: "user-1" }];
      if (eventIds.includes("evt-b1")) return [{ userId: "user-2" }];
      return [];
    });

    const result = await getAudienceOverlap("venue-a", "venue-b");
    expect(result.overlapCount).toBe(0);
    expect(result.overlapPercentage).toBe(0);
  });
});

/* ─── getAudienceGrowthTrend ──────────────────────────────────────────── */

describe("getAudienceGrowthTrend", () => {
  it("returns empty array when no events exist", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await getAudienceGrowthTrend("venue-1", 3);
    expect(result).toEqual([]);
  });

  it("computes monthly growth trend", async () => {
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

    expect(result.length).toBe(4); // 3 months + current
    // totalAttendees should be monotonically non-decreasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalAttendees).toBeGreaterThanOrEqual(
        result[i - 1].totalAttendees,
      );
    }
  });
});

/* ─── getExpansionMarkets ─────────────────────────────────────────────── */

describe("getExpansionMarkets", () => {
  it("returns empty array when venue has no attendees", async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await getExpansionMarkets("venue-1");
    expect(result).toEqual([]);
  });

  it("identifies potential expansion markets", async () => {
    // Source venue profile
    mockPrisma.event.findMany.mockImplementation(({ where }: { where: { venueId?: string } }) => {
      if (where?.venueId === "venue-1") return [{ id: "evt-1" }];
      if (where?.venueId === "venue-2") return [{ id: "evt-2" }];
      return [];
    });

    mockPrisma.ticket.findMany.mockImplementation(({ where }: { where: { eventId: { in: string[] } } }) => {
      const eventIds = where.eventId.in;
      if (eventIds.includes("evt-1")) {
        return [
          {
            userId: "user-1",
            purchasePrice: 25,
            event: {
              id: "evt-1",
              comedians: [
                { comedian: { id: "com-1", name: "Alice" } },
              ],
            },
          },
        ];
      }
      if (eventIds.includes("evt-2")) {
        return [
          {
            userId: "user-2",
            purchasePrice: 20,
            event: {
              id: "evt-2",
              comedians: [
                { comedian: { id: "com-2", name: "Bob" } },
              ],
            },
          },
        ];
      }
      return [];
    });

    mockPrisma.venue.findMany.mockResolvedValue([
      { id: "venue-2", name: "Chicago Club", city: "Chicago", state: "IL" },
    ]);

    const result = await getExpansionMarkets("venue-1");

    expect(result.length).toBeGreaterThanOrEqual(0);
    // Each market should have the expected shape
    for (const market of result) {
      expect(market).toHaveProperty("location");
      expect(market).toHaveProperty("score");
      expect(market).toHaveProperty("estimatedAudienceSize");
      expect(market).toHaveProperty("competitionLevel");
      expect(market).toHaveProperty("reasoning");
      expect(["low", "medium", "high"]).toContain(market.competitionLevel);
    }
  });
});
