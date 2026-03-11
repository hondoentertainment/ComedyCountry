import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the venue-ops lib
const mockCreateTableLayout = vi.fn();
const mockGetTableLayouts = vi.fn();
const mockSetDrinkMinimum = vi.fn();
const mockGetDrinkMinimums = vi.fn();
const mockProcessWalkUpSale = vi.fn();
const mockGetWalkUpSales = vi.fn();
const mockAddToCompList = vi.fn();
const mockUpdateCompStatus = vi.fn();
const mockGetCompList = vi.fn();
const mockCreateStaffShift = vi.fn();
const mockGetStaffSchedule = vi.fn();
const mockRegisterPOSIntegration = vi.fn();
const mockLogCapacity = vi.fn();
const mockGetCapacityStatus = vi.fn();
const mockCreateMenuItem = vi.fn();
const mockGetMenu = vi.fn();
const mockCreatePreOrder = vi.fn();
const mockGetPreOrders = vi.fn();

vi.mock("@/lib/venue-ops", () => ({
  createTableLayout: (...args: unknown[]) => mockCreateTableLayout(...args),
  getTableLayouts: (...args: unknown[]) => mockGetTableLayouts(...args),
  setDrinkMinimum: (...args: unknown[]) => mockSetDrinkMinimum(...args),
  getDrinkMinimums: (...args: unknown[]) => mockGetDrinkMinimums(...args),
  processWalkUpSale: (...args: unknown[]) => mockProcessWalkUpSale(...args),
  getWalkUpSales: (...args: unknown[]) => mockGetWalkUpSales(...args),
  addToCompList: (...args: unknown[]) => mockAddToCompList(...args),
  updateCompStatus: (...args: unknown[]) => mockUpdateCompStatus(...args),
  getCompList: (...args: unknown[]) => mockGetCompList(...args),
  createStaffShift: (...args: unknown[]) => mockCreateStaffShift(...args),
  getStaffSchedule: (...args: unknown[]) => mockGetStaffSchedule(...args),
  registerPOSIntegration: (...args: unknown[]) => mockRegisterPOSIntegration(...args),
  logCapacity: (...args: unknown[]) => mockLogCapacity(...args),
  getCapacityStatus: (...args: unknown[]) => mockGetCapacityStatus(...args),
  createMenuItem: (...args: unknown[]) => mockCreateMenuItem(...args),
  getMenu: (...args: unknown[]) => mockGetMenu(...args),
  createPreOrder: (...args: unknown[]) => mockCreatePreOrder(...args),
  getPreOrders: (...args: unknown[]) => mockGetPreOrders(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pOSIntegration: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { GET as getTableLayouts, POST as postTableLayout } from "./table-layouts/route";
import { GET as getDrinkMinimums, POST as postDrinkMinimum } from "./drink-minimums/route";
import { GET as getWalkUpSales, POST as postWalkUpSale } from "./walk-up-sales/route";
import { GET as getCompList, POST as postCompList } from "./comp-list/route";
import { PATCH as patchComp } from "./comp-list/[id]/route";
import { GET as getStaffSchedule, POST as postStaffShift } from "./staff-schedule/route";
import { GET as getPosIntegrations, POST as postPosIntegration } from "./pos-integrations/route";
import { GET as getCapacity, POST as postCapacity } from "./capacity/route";
import { GET as getMenuRoute, POST as postMenuItem } from "./menu/route";
import { GET as getPreOrders, POST as postPreOrder } from "./pre-orders/route";

function makeRequest(url: string, method = "GET", body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return req;
}

describe("venue-ops API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Table Layouts ──────────────────────────────────────────────────────────

  describe("table-layouts", () => {
    it("GET returns 400 without venueId", async () => {
      const req = makeRequest("http://localhost/api/venue-ops/table-layouts");
      const res = await getTableLayouts(req);
      expect(res.status).toBe(400);
    });

    it("GET returns layouts", async () => {
      mockGetTableLayouts.mockResolvedValue([{ id: "tl1" }]);
      const req = makeRequest("http://localhost/api/venue-ops/table-layouts?venueId=v1");
      const res = await getTableLayouts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("POST creates a layout", async () => {
      mockCreateTableLayout.mockResolvedValue({ id: "tl1", name: "Main Room" });
      const req = makeRequest("http://localhost/api/venue-ops/table-layouts", "POST", {
        venueId: "v1",
        name: "Main Room",
        rows: 10,
        columns: 8,
        seats: [],
      });
      const res = await postTableLayout(req);
      expect(res.status).toBe(201);
    });

    it("POST returns 400 without venueId", async () => {
      const req = makeRequest("http://localhost/api/venue-ops/table-layouts", "POST", {
        name: "Main Room",
      });
      const res = await postTableLayout(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Drink Minimums ─────────────────────────────────────────────────────────

  describe("drink-minimums", () => {
    it("GET returns minimums", async () => {
      mockGetDrinkMinimums.mockResolvedValue([{ id: "dm1" }]);
      const req = makeRequest("http://localhost/api/venue-ops/drink-minimums?eventId=e1");
      const res = await getDrinkMinimums(req);
      expect(res.status).toBe(200);
    });

    it("POST creates a minimum", async () => {
      mockSetDrinkMinimum.mockResolvedValue({ id: "dm1" });
      const req = makeRequest("http://localhost/api/venue-ops/drink-minimums", "POST", {
        eventId: "e1",
        ticketType: "GA",
        minimumCount: 2,
      });
      const res = await postDrinkMinimum(req);
      expect(res.status).toBe(201);
    });
  });

  // ── Walk-Up Sales ──────────────────────────────────────────────────────────

  describe("walk-up-sales", () => {
    it("POST records a walk-up sale", async () => {
      mockProcessWalkUpSale.mockResolvedValue({ id: "ws1", amount: 25 });
      const req = makeRequest("http://localhost/api/venue-ops/walk-up-sales", "POST", {
        eventId: "e1",
        ticketType: "GA",
        amount: 25,
        paymentMethod: "cash",
      });
      const res = await postWalkUpSale(req);
      expect(res.status).toBe(201);
    });

    it("GET returns sales", async () => {
      mockGetWalkUpSales.mockResolvedValue([]);
      const req = makeRequest("http://localhost/api/venue-ops/walk-up-sales?eventId=e1");
      const res = await getWalkUpSales(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Comp List ──────────────────────────────────────────────────────────────

  describe("comp-list", () => {
    it("POST adds to comp list", async () => {
      mockAddToCompList.mockResolvedValue({ id: "cl1", guestName: "John" });
      const req = makeRequest("http://localhost/api/venue-ops/comp-list", "POST", {
        eventId: "e1",
        guestName: "John Doe",
      });
      const res = await postCompList(req);
      expect(res.status).toBe(201);
    });

    it("GET returns comp list", async () => {
      mockGetCompList.mockResolvedValue([{ id: "cl1" }]);
      const req = makeRequest("http://localhost/api/venue-ops/comp-list?eventId=e1");
      const res = await getCompList(req);
      expect(res.status).toBe(200);
    });

    it("PATCH updates comp status", async () => {
      mockUpdateCompStatus.mockResolvedValue({ id: "cl1", status: "approved" });
      const req = makeRequest("http://localhost/api/venue-ops/comp-list/cl1", "PATCH", {
        status: "approved",
        approvedBy: "manager1",
      });
      const res = await patchComp(req, { params: Promise.resolve({ id: "cl1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("approved");
    });

    it("PATCH returns 400 without status", async () => {
      const req = makeRequest("http://localhost/api/venue-ops/comp-list/cl1", "PATCH", {});
      const res = await patchComp(req, { params: Promise.resolve({ id: "cl1" }) });
      expect(res.status).toBe(400);
    });
  });

  // ── Staff Schedule ─────────────────────────────────────────────────────────

  describe("staff-schedule", () => {
    it("POST creates a shift", async () => {
      mockCreateStaffShift.mockResolvedValue({ id: "ss1" });
      const req = makeRequest("http://localhost/api/venue-ops/staff-schedule", "POST", {
        venueId: "v1",
        staffName: "Alice",
        role: "door",
        startTime: "2026-03-15T18:00:00Z",
        endTime: "2026-03-15T23:00:00Z",
      });
      const res = await postStaffShift(req);
      expect(res.status).toBe(201);
    });

    it("GET returns schedule", async () => {
      mockGetStaffSchedule.mockResolvedValue([{ id: "ss1" }]);
      const req = makeRequest("http://localhost/api/venue-ops/staff-schedule?venueId=v1");
      const res = await getStaffSchedule(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Capacity ───────────────────────────────────────────────────────────────

  describe("capacity", () => {
    it("POST logs capacity", async () => {
      mockLogCapacity.mockResolvedValue({ id: "cap1", currentCount: 150 });
      const req = makeRequest("http://localhost/api/venue-ops/capacity", "POST", {
        venueId: "v1",
        eventId: "e1",
        count: 150,
        source: "checkin",
      });
      const res = await postCapacity(req);
      expect(res.status).toBe(201);
    });

    it("GET returns capacity status", async () => {
      mockGetCapacityStatus.mockResolvedValue({
        currentCount: 150,
        maxCapacity: 200,
        percentFull: 75,
      });
      const req = makeRequest("http://localhost/api/venue-ops/capacity?venueId=v1");
      const res = await getCapacity(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.percentFull).toBe(75);
    });

    it("POST returns 400 without count", async () => {
      const req = makeRequest("http://localhost/api/venue-ops/capacity", "POST", {
        venueId: "v1",
      });
      const res = await postCapacity(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Menu ───────────────────────────────────────────────────────────────────

  describe("menu", () => {
    it("POST creates a menu item", async () => {
      mockCreateMenuItem.mockResolvedValue({ id: "mi1", name: "Craft Beer" });
      const req = makeRequest("http://localhost/api/venue-ops/menu", "POST", {
        venueId: "v1",
        category: "drinks",
        name: "Craft Beer",
        price: 8.5,
      });
      const res = await postMenuItem(req);
      expect(res.status).toBe(201);
    });

    it("GET returns grouped menu", async () => {
      mockGetMenu.mockResolvedValue({ drinks: [{ id: "mi1" }] });
      const req = makeRequest("http://localhost/api/venue-ops/menu?venueId=v1");
      const res = await getMenuRoute(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Pre-Orders ─────────────────────────────────────────────────────────────

  describe("pre-orders", () => {
    it("POST creates a pre-order", async () => {
      mockCreatePreOrder.mockResolvedValue({ id: "po1", status: "pending" });
      const req = makeRequest("http://localhost/api/venue-ops/pre-orders", "POST", {
        eventId: "e1",
        customerName: "Jane",
        items: [{ menuItemId: "mi1", quantity: 2 }],
        totalAmount: 17,
      });
      const res = await postPreOrder(req);
      expect(res.status).toBe(201);
    });

    it("GET returns pre-orders", async () => {
      mockGetPreOrders.mockResolvedValue([{ id: "po1" }]);
      const req = makeRequest("http://localhost/api/venue-ops/pre-orders?eventId=e1");
      const res = await getPreOrders(req);
      expect(res.status).toBe(200);
    });

    it("GET returns 400 without eventId", async () => {
      const req = makeRequest("http://localhost/api/venue-ops/pre-orders");
      const res = await getPreOrders(req);
      expect(res.status).toBe(400);
    });
  });
});
