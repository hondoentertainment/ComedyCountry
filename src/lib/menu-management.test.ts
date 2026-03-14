import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMenuCategory,
  getMenuCategories,
  updateMenuCategory,
  deleteMenuCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  createPreOrderWithValidation,
  updatePreOrderStatus,
  getPreOrdersByEvent,
  trackDrinkMinimumFulfillment,
  getDrinkMinimumStatus,
  getEventFulfillmentSummary,
} from "./menu-management";

vi.mock("./prisma", () => ({
  prisma: {
    menuCategory: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    menuItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    preOrder: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    drinkMinimum: {
      findFirst: vi.fn(),
    },
    drinkMinimumFulfillment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  menuCategory: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  menuItem: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  preOrder: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  drinkMinimum: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  drinkMinimumFulfillment: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("menu-management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── createMenuCategory ────────────────────────────────────────────── */

  describe("createMenuCategory", () => {
    it("creates a menu category", async () => {
      mockPrisma.menuCategory.findFirst.mockResolvedValue(null);
      mockPrisma.menuCategory.create.mockResolvedValue({
        id: "mc1",
        venueId: "v1",
        name: "Cocktails",
        sortOrder: 0,
        isActive: true,
      });

      const result = await createMenuCategory("v1", {
        name: "Cocktails",
        description: "Signature cocktails",
      });

      expect(result.name).toBe("Cocktails");
      expect(mockPrisma.menuCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          venueId: "v1",
          name: "Cocktails",
          description: "Signature cocktails",
        }),
      });
    });

    it("rejects empty category name", async () => {
      await expect(
        createMenuCategory("v1", { name: "" })
      ).rejects.toThrow("Category name is required");
    });

    it("rejects duplicate category name", async () => {
      mockPrisma.menuCategory.findFirst.mockResolvedValue({
        id: "mc1",
        name: "Cocktails",
      });

      await expect(
        createMenuCategory("v1", { name: "Cocktails" })
      ).rejects.toThrow('Category "Cocktails" already exists');
    });
  });

  /* ── getMenuCategories ─────────────────────────────────────────────── */

  describe("getMenuCategories", () => {
    it("returns active categories with items", async () => {
      mockPrisma.menuCategory.findMany.mockResolvedValue([
        {
          id: "mc1",
          name: "Drinks",
          items: [{ id: "mi1", name: "Beer" }],
        },
      ]);

      const result = await getMenuCategories("v1");

      expect(result).toHaveLength(1);
      expect(mockPrisma.menuCategory.findMany).toHaveBeenCalledWith({
        where: { venueId: "v1", isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });
  });

  /* ── updateMenuCategory ────────────────────────────────────────────── */

  describe("updateMenuCategory", () => {
    it("updates a category", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "v1",
        name: "Drinks",
      });
      mockPrisma.menuCategory.update.mockResolvedValue({
        id: "mc1",
        name: "Beverages",
      });

      const result = await updateMenuCategory("mc1", "v1", {
        name: "Beverages",
      });

      expect(result.name).toBe("Beverages");
    });

    it("throws when category not found", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        updateMenuCategory("nonexistent", "v1", { name: "test" })
      ).rejects.toThrow("Category not found");
    });

    it("throws when category belongs to different venue", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "other",
      });

      await expect(
        updateMenuCategory("mc1", "v1", { name: "test" })
      ).rejects.toThrow("Category does not belong to this venue");
    });
  });

  /* ── deleteMenuCategory ────────────────────────────────────────────── */

  describe("deleteMenuCategory", () => {
    it("deletes an empty category", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "v1",
        _count: { items: 0 },
      });
      mockPrisma.menuCategory.delete.mockResolvedValue({ id: "mc1" });

      const result = await deleteMenuCategory("mc1", "v1");

      expect(result.id).toBe("mc1");
    });

    it("rejects deletion of category with items", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "v1",
        _count: { items: 3 },
      });

      await expect(
        deleteMenuCategory("mc1", "v1")
      ).rejects.toThrow("Cannot delete category with existing items");
    });
  });

  /* ── addMenuItem ───────────────────────────────────────────────────── */

  describe("addMenuItem", () => {
    it("adds a menu item to a category", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "v1",
        name: "Drinks",
      });
      mockPrisma.menuItem.create.mockResolvedValue({
        id: "mi1",
        name: "IPA",
        price: 8,
        category: "Drinks",
      });

      const result = await addMenuItem("v1", {
        categoryId: "mc1",
        name: "IPA",
        price: 8,
        description: "Local craft IPA",
      });

      expect(result.name).toBe("IPA");
      expect(mockPrisma.menuItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          venueId: "v1",
          category: "Drinks",
          name: "IPA",
          price: 8,
          categoryId: "mc1",
        }),
      });
    });

    it("rejects empty item name", async () => {
      await expect(
        addMenuItem("v1", { categoryId: "mc1", name: "", price: 5 })
      ).rejects.toThrow("Item name is required");
    });

    it("rejects negative price", async () => {
      await expect(
        addMenuItem("v1", { categoryId: "mc1", name: "Beer", price: -5 })
      ).rejects.toThrow("Price cannot be negative");
    });

    it("throws when category not found", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        addMenuItem("v1", { categoryId: "mc1", name: "Beer", price: 5 })
      ).rejects.toThrow("Category not found");
    });

    it("throws when category belongs to different venue", async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: "mc1",
        venueId: "other",
      });

      await expect(
        addMenuItem("v1", { categoryId: "mc1", name: "Beer", price: 5 })
      ).rejects.toThrow("Category does not belong to this venue");
    });
  });

  /* ── updateMenuItem ────────────────────────────────────────────────── */

  describe("updateMenuItem", () => {
    it("updates a menu item", async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "v1",
      });
      mockPrisma.menuItem.update.mockResolvedValue({
        id: "mi1",
        price: 10,
      });

      const result = await updateMenuItem("mi1", "v1", { price: 10 });

      expect(result.price).toBe(10);
    });

    it("rejects negative price on update", async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "v1",
      });

      await expect(
        updateMenuItem("mi1", "v1", { price: -3 })
      ).rejects.toThrow("Price cannot be negative");
    });

    it("throws when item not found", async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(
        updateMenuItem("mi1", "v1", { price: 10 })
      ).rejects.toThrow("Menu item not found");
    });
  });

  /* ── deleteMenuItem ────────────────────────────────────────────────── */

  describe("deleteMenuItem", () => {
    it("deletes a menu item", async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "v1",
      });
      mockPrisma.menuItem.delete.mockResolvedValue({ id: "mi1" });

      const result = await deleteMenuItem("mi1", "v1");

      expect(result.id).toBe("mi1");
    });

    it("throws when item belongs to different venue", async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: "mi1",
        venueId: "other",
      });

      await expect(deleteMenuItem("mi1", "v1")).rejects.toThrow(
        "Menu item does not belong to this venue"
      );
    });
  });

  /* ── getMenuItemsByCategory ────────────────────────────────────────── */

  describe("getMenuItemsByCategory", () => {
    it("returns items for a category", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: "mi1", name: "Beer" },
        { id: "mi2", name: "Wine" },
      ]);

      const result = await getMenuItemsByCategory("v1", "mc1");

      expect(result).toHaveLength(2);
      expect(mockPrisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { venueId: "v1", categoryId: "mc1", isAvailable: true },
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  /* ── createPreOrderWithValidation ──────────────────────────────────── */

  describe("createPreOrderWithValidation", () => {
    it("creates a validated pre-order with calculated total", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: "mi1", name: "Beer", price: 8, isPreOrderable: true },
        { id: "mi2", name: "Nachos", price: 12, isPreOrderable: true },
      ]);
      mockPrisma.preOrder.create.mockResolvedValue({
        id: "po1",
        customerName: "Jane",
        totalAmount: 28,
        status: "pending",
      });

      const result = await createPreOrderWithValidation({
        eventId: "e1",
        customerId: "u1",
        customerName: "Jane",
        items: [
          { menuItemId: "mi1", quantity: 1 },
          { menuItemId: "mi2", quantity: 1 },
        ],
      });

      expect(result.status).toBe("pending");
      expect(mockPrisma.preOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: "e1",
          customerName: "Jane",
          totalAmount: 20, // 8 + 12
          status: "pending",
        }),
      });
    });

    it("rejects empty items", async () => {
      await expect(
        createPreOrderWithValidation({
          eventId: "e1",
          customerId: "u1",
          customerName: "Jane",
          items: [],
        })
      ).rejects.toThrow("Pre-order must contain at least one item");
    });

    it("rejects when menu items not found", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([]);

      await expect(
        createPreOrderWithValidation({
          eventId: "e1",
          customerId: "u1",
          customerName: "Jane",
          items: [{ menuItemId: "mi999", quantity: 1 }],
        })
      ).rejects.toThrow("Menu items not found: mi999");
    });

    it("rejects non-pre-orderable items", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: "mi1", name: "Draft Beer", price: 6, isPreOrderable: false },
      ]);

      await expect(
        createPreOrderWithValidation({
          eventId: "e1",
          customerId: "u1",
          customerName: "Jane",
          items: [{ menuItemId: "mi1", quantity: 1 }],
        })
      ).rejects.toThrow("Items not available for pre-order: Draft Beer");
    });
  });

  /* ── updatePreOrderStatus ──────────────────────────────────────────── */

  describe("updatePreOrderStatus", () => {
    it("transitions from pending to confirmed", async () => {
      mockPrisma.preOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "pending",
      });
      mockPrisma.preOrder.update.mockResolvedValue({
        id: "po1",
        status: "confirmed",
      });

      const result = await updatePreOrderStatus("po1", "confirmed");

      expect(result.status).toBe("confirmed");
    });

    it("rejects invalid status", async () => {
      await expect(
        updatePreOrderStatus("po1", "invalid")
      ).rejects.toThrow("Invalid status: invalid");
    });

    it("rejects invalid transitions", async () => {
      mockPrisma.preOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "picked_up",
      });

      await expect(
        updatePreOrderStatus("po1", "pending")
      ).rejects.toThrow("Cannot transition from picked_up to pending");
    });

    it("throws when pre-order not found", async () => {
      mockPrisma.preOrder.findUnique.mockResolvedValue(null);

      await expect(
        updatePreOrderStatus("po1", "confirmed")
      ).rejects.toThrow("Pre-order not found");
    });
  });

  /* ── getPreOrdersByEvent ───────────────────────────────────────────── */

  describe("getPreOrdersByEvent", () => {
    it("returns pre-orders for an event", async () => {
      mockPrisma.preOrder.findMany.mockResolvedValue([
        { id: "po1", status: "pending" },
        { id: "po2", status: "confirmed" },
      ]);

      const result = await getPreOrdersByEvent("e1");

      expect(result).toHaveLength(2);
    });

    it("filters by status", async () => {
      mockPrisma.preOrder.findMany.mockResolvedValue([
        { id: "po1", status: "pending" },
      ]);

      await getPreOrdersByEvent("e1", { status: "pending" });

      expect(mockPrisma.preOrder.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1", status: "pending" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  /* ── trackDrinkMinimumFulfillment ──────────────────────────────────── */

  describe("trackDrinkMinimumFulfillment", () => {
    it("creates fulfillment record for new customer", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue({
        id: "dm1",
        minimumCount: 2,
        minimumSpend: 20,
      });
      mockPrisma.drinkMinimumFulfillment.findFirst.mockResolvedValue(null);
      mockPrisma.drinkMinimumFulfillment.create.mockResolvedValue({
        id: "dmf1",
      });

      const result = await trackDrinkMinimumFulfillment("e1", "u1", 12, 1);

      expect(result.currentSpend).toBe(12);
      expect(result.currentCount).toBe(1);
      expect(result.isFulfilled).toBe(false);
      expect(result.remainingSpend).toBe(8);
      expect(result.remainingCount).toBe(1);
    });

    it("updates existing fulfillment and marks as fulfilled", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue({
        id: "dm1",
        minimumCount: 2,
        minimumSpend: 20,
      });
      mockPrisma.drinkMinimumFulfillment.findFirst.mockResolvedValue({
        id: "dmf1",
        currentSpend: 12,
        currentCount: 1,
      });
      mockPrisma.drinkMinimumFulfillment.update.mockResolvedValue({
        id: "dmf1",
      });

      const result = await trackDrinkMinimumFulfillment("e1", "u1", 10, 1);

      expect(result.currentSpend).toBe(22);
      expect(result.currentCount).toBe(2);
      expect(result.isFulfilled).toBe(true);
      expect(result.remainingSpend).toBe(0);
      expect(result.remainingCount).toBe(0);
    });

    it("throws when no drink minimum set", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue(null);

      await expect(
        trackDrinkMinimumFulfillment("e1", "u1", 10)
      ).rejects.toThrow("No drink minimum set for this event");
    });
  });

  /* ── getDrinkMinimumStatus ─────────────────────────────────────────── */

  describe("getDrinkMinimumStatus", () => {
    it("returns fulfillment status for a customer", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue({
        id: "dm1",
        minimumCount: 2,
        minimumSpend: null,
      });
      mockPrisma.drinkMinimumFulfillment.findFirst.mockResolvedValue({
        currentSpend: 15,
        currentCount: 3,
      });

      const result = await getDrinkMinimumStatus("e1", "u1");

      expect(result).not.toBeNull();
      expect(result!.isFulfilled).toBe(true);
      expect(result!.remainingCount).toBe(0);
    });

    it("returns null when no drink minimum exists", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue(null);

      const result = await getDrinkMinimumStatus("e1", "u1");

      expect(result).toBeNull();
    });

    it("returns unfulfilled status for new customer", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue({
        id: "dm1",
        minimumCount: 2,
        minimumSpend: 20,
      });
      mockPrisma.drinkMinimumFulfillment.findFirst.mockResolvedValue(null);

      const result = await getDrinkMinimumStatus("e1", "u1");

      expect(result).not.toBeNull();
      expect(result!.isFulfilled).toBe(false);
      expect(result!.currentSpend).toBe(0);
      expect(result!.currentCount).toBe(0);
      expect(result!.remainingSpend).toBe(20);
      expect(result!.remainingCount).toBe(2);
    });
  });

  /* ── getEventFulfillmentSummary ────────────────────────────────────── */

  describe("getEventFulfillmentSummary", () => {
    it("returns summary of fulfillment status", async () => {
      mockPrisma.drinkMinimumFulfillment.findMany.mockResolvedValue([
        { isFulfilled: true, currentSpend: 25 },
        { isFulfilled: true, currentSpend: 22 },
        { isFulfilled: false, currentSpend: 8 },
      ]);

      const result = await getEventFulfillmentSummary("e1");

      expect(result.total).toBe(3);
      expect(result.fulfilled).toBe(2);
      expect(result.unfulfilled).toBe(1);
      expect(result.fulfillmentRate).toBe(0.67);
      expect(result.totalSpend).toBe(55);
    });

    it("returns zeros when no fulfillment records", async () => {
      mockPrisma.drinkMinimumFulfillment.findMany.mockResolvedValue([]);

      const result = await getEventFulfillmentSummary("e1");

      expect(result.total).toBe(0);
      expect(result.fulfilled).toBe(0);
      expect(result.fulfillmentRate).toBe(0);
      expect(result.totalSpend).toBe(0);
    });
  });
});
