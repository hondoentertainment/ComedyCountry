import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerPOSConnection,
  getPOSConnections,
  deactivatePOSConnection,
  syncTransactions,
  getTransactions,
  reconcileSales,
  syncMenuItemToPOS,
  getPOSMenuItems,
  POS_PROVIDERS,
} from "./pos-integration";

vi.mock("./prisma", () => ({
  prisma: {
    pOSIntegration: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pOSTransaction: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    walkUpSale: {
      findMany: vi.fn(),
    },
    menuItem: {
      findUnique: vi.fn(),
    },
    pOSMenuItem: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  pOSIntegration: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pOSTransaction: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  walkUpSale: {
    findMany: ReturnType<typeof vi.fn>;
  };
  menuItem: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  pOSMenuItem: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("pos-integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── POS_PROVIDERS ─────────────────────────────────────────────────── */

  describe("POS_PROVIDERS", () => {
    it("contains square, toast, and clover", () => {
      expect(POS_PROVIDERS).toContain("square");
      expect(POS_PROVIDERS).toContain("toast");
      expect(POS_PROVIDERS).toContain("clover");
      expect(POS_PROVIDERS).toHaveLength(3);
    });
  });

  /* ── registerPOSConnection ─────────────────────────────────────────── */

  describe("registerPOSConnection", () => {
    it("registers a new POS connection", async () => {
      const connection = {
        id: "pos1",
        venueId: "v1",
        provider: "square",
        isActive: true,
      };
      mockPrisma.pOSIntegration.upsert.mockResolvedValue(connection);

      const result = await registerPOSConnection("v1", "square", {
        apiKey: "sk_test_123",
        locationId: "loc1",
      });

      expect(result).toEqual(connection);
      expect(mockPrisma.pOSIntegration.upsert).toHaveBeenCalledWith({
        where: { venueId_provider: { venueId: "v1", provider: "square" } },
        update: expect.objectContaining({
          apiKey: "sk_test_123",
          locationId: "loc1",
          isActive: true,
        }),
        create: expect.objectContaining({
          venueId: "v1",
          provider: "square",
          apiKey: "sk_test_123",
          locationId: "loc1",
          isActive: true,
        }),
      });
    });

    it("rejects unsupported providers", async () => {
      await expect(
        registerPOSConnection("v1", "stripe", { apiKey: "key" })
      ).rejects.toThrow("Unsupported POS provider: stripe");
    });

    it("rejects empty API key", async () => {
      await expect(
        registerPOSConnection("v1", "square", { apiKey: "" })
      ).rejects.toThrow("API key is required");
    });
  });

  /* ── getPOSConnections ─────────────────────────────────────────────── */

  describe("getPOSConnections", () => {
    it("returns all POS connections for a venue", async () => {
      const connections = [
        { id: "pos1", provider: "square" },
        { id: "pos2", provider: "toast" },
      ];
      mockPrisma.pOSIntegration.findMany.mockResolvedValue(connections);

      const result = await getPOSConnections("v1");

      expect(result).toEqual(connections);
      expect(mockPrisma.pOSIntegration.findMany).toHaveBeenCalledWith({
        where: { venueId: "v1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  /* ── deactivatePOSConnection ───────────────────────────────────────── */

  describe("deactivatePOSConnection", () => {
    it("deactivates an existing connection", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });
      mockPrisma.pOSIntegration.update.mockResolvedValue({
        id: "pos1",
        isActive: false,
      });

      const result = await deactivatePOSConnection("v1", "square");

      expect(result.isActive).toBe(false);
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        deactivatePOSConnection("v1", "square")
      ).rejects.toThrow("POS connection not found");
    });
  });

  /* ── syncTransactions ──────────────────────────────────────────────── */

  describe("syncTransactions", () => {
    it("syncs transactions and updates lastSyncAt", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });

      const txRecord = {
        id: "tx1",
        externalId: "ext_1",
        amount: 25.5,
        status: "completed",
      };
      mockPrisma.pOSTransaction.upsert.mockResolvedValue(txRecord);
      mockPrisma.pOSIntegration.update.mockResolvedValue({});

      const result = await syncTransactions("v1", "square", [
        {
          externalId: "ext_1",
          amount: 25.5,
          status: "completed",
          timestamp: new Date("2026-03-01"),
        },
      ]);

      expect(result.synced).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(mockPrisma.pOSTransaction.upsert).toHaveBeenCalledWith({
        where: {
          integrationId_externalId: {
            integrationId: "pos1",
            externalId: "ext_1",
          },
        },
        update: expect.objectContaining({
          amount: 25.5,
          status: "completed",
        }),
        create: expect.objectContaining({
          integrationId: "pos1",
          externalId: "ext_1",
          amount: 25.5,
        }),
      });
      expect(mockPrisma.pOSIntegration.update).toHaveBeenCalledWith({
        where: { venueId_provider: { venueId: "v1", provider: "square" } },
        data: { lastSyncAt: expect.any(Date) },
      });
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        syncTransactions("v1", "square", [])
      ).rejects.toThrow("POS connection not found");
    });

    it("throws when connection is inactive", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: false,
      });

      await expect(
        syncTransactions("v1", "square", [
          {
            externalId: "ext_1",
            amount: 10,
            status: "completed",
            timestamp: new Date(),
          },
        ])
      ).rejects.toThrow("POS connection is not active");
    });

    it("throws for negative transaction amounts", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });

      await expect(
        syncTransactions("v1", "square", [
          {
            externalId: "ext_1",
            amount: -5,
            status: "completed",
            timestamp: new Date(),
          },
        ])
      ).rejects.toThrow("Transaction amount cannot be negative");
    });
  });

  /* ── getTransactions ───────────────────────────────────────────────── */

  describe("getTransactions", () => {
    it("returns transactions with default options", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({ id: "pos1" });
      mockPrisma.pOSTransaction.findMany.mockResolvedValue([
        { id: "tx1", amount: 25 },
      ]);

      const result = await getTransactions("v1", "square");

      expect(result).toHaveLength(1);
      expect(mockPrisma.pOSTransaction.findMany).toHaveBeenCalledWith({
        where: { integrationId: "pos1" },
        orderBy: { timestamp: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("applies date and status filters", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({ id: "pos1" });
      mockPrisma.pOSTransaction.findMany.mockResolvedValue([]);

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-03-31");

      await getTransactions("v1", "square", {
        startDate,
        endDate,
        status: "completed",
        take: 10,
        skip: 5,
      });

      expect(mockPrisma.pOSTransaction.findMany).toHaveBeenCalledWith({
        where: {
          integrationId: "pos1",
          timestamp: { gte: startDate, lte: endDate },
          status: "completed",
        },
        orderBy: { timestamp: "desc" },
        take: 10,
        skip: 5,
      });
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        getTransactions("v1", "square")
      ).rejects.toThrow("POS connection not found");
    });
  });

  /* ── reconcileSales ────────────────────────────────────────────────── */

  describe("reconcileSales", () => {
    it("reconciles matching POS and local sales", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({ id: "pos1" });
      mockPrisma.pOSTransaction.findMany.mockResolvedValue([
        { externalId: "ext_1", amount: 25, status: "completed" },
        { externalId: "ext_2", amount: 30, status: "completed" },
      ]);
      mockPrisma.walkUpSale.findMany.mockResolvedValue([
        { id: "ws1", amount: 25 },
        { id: "ws2", amount: 30 },
      ]);

      const result = await reconcileSales("v1", "square", "e1");

      expect(result.matched).toBe(2);
      expect(result.unmatched).toBe(0);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.totalPOS).toBe(55);
      expect(result.totalLocal).toBe(55);
      expect(result.reconciled).toBe(true);
    });

    it("identifies unmatched transactions", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({ id: "pos1" });
      mockPrisma.pOSTransaction.findMany.mockResolvedValue([
        { externalId: "ext_1", amount: 25, status: "completed" },
        { externalId: "ext_2", amount: 50, status: "completed" },
      ]);
      mockPrisma.walkUpSale.findMany.mockResolvedValue([
        { id: "ws1", amount: 25 },
      ]);

      const result = await reconcileSales("v1", "square", "e1");

      expect(result.matched).toBe(1);
      expect(result.unmatched).toBe(1);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].externalId).toBe("ext_2");
      expect(result.reconciled).toBe(false);
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        reconcileSales("v1", "square", "e1")
      ).rejects.toThrow("POS connection not found");
    });
  });

  /* ── syncMenuItemToPOS ─────────────────────────────────────────────── */

  describe("syncMenuItemToPOS", () => {
    it("syncs a menu item to POS", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "v1",
        name: "Craft Beer",
        price: 8.5,
        category: "drinks",
        isAvailable: true,
      });
      mockPrisma.pOSMenuItem.upsert.mockResolvedValue({
        id: "pmi1",
        menuItemId: "mi1",
        name: "Craft Beer",
      });

      const result = await syncMenuItemToPOS("v1", "square", "mi1");

      expect(result.name).toBe("Craft Beer");
      expect(mockPrisma.pOSMenuItem.upsert).toHaveBeenCalledWith({
        where: {
          integrationId_menuItemId: {
            integrationId: "pos1",
            menuItemId: "mi1",
          },
        },
        update: expect.objectContaining({
          name: "Craft Beer",
          price: 8.5,
          category: "drinks",
        }),
        create: expect.objectContaining({
          integrationId: "pos1",
          menuItemId: "mi1",
          name: "Craft Beer",
        }),
      });
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        syncMenuItemToPOS("v1", "square", "mi1")
      ).rejects.toThrow("POS connection not found");
    });

    it("throws when connection is inactive", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: false,
      });

      await expect(
        syncMenuItemToPOS("v1", "square", "mi1")
      ).rejects.toThrow("POS connection is not active");
    });

    it("throws when menu item not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(
        syncMenuItemToPOS("v1", "square", "mi1")
      ).rejects.toThrow("Menu item not found");
    });

    it("throws when menu item belongs to different venue", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({
        id: "pos1",
        isActive: true,
      });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "other-venue",
        name: "Beer",
      });

      await expect(
        syncMenuItemToPOS("v1", "square", "mi1")
      ).rejects.toThrow("Menu item does not belong to this venue");
    });
  });

  /* ── getPOSMenuItems ───────────────────────────────────────────────── */

  describe("getPOSMenuItems", () => {
    it("returns POS menu items for a connection", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue({ id: "pos1" });
      mockPrisma.pOSMenuItem.findMany.mockResolvedValue([
        { id: "pmi1", name: "Beer", category: "drinks" },
        { id: "pmi2", name: "Nachos", category: "food" },
      ]);

      const result = await getPOSMenuItems("v1", "square");

      expect(result).toHaveLength(2);
      expect(mockPrisma.pOSMenuItem.findMany).toHaveBeenCalledWith({
        where: { integrationId: "pos1" },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    });

    it("throws when connection not found", async () => {
      mockPrisma.pOSIntegration.findUnique.mockResolvedValue(null);

      await expect(
        getPOSMenuItems("v1", "square")
      ).rejects.toThrow("POS connection not found");
    });
  });
});
