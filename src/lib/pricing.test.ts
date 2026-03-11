import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentPrice,
  getPricingTiers,
  getEventPricingSummary,
  createPricingTier,
} from "./pricing";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("./prisma", () => ({
  prisma: {
    pricingTier: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
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
    aggregate: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentPrice", () => {
    it("returns active tier based on date", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // 1 day ago
      const futureDate = new Date(now.getTime() + 86400000); // 1 day from now

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "tier1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: new Decimal("15.00"),
          startsAt: pastDate,
          endsAt: futureDate,
          maxQuantity: 100,
          sold: 10,
          sortOrder: 0,
        },
        {
          id: "tier2",
          ticketTypeId: "tt1",
          name: "Regular",
          price: new Decimal("25.00"),
          startsAt: futureDate,
          endsAt: null,
          maxQuantity: null,
          sold: 0,
          sortOrder: 1,
        },
      ]);

      const result = await getCurrentPrice("tt1");

      expect(result.tierName).toBe("Early Bird");
      expect(result.tierId).toBe("tier1");
      expect(result.price).toEqual(new Decimal("15.00"));
      expect(result.isBaseFallback).toBe(false);
    });

    it("falls back to base price when no tiers exist", async () => {
      mockPrisma.pricingTier.findMany.mockResolvedValue([]);
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        price: new Decimal("20.00"),
      });

      const result = await getCurrentPrice("tt1");

      expect(result.price).toEqual(new Decimal("20.00"));
      expect(result.tierName).toBeNull();
      expect(result.tierId).toBeNull();
      expect(result.isBaseFallback).toBe(true);
    });

    it("falls back to base price when no tiers are active", async () => {
      const pastDate = new Date("2020-01-01");
      const pastDate2 = new Date("2020-06-01");

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "tier1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: new Decimal("15.00"),
          startsAt: pastDate,
          endsAt: pastDate2,
          maxQuantity: null,
          sold: 0,
          sortOrder: 0,
        },
      ]);
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        price: new Decimal("30.00"),
      });

      const result = await getCurrentPrice("tt1");

      expect(result.price).toEqual(new Decimal("30.00"));
      expect(result.isBaseFallback).toBe(true);
    });

    it("skips sold-out tiers", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000);
      const futureDate = new Date(now.getTime() + 86400000);

      mockPrisma.pricingTier.findMany.mockResolvedValue([
        {
          id: "tier1",
          ticketTypeId: "tt1",
          name: "Early Bird",
          price: new Decimal("15.00"),
          startsAt: pastDate,
          endsAt: futureDate,
          maxQuantity: 50,
          sold: 50, // sold out
          sortOrder: 0,
        },
        {
          id: "tier2",
          ticketTypeId: "tt1",
          name: "Advance",
          price: new Decimal("20.00"),
          startsAt: pastDate,
          endsAt: futureDate,
          maxQuantity: 100,
          sold: 30,
          sortOrder: 1,
        },
      ]);

      const result = await getCurrentPrice("tt1");

      expect(result.tierName).toBe("Advance");
      expect(result.tierId).toBe("tier2");
      expect(result.price).toEqual(new Decimal("20.00"));
      expect(result.isBaseFallback).toBe(false);
    });

    it("throws when ticket type not found and no tiers", async () => {
      mockPrisma.pricingTier.findMany.mockResolvedValue([]);
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);

      await expect(getCurrentPrice("nonexistent")).rejects.toThrow(
        "Ticket type not found"
      );
    });
  });

  describe("getPricingTiers", () => {
    it("returns tiers in sortOrder", async () => {
      const tiers = [
        { id: "t1", name: "Early Bird", sortOrder: 0 },
        { id: "t2", name: "Advance", sortOrder: 1 },
        { id: "t3", name: "Door", sortOrder: 2 },
      ];
      mockPrisma.pricingTier.findMany.mockResolvedValue(tiers);

      const result = await getPricingTiers("tt1");

      expect(result).toEqual(tiers);
      expect(mockPrisma.pricingTier.findMany).toHaveBeenCalledWith({
        where: { ticketTypeId: "tt1" },
        orderBy: { sortOrder: "asc" },
      });
    });

    it("returns empty array when no tiers exist", async () => {
      mockPrisma.pricingTier.findMany.mockResolvedValue([]);

      const result = await getPricingTiers("tt1");

      expect(result).toEqual([]);
    });
  });

  describe("createPricingTier", () => {
    it("creates a pricing tier with auto sort order", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        price: new Decimal("25.00"),
      });
      mockPrisma.pricingTier.aggregate.mockResolvedValue({
        _max: { sortOrder: 1 },
      });
      const created = {
        id: "tier-new",
        ticketTypeId: "tt1",
        name: "Door",
        price: new Decimal("35.00"),
        startsAt: new Date("2026-06-01"),
        endsAt: null,
        maxQuantity: null,
        sortOrder: 2,
      };
      mockPrisma.pricingTier.create.mockResolvedValue(created);

      const result = await createPricingTier({
        ticketTypeId: "tt1",
        name: "Door",
        price: 35.0,
        startsAt: new Date("2026-06-01"),
      });

      expect(result).toEqual(created);
      expect(mockPrisma.pricingTier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketTypeId: "tt1",
          name: "Door",
          sortOrder: 2,
        }),
      });
    });

    it("throws when ticket type not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);

      await expect(
        createPricingTier({
          ticketTypeId: "nonexistent",
          name: "Early Bird",
          price: 10,
          startsAt: new Date(),
        })
      ).rejects.toThrow("Ticket type not found");
    });
  });

  describe("getEventPricingSummary", () => {
    it("aggregates across ticket types", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000);
      const futureDate = new Date(now.getTime() + 86400000);
      const farFuture = new Date(now.getTime() + 172800000);

      mockPrisma.ticketType.findMany.mockResolvedValue([
        {
          id: "tt1",
          eventId: "evt1",
          name: "General Admission",
          price: new Decimal("30.00"),
          sortOrder: 0,
          pricingTiers: [
            {
              id: "tier1",
              name: "Early Bird",
              price: new Decimal("15.00"),
              startsAt: pastDate,
              endsAt: futureDate,
              maxQuantity: 100,
              sold: 20,
              sortOrder: 0,
            },
            {
              id: "tier2",
              name: "Regular",
              price: new Decimal("25.00"),
              startsAt: farFuture,
              endsAt: null,
              maxQuantity: null,
              sold: 0,
              sortOrder: 1,
            },
          ],
        },
        {
          id: "tt2",
          eventId: "evt1",
          name: "VIP",
          price: new Decimal("75.00"),
          sortOrder: 1,
          pricingTiers: [],
        },
      ]);

      const result = await getEventPricingSummary("evt1");

      expect(result).toHaveLength(2);

      // First ticket type has active early bird tier
      expect(result[0].ticketTypeId).toBe("tt1");
      expect(result[0].currentPrice).toEqual(new Decimal("15.00"));
      expect(result[0].currentTierName).toBe("Early Bird");
      expect(result[0].nextTier).toEqual({
        name: "Regular",
        price: new Decimal("25.00"),
        startsAt: farFuture,
      });
      expect(result[0].savings).toBe("10");
      expect(result[0].savingsComparedTo).toBe("Regular");
      expect(result[0].tiers).toHaveLength(2);
      expect(result[0].tiers[0].isActive).toBe(true);
      expect(result[0].tiers[1].isActive).toBe(false);

      // Second ticket type has no tiers — uses base price
      expect(result[1].ticketTypeId).toBe("tt2");
      expect(result[1].currentPrice).toEqual(new Decimal("75.00"));
      expect(result[1].currentTierName).toBeNull();
      expect(result[1].tiers).toHaveLength(0);
    });

    it("compares savings to base price when no next tier", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000);
      const futureDate = new Date(now.getTime() + 86400000);

      mockPrisma.ticketType.findMany.mockResolvedValue([
        {
          id: "tt1",
          eventId: "evt1",
          name: "GA",
          price: new Decimal("40.00"),
          sortOrder: 0,
          pricingTiers: [
            {
              id: "tier1",
              name: "Early Bird",
              price: new Decimal("25.00"),
              startsAt: pastDate,
              endsAt: futureDate,
              maxQuantity: null,
              sold: 0,
              sortOrder: 0,
            },
          ],
        },
      ]);

      const result = await getEventPricingSummary("evt1");

      expect(result[0].savings).toBe("15");
      expect(result[0].savingsComparedTo).toBe("regular price");
    });

    it("marks sold-out tiers correctly", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000);
      const futureDate = new Date(now.getTime() + 86400000);

      mockPrisma.ticketType.findMany.mockResolvedValue([
        {
          id: "tt1",
          eventId: "evt1",
          name: "GA",
          price: new Decimal("30.00"),
          sortOrder: 0,
          pricingTiers: [
            {
              id: "tier1",
              name: "Early Bird",
              price: new Decimal("15.00"),
              startsAt: pastDate,
              endsAt: futureDate,
              maxQuantity: 50,
              sold: 50,
              sortOrder: 0,
            },
          ],
        },
      ]);

      const result = await getEventPricingSummary("evt1");

      expect(result[0].tiers[0].isSoldOut).toBe(true);
      expect(result[0].tiers[0].isActive).toBe(false);
      // Falls back to base price since tier is sold out
      expect(result[0].currentPrice).toEqual(new Decimal("30.00"));
      expect(result[0].currentTierName).toBeNull();
    });
  });
});
