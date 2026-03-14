import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTableLayout,
  getTableLayouts,
  setDrinkMinimum,
  getDrinkMinimums,
  processWalkUpSale,
  getWalkUpSales,
  addToCompList,
  updateCompStatus,
  getCompList,
  createStaffShift,
  getStaffSchedule,
  registerPOSIntegration,
  logCapacity,
  getCapacityStatus,
  createMenuItem,
  getMenu,
  createPreOrder,
  getPreOrders,
} from "./venue-ops";

vi.mock("./prisma", () => ({
  prisma: {
    tableLayout: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    drinkMinimum: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    walkUpSale: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    compListEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    staffShift: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    pOSIntegration: {
      upsert: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
    },
    venueCapacityLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    menuItem: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    preOrder: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  tableLayout: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  drinkMinimum: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  walkUpSale: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  compListEntry: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  staffShift: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  pOSIntegration: {
    upsert: ReturnType<typeof vi.fn>;
  };
  venue: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  venueCapacityLog: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  menuItem: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  preOrder: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("venue-ops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Table Layouts ──────────────────────────────────────────────────────────

  describe("createTableLayout", () => {
    it("creates a table layout", async () => {
      const layout = {
        id: "tl1",
        venueId: "v1",
        name: "Main Room",
        rows: 10,
        columns: 8,
        seats: [],
        isDefault: false,
      };
      mockPrisma.tableLayout.create.mockResolvedValue(layout);

      const result = await createTableLayout("v1", {
        name: "Main Room",
        rows: 10,
        columns: 8,
        seats: [],
      });

      expect(result).toEqual(layout);
      expect(mockPrisma.tableLayout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ venueId: "v1", name: "Main Room" }),
      });
    });

    it("clears existing defaults when setting new default", async () => {
      mockPrisma.tableLayout.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.tableLayout.create.mockResolvedValue({ id: "tl2", isDefault: true });

      await createTableLayout("v1", {
        name: "VIP Section",
        rows: 4,
        columns: 4,
        seats: [],
        isDefault: true,
      });

      expect(mockPrisma.tableLayout.updateMany).toHaveBeenCalledWith({
        where: { venueId: "v1", isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe("getTableLayouts", () => {
    it("returns layouts for a venue", async () => {
      const layouts = [{ id: "tl1" }, { id: "tl2" }];
      mockPrisma.tableLayout.findMany.mockResolvedValue(layouts);

      const result = await getTableLayouts("v1");

      expect(result).toEqual(layouts);
      expect(mockPrisma.tableLayout.findMany).toHaveBeenCalledWith({
        where: { venueId: "v1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // ── Drink Minimums ─────────────────────────────────────────────────────────

  describe("setDrinkMinimum", () => {
    it("creates a new drink minimum", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue(null);
      mockPrisma.drinkMinimum.create.mockResolvedValue({
        id: "dm1",
        eventId: "e1",
        ticketType: "GA",
        minimumCount: 2,
      });

      const result = await setDrinkMinimum("e1", "GA", { minimumCount: 2 });

      expect(result.ticketType).toBe("GA");
      expect(mockPrisma.drinkMinimum.create).toHaveBeenCalled();
    });

    it("updates existing drink minimum", async () => {
      mockPrisma.drinkMinimum.findFirst.mockResolvedValue({
        id: "dm1",
        eventId: "e1",
        ticketType: "GA",
        minimumCount: 2,
        minimumSpend: null,
        enforceAt: "door",
      });
      mockPrisma.drinkMinimum.update.mockResolvedValue({
        id: "dm1",
        minimumCount: 3,
      });

      const result = await setDrinkMinimum("e1", "GA", { minimumCount: 3 });

      expect(mockPrisma.drinkMinimum.update).toHaveBeenCalledWith({
        where: { id: "dm1" },
        data: expect.objectContaining({ minimumCount: 3 }),
      });
    });
  });

  describe("getDrinkMinimums", () => {
    it("returns drink minimums for an event", async () => {
      const minimums = [{ id: "dm1", ticketType: "GA" }];
      mockPrisma.drinkMinimum.findMany.mockResolvedValue(minimums);

      const result = await getDrinkMinimums("e1");

      expect(result).toEqual(minimums);
    });
  });

  // ── Walk-Up Sales ──────────────────────────────────────────────────────────

  describe("processWalkUpSale", () => {
    it("records a walk-up sale", async () => {
      const sale = {
        id: "ws1",
        eventId: "e1",
        ticketType: "GA",
        amount: 25,
        paymentMethod: "cash",
      };
      mockPrisma.walkUpSale.create.mockResolvedValue(sale);

      const result = await processWalkUpSale("e1", {
        ticketType: "GA",
        amount: 25,
        paymentMethod: "cash",
      });

      expect(result).toEqual(sale);
    });

    it("rejects negative amounts", async () => {
      await expect(
        processWalkUpSale("e1", {
          ticketType: "GA",
          amount: -10,
          paymentMethod: "cash",
        })
      ).rejects.toThrow("Amount cannot be negative");
    });

    it("rejects invalid payment methods", async () => {
      await expect(
        processWalkUpSale("e1", {
          ticketType: "GA",
          amount: 25,
          paymentMethod: "bitcoin",
        })
      ).rejects.toThrow("Invalid payment method: bitcoin");
    });
  });

  describe("getWalkUpSales", () => {
    it("returns walk-up sales for an event", async () => {
      mockPrisma.walkUpSale.findMany.mockResolvedValue([{ id: "ws1" }]);

      const result = await getWalkUpSales("e1");

      expect(result).toHaveLength(1);
    });
  });

  // ── Comp List ──────────────────────────────────────────────────────────────

  describe("addToCompList", () => {
    it("adds a guest to the comp list", async () => {
      mockPrisma.compListEntry.findFirst.mockResolvedValue(null);
      mockPrisma.compListEntry.create.mockResolvedValue({
        id: "cl1",
        guestName: "John Doe",
        status: "pending",
      });

      const result = await addToCompList("e1", {
        guestName: "John Doe",
        guestEmail: "john@example.com",
        tickets: 2,
        reason: "industry",
      });

      expect(result.guestName).toBe("John Doe");
      expect(result.status).toBe("pending");
    });

    it("rejects duplicate comp entries", async () => {
      mockPrisma.compListEntry.findFirst.mockResolvedValue({
        id: "cl1",
        guestEmail: "john@example.com",
        status: "pending",
      });

      await expect(
        addToCompList("e1", {
          guestName: "John Doe",
          guestEmail: "john@example.com",
        })
      ).rejects.toThrow("Guest already on comp list for this event");
    });

    it("auto-approves when approvedBy is provided", async () => {
      mockPrisma.compListEntry.findFirst.mockResolvedValue(null);
      mockPrisma.compListEntry.create.mockResolvedValue({
        id: "cl1",
        status: "approved",
        approvedBy: "manager1",
      });

      await addToCompList("e1", {
        guestName: "VIP Guest",
        approvedBy: "manager1",
      });

      expect(mockPrisma.compListEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "approved",
          approvedBy: "manager1",
        }),
      });
    });
  });

  describe("updateCompStatus", () => {
    it("approves a pending comp entry", async () => {
      mockPrisma.compListEntry.findUnique.mockResolvedValue({
        id: "cl1",
        status: "pending",
        approvedBy: null,
        checkedIn: false,
      });
      mockPrisma.compListEntry.update.mockResolvedValue({
        id: "cl1",
        status: "approved",
      });

      const result = await updateCompStatus("cl1", "approved", "manager1");

      expect(result.status).toBe("approved");
    });

    it("rejects invalid status", async () => {
      await expect(
        updateCompStatus("cl1", "invalid")
      ).rejects.toThrow("Invalid status: invalid");
    });

    it("rejects invalid status transitions", async () => {
      mockPrisma.compListEntry.findUnique.mockResolvedValue({
        id: "cl1",
        status: "used",
        approvedBy: "manager1",
        checkedIn: true,
      });

      await expect(
        updateCompStatus("cl1", "pending")
      ).rejects.toThrow("Cannot transition from used to pending");
    });

    it("throws when entry not found", async () => {
      mockPrisma.compListEntry.findUnique.mockResolvedValue(null);

      await expect(
        updateCompStatus("nonexistent", "approved")
      ).rejects.toThrow("Comp list entry not found");
    });
  });

  describe("getCompList", () => {
    it("returns comp list for an event", async () => {
      mockPrisma.compListEntry.findMany.mockResolvedValue([
        { id: "cl1", guestName: "A" },
        { id: "cl2", guestName: "B" },
      ]);

      const result = await getCompList("e1");

      expect(result).toHaveLength(2);
    });
  });

  // ── Staff Schedule ─────────────────────────────────────────────────────────

  describe("createStaffShift", () => {
    it("creates a staff shift", async () => {
      const start = new Date("2026-03-15T18:00:00Z");
      const end = new Date("2026-03-15T23:00:00Z");
      mockPrisma.staffShift.create.mockResolvedValue({
        id: "ss1",
        staffName: "Alice",
        role: "door",
      });

      const result = await createStaffShift("v1", {
        staffName: "Alice",
        role: "door",
        startTime: start,
        endTime: end,
      });

      expect(result.staffName).toBe("Alice");
    });

    it("rejects when end time is before start time", async () => {
      const start = new Date("2026-03-15T23:00:00Z");
      const end = new Date("2026-03-15T18:00:00Z");

      await expect(
        createStaffShift("v1", {
          staffName: "Alice",
          role: "door",
          startTime: start,
          endTime: end,
        })
      ).rejects.toThrow("End time must be after start time");
    });

    it("rejects invalid roles", async () => {
      const start = new Date("2026-03-15T18:00:00Z");
      const end = new Date("2026-03-15T23:00:00Z");

      await expect(
        createStaffShift("v1", {
          staffName: "Alice",
          role: "dj",
          startTime: start,
          endTime: end,
        })
      ).rejects.toThrow("Invalid role: dj");
    });
  });

  describe("getStaffSchedule", () => {
    it("returns shifts within date range", async () => {
      mockPrisma.staffShift.findMany.mockResolvedValue([{ id: "ss1" }]);

      const result = await getStaffSchedule("v1", {
        start: new Date("2026-03-15"),
        end: new Date("2026-03-16"),
      });

      expect(result).toHaveLength(1);
    });
  });

  // ── POS Integration ────────────────────────────────────────────────────────

  describe("registerPOSIntegration", () => {
    it("registers a POS integration", async () => {
      mockPrisma.pOSIntegration.upsert.mockResolvedValue({
        id: "pos1",
        provider: "square",
        isActive: true,
      });

      const result = await registerPOSIntegration("v1", "square", {
        apiKey: "sk_test_123",
        locationId: "loc1",
      });

      expect(result.provider).toBe("square");
      expect(result.isActive).toBe(true);
    });

    it("rejects invalid POS providers", async () => {
      await expect(
        registerPOSIntegration("v1", "stripe", { apiKey: "key" })
      ).rejects.toThrow("Invalid POS provider: stripe");
    });
  });

  // ── Capacity Tracking ──────────────────────────────────────────────────────

  describe("logCapacity", () => {
    it("logs venue capacity", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue({ capacity: 200 });
      mockPrisma.venueCapacityLog.create.mockResolvedValue({
        id: "cap1",
        currentCount: 150,
        maxCapacity: 200,
      });

      const result = await logCapacity("v1", "e1", 150, "checkin");

      expect(result.currentCount).toBe(150);
    });

    it("throws when capacity exceeded", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue({ capacity: 200 });

      await expect(
        logCapacity("v1", "e1", 250, "checkin")
      ).rejects.toThrow("Capacity exceeded");
    });

    it("throws when venue not found", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        logCapacity("v1", "e1", 50, "checkin")
      ).rejects.toThrow("Venue not found");
    });
  });

  describe("getCapacityStatus", () => {
    it("returns current capacity status", async () => {
      mockPrisma.venueCapacityLog.findFirst.mockResolvedValue({
        currentCount: 150,
        maxCapacity: 200,
        timestamp: new Date(),
      });

      const result = await getCapacityStatus("v1", "e1");

      expect(result.currentCount).toBe(150);
      expect(result.maxCapacity).toBe(200);
      expect(result.percentFull).toBe(75);
    });

    it("returns empty status when no logs exist", async () => {
      mockPrisma.venueCapacityLog.findFirst.mockResolvedValue(null);
      mockPrisma.venue.findUnique.mockResolvedValue({ capacity: 200 });

      const result = await getCapacityStatus("v1");

      expect(result.currentCount).toBe(0);
      expect(result.maxCapacity).toBe(200);
      expect(result.percentFull).toBe(0);
      expect(result.lastUpdated).toBeNull();
    });
  });

  // ── Menu Items ─────────────────────────────────────────────────────────────

  describe("createMenuItem", () => {
    it("creates a menu item", async () => {
      mockPrisma.menuItem.create.mockResolvedValue({
        id: "mi1",
        name: "Craft Beer",
        price: 8.5,
        category: "drinks",
      });

      const result = await createMenuItem("v1", {
        category: "drinks",
        name: "Craft Beer",
        price: 8.5,
      });

      expect(result.name).toBe("Craft Beer");
    });

    it("rejects negative prices", async () => {
      await expect(
        createMenuItem("v1", {
          category: "drinks",
          name: "Free Beer",
          price: -5,
        })
      ).rejects.toThrow("Price cannot be negative");
    });
  });

  describe("getMenu", () => {
    it("returns menu grouped by category", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: "mi1", category: "drinks", name: "Beer" },
        { id: "mi2", category: "drinks", name: "Wine" },
        { id: "mi3", category: "food", name: "Nachos" },
      ]);

      const result = await getMenu("v1");

      expect(Object.keys(result)).toEqual(["drinks", "food"]);
      expect(result["drinks"]).toHaveLength(2);
      expect(result["food"]).toHaveLength(1);
    });
  });

  // ── Pre-Orders ─────────────────────────────────────────────────────────────

  describe("createPreOrder", () => {
    it("creates a pre-order", async () => {
      mockPrisma.preOrder.create.mockResolvedValue({
        id: "po1",
        customerName: "Jane",
        totalAmount: 25,
        status: "pending",
      });

      const result = await createPreOrder("e1", {
        customerName: "Jane",
        items: [{ menuItemId: "mi1", quantity: 2 }],
        totalAmount: 25,
      });

      expect(result.customerName).toBe("Jane");
      expect(result.status).toBe("pending");
    });

    it("rejects empty items array", async () => {
      await expect(
        createPreOrder("e1", {
          customerName: "Jane",
          items: [],
          totalAmount: 0,
        })
      ).rejects.toThrow("Pre-order must contain at least one item");
    });

    it("rejects negative total amount", async () => {
      await expect(
        createPreOrder("e1", {
          customerName: "Jane",
          items: [{ menuItemId: "mi1", quantity: 1 }],
          totalAmount: -10,
        })
      ).rejects.toThrow("Total amount cannot be negative");
    });
  });

  describe("getPreOrders", () => {
    it("returns pre-orders for an event", async () => {
      mockPrisma.preOrder.findMany.mockResolvedValue([
        { id: "po1", status: "pending" },
        { id: "po2", status: "confirmed" },
      ]);

      const result = await getPreOrders("e1");

      expect(result).toHaveLength(2);
    });
  });
});
