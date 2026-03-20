import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeSocialPrice, getEventSocialPricing } from "./social-pricing";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    ticketType: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    audienceUnification: {
      findMany: vi.fn(),
    },
    ticketWaitlistQueue: {
      count: vi.fn(),
    },
    socialProof: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("./dynamic-pricing", () => ({
  getDemandMultiplier: vi.fn(),
  computeDynamicPrice: vi.fn(),
}));

import { prisma } from "./prisma";
import { getDemandMultiplier } from "./dynamic-pricing";

const mockPrisma = prisma as unknown as {
  event: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  audienceUnification: {
    findMany: ReturnType<typeof vi.fn>;
  };
  ticketWaitlistQueue: {
    count: ReturnType<typeof vi.fn>;
  };
  socialProof: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const mockGetDemandMultiplier = getDemandMultiplier as ReturnType<typeof vi.fn>;

// Helper to set up standard mocks for computeSocialSignals
function setupSocialSignalMocks(overrides?: {
  event?: object | null;
  audienceData?: object[];
  pastEvents?: object[];
  waitlistCount?: number;
  socialProof?: object | null;
}) {
  const defaultEvent = {
    id: "event-1",
    date: new Date("2026-06-15T20:00:00Z"),
    comedians: [
      {
        comedianId: "comic-1",
        comedian: { _count: { followers: 500 } },
      },
    ],
    venue: { id: "venue-1", capacity: 200 },
  };

  mockPrisma.event.findUnique.mockResolvedValue(
    overrides?.event !== undefined ? overrides.event : defaultEvent
  );
  mockPrisma.audienceUnification.findMany.mockResolvedValue(
    overrides?.audienceData ?? []
  );
  mockPrisma.event.findMany.mockResolvedValue(overrides?.pastEvents ?? []);
  mockPrisma.ticketWaitlistQueue.count.mockResolvedValue(
    overrides?.waitlistCount ?? 0
  );
  mockPrisma.socialProof.findFirst.mockResolvedValue(
    overrides?.socialProof ?? null
  );
}

describe("social-pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeSocialPrice", () => {
    it("throws when ticket type is not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);

      await expect(computeSocialPrice("bogus")).rejects.toThrow(
        "Ticket type not found"
      );
    });

    it("throws when event is not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-missing",
        sold: 50,
        capacity: 100,
      });
      setupSocialSignalMocks({ event: null });

      await expect(computeSocialPrice("tt-1")).rejects.toThrow(
        "Event not found"
      );
    });

    it("computes price with minimal social signals (no audience data, no history)", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks();
      mockGetDemandMultiplier.mockReturnValue(1.1);

      const result = await computeSocialPrice("tt-1");

      expect(result.basePrice).toBe(25);
      expect(result.demandMultiplier).toBe(1.1);
      expect(result.signals).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.recommendedPrice).toBeGreaterThan(0);
      // With 500 followers and no other signals, confidence should be low
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("includes external followers from audience unification", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({
        audienceData: [
          { followerCount: 50000, engagementRate: 0.06 },
          { followerCount: 30000, engagementRate: 0.04 },
        ],
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // 500 (platform) + 50000 + 30000 = 80500 total followers
      expect(result.signals.totalFollowers).toBe(80500);
      // Average engagement: (0.06 + 0.04) / 2 = 0.05
      expect(result.signals.avgEngagementRate).toBe(0.05);
    });

    it("handles null followerCount in audience data gracefully", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({
        audienceData: [
          { followerCount: null, engagementRate: null },
        ],
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // Only platform followers (500), null external followers treated as 0
      expect(result.signals.totalFollowers).toBe(500);
      // No valid engagement rates
      expect(result.signals.avgEngagementRate).toBe(0);
    });

    it("computes historical sell-through from past events", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({
        pastEvents: [
          {
            ticketTypes: [
              { capacity: 100, sold: 90 },
            ],
          },
          {
            ticketTypes: [
              { capacity: 100, sold: 70 },
            ],
          },
        ],
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // (90/100 + 70/100) / 2 = 0.8
      expect(result.signals.historicalSellThrough).toBe(0.8);
    });

    it("defaults historical sell-through to 0.5 when no past events", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({ pastEvents: [] });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      expect(result.signals.historicalSellThrough).toBe(0.5);
    });

    it("computes waitlist ratio relative to venue capacity", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({ waitlistCount: 100 });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // waitlistRatio = 100 / 200 (venue capacity) = 0.5
      expect(result.signals.waitlistRatio).toBe(0.5);
    });

    it("uses default capacity of 200 when venue capacity is null", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      const eventWithNullCapacity = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 500 } },
          },
        ],
        venue: { id: "venue-1", capacity: null },
      };

      setupSocialSignalMocks({
        event: eventWithNullCapacity,
        waitlistCount: 50,
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // capacity null -> defaults to 200; waitlistRatio = 50/200 = 0.25
      expect(result.signals.waitlistRatio).toBe(0.25);
    });

    it("applies VIRAL buzz multiplier from social proof", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({
        socialProof: { entityType: "EVENT", entityId: "event-1", buzzLevel: "VIRAL" },
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      expect(result.signals.buzzMultiplier).toBe(1.4);
    });

    it("applies HIGH buzz multiplier from social proof", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks({
        socialProof: { entityType: "EVENT", entityId: "event-1", buzzLevel: "HIGH" },
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      expect(result.signals.buzzMultiplier).toBe(1.2);
    });

    it("defaults buzz multiplier to 1.0 when social proof table throws", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks();
      mockPrisma.socialProof.findFirst.mockRejectedValue(
        new Error("Table not found")
      );
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      expect(result.signals.buzzMultiplier).toBe(1.0);
    });

    it("applies floor to recommended price", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 10,
        eventId: "event-1",
        sold: 5,
        capacity: 100,
      });

      setupSocialSignalMocks();
      // Low demand -> low multiplier
      mockGetDemandMultiplier.mockReturnValue(0.9);

      const result = await computeSocialPrice("tt-1", { floor: 15 });

      expect(result.recommendedPrice).toBeGreaterThanOrEqual(15);
    });

    it("applies ceiling to recommended price", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 100,
        eventId: "event-1",
        sold: 95,
        capacity: 100,
      });

      setupSocialSignalMocks({
        audienceData: [
          { followerCount: 1000000, engagementRate: 0.08 },
        ],
        waitlistCount: 300,
        socialProof: { entityType: "EVENT", entityId: "event-1", buzzLevel: "VIRAL" },
        pastEvents: [
          { ticketTypes: [{ capacity: 100, sold: 95 }] },
        ],
      });
      mockGetDemandMultiplier.mockReturnValue(1.5);

      const result = await computeSocialPrice("tt-1", { ceiling: 50 });

      expect(result.recommendedPrice).toBeLessThanOrEqual(50);
    });

    it("computes signal strength based on available data points", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      // All signals present
      setupSocialSignalMocks({
        audienceData: [
          { followerCount: 10000, engagementRate: 0.05 },
        ],
        pastEvents: [
          { ticketTypes: [{ capacity: 100, sold: 80 }] },
        ],
        waitlistCount: 20,
        socialProof: { entityType: "EVENT", entityId: "event-1", buzzLevel: "HIGH" },
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // totalFollowers > 0 (1), engagement > 0 (1), pastEvents > 0 (1),
      // waitlist > 0 (1), buzz > 1.0 (1) => 5/5 = 1.0
      expect(result.signals.signalStrength).toBe(1.0);
      expect(result.confidence).toBe(1.0);
    });

    it("returns low signal strength when no social data available", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      // Event with zero platform followers and no other data
      const eventNoFollowers = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 0 } },
          },
        ],
        venue: { id: "venue-1", capacity: 200 },
      };

      setupSocialSignalMocks({ event: eventNoFollowers });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // No data points: all zeros => 0/5 = 0
      expect(result.signals.signalStrength).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it("returns correct breakdown components", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 50,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks();
      mockGetDemandMultiplier.mockReturnValue(1.1);

      const result = await computeSocialPrice("tt-1");

      expect(result.breakdown).toHaveProperty("demandComponent");
      expect(result.breakdown).toHaveProperty("socialFollowingComponent");
      expect(result.breakdown).toHaveProperty("historicalComponent");
      expect(result.breakdown).toHaveProperty("waitlistComponent");
      expect(result.breakdown).toHaveProperty("engagementComponent");
      expect(result.breakdown).toHaveProperty("buzzComponent");

      // demandComponent = 1.1 * 0.35 = 0.385 -> rounded to 0.39
      expect(result.breakdown.demandComponent).toBe(
        Math.round(1.1 * 0.35 * 100) / 100
      );
    });

    it("computes correct engagement multiplier tiers", async () => {
      // Test high engagement (>5%)
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 30,
        capacity: 100,
      });

      setupSocialSignalMocks({
        audienceData: [
          { followerCount: 10000, engagementRate: 0.06 },
        ],
      });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const highEngResult = await computeSocialPrice("tt-1");
      // engagement > 0.05 -> 1.1 multiplier -> component = 1.1 * 0.10 = 0.11
      expect(highEngResult.breakdown.engagementComponent).toBe(0.11);
    });

    it("handles multiple comedians on the same event", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      const multiComedianEvent = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 1000 } },
          },
          {
            comedianId: "comic-2",
            comedian: { _count: { followers: 2000 } },
          },
        ],
        venue: { id: "venue-1", capacity: 200 },
      };

      setupSocialSignalMocks({ event: multiComedianEvent });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // 1000 + 2000 = 3000 platform followers (no external)
      expect(result.signals.totalFollowers).toBe(3000);
    });

    it("clamps follower multiplier between 0.95 and 1.2", async () => {
      // Test with very few followers (should clamp to 0.95)
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 25,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      const fewFollowersEvent = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 1 } },
          },
        ],
        venue: { id: "venue-1", capacity: 200 },
      };

      setupSocialSignalMocks({ event: fewFollowersEvent });
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const result = await computeSocialPrice("tt-1");

      // 1 follower: log10(1/1000) = log10(0.001) = -3, so 1.0 + (-3)*0.05 = 0.85
      // Clamped to 0.95
      // socialFollowingComponent = 0.95 * 0.20 = 0.19
      expect(result.breakdown.socialFollowingComponent).toBe(0.19);
    });

    it("returns properly rounded values", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 33.33,
        eventId: "event-1",
        sold: 50,
        capacity: 100,
      });

      setupSocialSignalMocks();
      mockGetDemandMultiplier.mockReturnValue(1.1);

      const result = await computeSocialPrice("tt-1");

      // Check all values are properly rounded to 2 decimal places
      expect(result.recommendedPrice).toBe(
        Math.round(result.recommendedPrice * 100) / 100
      );
      expect(result.socialMultiplier).toBe(
        Math.round(result.socialMultiplier * 100) / 100
      );
      expect(result.compositeMultiplier).toBe(
        Math.round(result.compositeMultiplier * 100) / 100
      );
    });
  });

  describe("getEventSocialPricing", () => {
    it("returns social pricing for all ticket types of an event", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([
        { id: "tt-1", price: 25, eventId: "event-1", sold: 50, capacity: 100 },
        { id: "tt-2", price: 50, eventId: "event-1", sold: 20, capacity: 50 },
      ]);

      // Each call to computeSocialPrice will call findUnique for the ticket type
      mockPrisma.ticketType.findUnique
        .mockResolvedValueOnce({
          id: "tt-1",
          price: 25,
          eventId: "event-1",
          sold: 50,
          capacity: 100,
        })
        .mockResolvedValueOnce({
          id: "tt-2",
          price: 50,
          eventId: "event-1",
          sold: 20,
          capacity: 50,
        });

      // Mock social signals for both calls
      const defaultEvent = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 500 } },
          },
        ],
        venue: { id: "venue-1", capacity: 200 },
      };

      mockPrisma.event.findUnique.mockResolvedValue(defaultEvent);
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.ticketWaitlistQueue.count.mockResolvedValue(0);
      mockPrisma.socialProof.findFirst.mockResolvedValue(null);
      mockGetDemandMultiplier.mockReturnValue(1.0);

      const results = await getEventSocialPricing("event-1");

      expect(results).toHaveLength(2);
      expect(results[0].basePrice).toBe(25);
      expect(results[1].basePrice).toBe(50);
    });

    it("returns empty array when event has no ticket types", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([]);

      const results = await getEventSocialPricing("event-1");

      expect(results).toEqual([]);
    });

    it("passes floor and ceiling options to each ticket type", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([
        { id: "tt-1", price: 10, eventId: "event-1", sold: 5, capacity: 100 },
      ]);

      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        price: 10,
        eventId: "event-1",
        sold: 5,
        capacity: 100,
      });

      const defaultEvent = {
        id: "event-1",
        date: new Date("2026-06-15T20:00:00Z"),
        comedians: [
          {
            comedianId: "comic-1",
            comedian: { _count: { followers: 500 } },
          },
        ],
        venue: { id: "venue-1", capacity: 200 },
      };

      mockPrisma.event.findUnique.mockResolvedValue(defaultEvent);
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.ticketWaitlistQueue.count.mockResolvedValue(0);
      mockPrisma.socialProof.findFirst.mockResolvedValue(null);
      mockGetDemandMultiplier.mockReturnValue(0.9);

      const results = await getEventSocialPricing("event-1", {
        floor: 15,
        ceiling: 100,
      });

      expect(results).toHaveLength(1);
      expect(results[0].recommendedPrice).toBeGreaterThanOrEqual(15);
      expect(results[0].recommendedPrice).toBeLessThanOrEqual(100);
    });
  });
});
