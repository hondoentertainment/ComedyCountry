import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDemandMultiplier,
  computeDynamicPrice,
  getActivePricingTier,
  getEffectivePrice,
  createEarlyBirdTiers,
  suggestPricing,
  getPricingTiers,
} from "./dynamic-pricing";

vi.mock("./prisma", () => ({
  prisma: {
    pricingTier: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    ticketType: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  pricingTier: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("dynamic-pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDemandMultiplier", () => {
    it("returns 1.5x when >90% sold", () => {
      expect(getDemandMultiplier(95, 100)).toBe(1.5);
    });

    it("returns 1.25x when >75% sold", () => {
      expect(getDemandMultiplier(80, 100)).toBe(1.25);
    });

    it("returns 1.1x when >50% sold", () => {
      expect(getDemandMultiplier(60, 100)).toBe(1.1);
    });

    it("returns 1.0x when >25% sold", () => {
      expect(getDemandMultiplier(30, 100)).toBe(1.0);
    });

    it("returns 0.9x when <25% sold", () => {
      expect(getDemandMultiplier(10, 100)).toBe(0.9);
    });

    it("returns 1.0 for zero capacity", () => {
      expect(getDemandMultiplier(0, 0)).toBe(1.0);
    });
  });

  describe("computeDynamicPrice", () => {
    it("computes price with demand multiplier", () => {
      const result = computeDynamicPrice(20, 95, 100);
      expect(result.price).toBe(30); // 20 * 1.5
      expect(result.multiplier).toBe(1.5);
      expect(result.sellThrough).toBe(0.95);
    });

    it("clamps to floor", () => {
      const result = computeDynamicPrice(20, 5, 100, { floor: 20 });
      // 20 * 0.9 = 18, clamped to floor 20
      expect(result.price).toBe(20);
    });

    it("clamps to ceiling", () => {
      const result = computeDynamicPrice(20, 95, 100, { ceiling: 25 });
      // 20 * 1.5 = 30, clamped to ceiling 25
      expect(result.price).toBe(25);
    });

    it("handles zero capacity", () => {
      const result = computeDynamicPrice(20, 0, 0);
      expect(result.price).toBe(20);
      expect(result.sellThrough).toBe(0);
    });
  });

  describe("getActivePricingTier", () => {
    it("returns the tier matching current time", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "t1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: 15,
          startsAt: past,
          endsAt: future,
          maxQuantity: 50,
          sold: 10,
          sortOrder: 0,
        },
      ]);

      const result = await getActivePricingTier("tt1", now);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Early Bird");
    });

    it("returns null when no tier matches", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      const farFuture = new Date(now.getTime() + 2 * 86400000);

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "t1",
          ticketTypeId: "tt1",
          name: "Future Tier",
          price: 15,
          startsAt: future,
          endsAt: farFuture,
          maxQuantity: null,
          sold: 0,
          sortOrder: 0,
        },
      ]);

      const result = await getActivePricingTier("tt1", now);
      expect(result).toBeNull();
    });

    it("skips tier that hit its max quantity cap", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "t1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: 15,
          startsAt: past,
          endsAt: future,
          maxQuantity: 20,
          sold: 20, // sold out
          sortOrder: 0,
        },
        {
          id: "t2",
          ticketTypeId: "tt1",
          name: "Standard",
          price: 25,
          startsAt: past,
          endsAt: future,
          maxQuantity: null,
          sold: 5,
          sortOrder: 1,
        },
      ]);

      const result = await getActivePricingTier("tt1", now);
      expect(result!.name).toBe("Standard");
    });
  });

  describe("getEffectivePrice", () => {
    it("returns tier price when no dynamic pricing", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);

      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        price: 25,
        sold: 30,
        capacity: 100,
      });

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "t1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: 18,
          startsAt: past,
          endsAt: future,
          maxQuantity: null,
          sold: 0,
          sortOrder: 0,
        },
      ]);

      const result = await getEffectivePrice("tt1");
      expect(result.price).toBe(18);
      expect(result.tierName).toBe("Early Bird");
      expect(result.source).toBe("tier");
    });

    it("applies dynamic pricing on top of tier price", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);

      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        price: 25,
        sold: 95,
        capacity: 100,
      });

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "t1",
          ticketTypeId: "tt1",
          name: "Standard",
          price: 25,
          startsAt: past,
          endsAt: future,
          maxQuantity: null,
          sold: 0,
          sortOrder: 0,
        },
      ]);

      const result = await getEffectivePrice("tt1", {
        enableDynamicPricing: true,
      });
      // 25 * 1.5 = 37.5
      expect(result.price).toBe(37.5);
      expect(result.source).toBe("dynamic");
      expect(result.dynamicMultiplier).toBe(1.5);
    });

    it("throws if ticket type not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);
      await expect(getEffectivePrice("bogus")).rejects.toThrow(
        "Ticket type not found"
      );
    });
  });

  describe("createEarlyBirdTiers", () => {
    it("creates tiers sorted by days before event", async () => {
      const eventDate = new Date("2026-06-15T20:00:00Z");
      let callIndex = 0;

      mockPrisma.pricingTier.create.mockImplementation(async (args: { data: { name: string } }) => ({
        id: `tier-${callIndex++}`,
        ...args.data,
      }));

      const result = await createEarlyBirdTiers("tt1", eventDate, [
        { name: "Early Bird", price: 15, daysBeforeEvent: 30 },
        { name: "Advance", price: 22, daysBeforeEvent: 7 },
        { name: "Door", price: 30, daysBeforeEvent: 0 },
      ]);

      expect(result).toHaveLength(3);
      expect(mockPrisma.pricingTier.create).toHaveBeenCalledTimes(3);

      // First tier (Early Bird) should start at epoch 0
      const firstCall = mockPrisma.pricingTier.create.mock.calls[0][0];
      expect(firstCall.data.name).toBe("Early Bird");
      expect(firstCall.data.startsAt).toEqual(new Date(0));
      expect(firstCall.data.sortOrder).toBe(0);
    });
  });

  describe("suggestPricing", () => {
    it("returns price suggestions based on comparable events", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([
        { price: 20, capacity: 100, sold: 80 },
        { price: 25, capacity: 100, sold: 90 },
        { price: 30, capacity: 100, sold: 70 },
        { price: 15, capacity: 50, sold: 40 },
      ]);

      const result = await suggestPricing("venue1");
      expect(result).not.toBeNull();
      expect(result!.suggested).toBe(25); // median of sorted [15, 20, 25, 30]
      expect(result!.earlyBird).toBe(20); // 25 * 0.8
      expect(result!.lastMinute).toBe(32.5); // 25 * 1.3
      expect(result!.stats.sampleSize).toBe(4);
      expect(result!.stats.min).toBe(15);
      expect(result!.stats.max).toBe(30);
    });

    it("returns null when no comparable data", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([]);
      const result = await suggestPricing("venue1");
      expect(result).toBeNull();
    });
  });

  describe("getPricingTiers", () => {
    it("returns tiers ordered by sortOrder", async () => {
      const tiers = [
        { id: "t1", name: "Early Bird", sortOrder: 0 },
        { id: "t2", name: "Standard", sortOrder: 1 },
      ];
      mockPrisma.pricingTier.findMany.mockResolvedValue(tiers);

      const result = await getPricingTiers("tt1");
      expect(result).toEqual(tiers);
      expect(mockPrisma.pricingTier.findMany).toHaveBeenCalledWith({
        where: { ticketTypeId: "tt1" },
        orderBy: { sortOrder: "asc" },
      });
    });
  });
});
