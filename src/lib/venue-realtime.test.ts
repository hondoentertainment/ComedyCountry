import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildVenueDashboardSnapshot,
  createDashboardStream,
} from "./venue-realtime";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      findUnique: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    venueCapacityLog: {
      findFirst: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    walkUpSale: {
      findMany: vi.fn(),
    },
    preOrder: {
      findMany: vi.fn(),
    },
    ticketWaitlistQueue: {
      count: vi.fn(),
    },
    staffShift: {
      findMany: vi.fn(),
    },
    ticketType: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  venue: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  event: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  venueCapacityLog: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  walkUpSale: {
    findMany: ReturnType<typeof vi.fn>;
  };
  preOrder: {
    findMany: ReturnType<typeof vi.fn>;
  };
  ticketWaitlistQueue: {
    count: ReturnType<typeof vi.fn>;
  };
  staffShift: {
    findMany: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

function setupDefaultMocks(overrides: Record<string, unknown> = {}) {
  mockPrisma.venue.findUnique.mockResolvedValue(
    overrides.venue !== undefined ? overrides.venue : { capacity: 200 }
  );
  mockPrisma.event.findUnique.mockResolvedValue(
    overrides.event !== undefined ? overrides.event : { id: "event-1" }
  );
  mockPrisma.venueCapacityLog.findFirst.mockResolvedValue(
    overrides.capacityLog !== undefined
      ? overrides.capacityLog
      : { currentCount: 75 }
  );
  mockPrisma.ticket.findMany.mockResolvedValue(
    overrides.tickets !== undefined ? overrides.tickets : []
  );
  // ticket.count is called twice: once for recentTickets, once for scannedTickets
  if (overrides.ticketCounts) {
    const counts = overrides.ticketCounts as number[];
    counts.forEach((c) => mockPrisma.ticket.count.mockResolvedValueOnce(c));
  } else {
    mockPrisma.ticket.count.mockResolvedValue(0);
  }
  mockPrisma.walkUpSale.findMany.mockResolvedValue(
    overrides.walkUpSales !== undefined ? overrides.walkUpSales : []
  );
  mockPrisma.preOrder.findMany.mockResolvedValue(
    overrides.preOrders !== undefined ? overrides.preOrders : []
  );
  // ticketWaitlistQueue.count is called 3 times (WAITING, OFFERED, CLAIMED)
  if (overrides.waitlistCounts) {
    const counts = overrides.waitlistCounts as number[];
    counts.forEach((c) =>
      mockPrisma.ticketWaitlistQueue.count.mockResolvedValueOnce(c)
    );
  } else {
    mockPrisma.ticketWaitlistQueue.count.mockResolvedValue(0);
  }
  mockPrisma.staffShift.findMany.mockResolvedValue(
    overrides.staff !== undefined ? overrides.staff : []
  );
  mockPrisma.ticketType.findMany.mockResolvedValue(
    overrides.ticketTypes !== undefined ? overrides.ticketTypes : []
  );
}

describe("venue-realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("buildVenueDashboardSnapshot", () => {
    it("returns a complete snapshot with all sections populated", async () => {
      setupDefaultMocks({
        venue: { capacity: 300 },
        capacityLog: { currentCount: 120 },
        tickets: [
          { purchasePrice: 25, createdAt: new Date(), scannedAt: null },
          { purchasePrice: 30, createdAt: new Date(), scannedAt: new Date() },
          { purchasePrice: 50, createdAt: new Date(), scannedAt: null },
        ],
        ticketCounts: [2, 1], // recentTickets=2, scannedTickets=1
        walkUpSales: [
          { amount: 20, paymentMethod: "cash", quantity: 2 },
          { amount: 15, paymentMethod: "card", quantity: 1 },
          { amount: 0, paymentMethod: "comp", quantity: 3 },
        ],
        preOrders: [{ totalAmount: 45 }, { totalAmount: 30 }],
        waitlistCounts: [5, 2, 1],
        staff: [
          {
            staffName: "Alice",
            role: "bartender",
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
        ticketTypes: [{ capacity: 100 }, { capacity: 50 }],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.eventId).toBe("event-1");
      expect(result.timestamp).toBeDefined();

      // Capacity
      expect(result.capacity).toEqual({
        current: 120,
        max: 300,
        percentFull: 40,
      });

      // Tickets
      expect(result.tickets.totalSold).toBe(3);
      expect(result.tickets.totalCapacity).toBe(150);
      expect(result.tickets.percentSold).toBe(2); // round(3/150*100) = 2
      expect(result.tickets.recentSales).toBe(2);
      expect(result.tickets.salesVelocity).toBe(4); // 2 * 2

      // Walk-ups
      expect(result.walkUps).toEqual({
        total: 6, // 2+1+3
        totalRevenue: 35, // 20+15+0
        cash: 2,
        card: 1,
        comp: 3,
      });

      // Check-ins
      expect(result.checkIns).toEqual({
        checkedIn: 1,
        totalTickets: 3,
        percentCheckedIn: 33, // round(1/3*100)
      });

      // Revenue
      expect(result.revenue).toEqual({
        ticketRevenue: 105, // 25+30+50
        walkUpRevenue: 35,
        preOrderRevenue: 75, // 45+30
        totalRevenue: 215,
      });

      // Waitlist
      expect(result.waitlist).toEqual({
        waiting: 5,
        offered: 2,
        claimed: 1,
      });

      // Staff
      expect(result.staff).toEqual([
        { name: "Alice", role: "bartender", status: "on-shift" },
      ]);
    });

    it("throws when event is not found", async () => {
      setupDefaultMocks({ event: null });

      await expect(
        buildVenueDashboardSnapshot("venue-1", "event-1")
      ).rejects.toThrow("Event not found");
    });

    it("defaults capacity to 0 when venue is not found", async () => {
      setupDefaultMocks({ venue: null });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.capacity.max).toBe(0);
      expect(result.capacity.percentFull).toBe(0);
    });

    it("defaults currentCount to 0 when no capacity log exists", async () => {
      setupDefaultMocks({ capacityLog: null });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.capacity.current).toBe(0);
      expect(result.capacity.percentFull).toBe(0);
    });

    it("handles zero ticket capacity without division error", async () => {
      setupDefaultMocks({
        ticketTypes: [],
        tickets: [{ purchasePrice: 10, createdAt: new Date(), scannedAt: null }],
        ticketCounts: [0, 0],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.tickets.totalCapacity).toBe(0);
      expect(result.tickets.percentSold).toBe(0);
    });

    it("handles zero tickets sold without division error for checkIns", async () => {
      setupDefaultMocks({
        tickets: [],
        ticketCounts: [0, 0],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.checkIns.checkedIn).toBe(0);
      expect(result.checkIns.totalTickets).toBe(0);
      expect(result.checkIns.percentCheckedIn).toBe(0);
    });

    it("rounds revenue to two decimal places", async () => {
      setupDefaultMocks({
        tickets: [
          { purchasePrice: 10.555, createdAt: new Date(), scannedAt: null },
        ],
        ticketCounts: [0, 0],
        walkUpSales: [{ amount: 5.555, paymentMethod: "cash", quantity: 1 }],
        preOrders: [{ totalAmount: 3.335 }],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.revenue.ticketRevenue).toBe(10.56);
      expect(result.revenue.walkUpRevenue).toBe(5.56);
      expect(result.revenue.preOrderRevenue).toBe(3.34);
      expect(result.revenue.totalRevenue).toBe(19.45);
    });

    it("handles tickets with null purchasePrice", async () => {
      setupDefaultMocks({
        tickets: [
          { purchasePrice: null, createdAt: new Date(), scannedAt: null },
          { purchasePrice: 20, createdAt: new Date(), scannedAt: null },
        ],
        ticketCounts: [0, 0],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.revenue.ticketRevenue).toBe(20);
      expect(result.tickets.totalSold).toBe(2);
    });

    it("returns empty staff array when no one is on shift", async () => {
      setupDefaultMocks({ staff: [] });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.staff).toEqual([]);
    });

    it("maps multiple staff members correctly", async () => {
      setupDefaultMocks({
        staff: [
          {
            staffName: "Bob",
            role: "doorman",
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            staffName: "Carol",
            role: "manager",
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.staff).toHaveLength(2);
      expect(result.staff[0]).toEqual({
        name: "Bob",
        role: "doorman",
        status: "on-shift",
      });
      expect(result.staff[1]).toEqual({
        name: "Carol",
        role: "manager",
        status: "on-shift",
      });
    });

    it("categorizes walk-up sales by payment method correctly", async () => {
      setupDefaultMocks({
        walkUpSales: [
          { amount: 10, paymentMethod: "cash", quantity: 1 },
          { amount: 10, paymentMethod: "cash", quantity: 2 },
          { amount: 20, paymentMethod: "card", quantity: 3 },
          { amount: 0, paymentMethod: "comp", quantity: 5 },
        ],
      });

      const result = await buildVenueDashboardSnapshot("venue-1", "event-1");

      expect(result.walkUps.cash).toBe(3); // 1+2
      expect(result.walkUps.card).toBe(3);
      expect(result.walkUps.comp).toBe(5);
      expect(result.walkUps.total).toBe(11); // 1+2+3+5
      expect(result.walkUps.totalRevenue).toBe(40); // 10+10+20+0
    });
  });

  describe("createDashboardStream", () => {
    it("sends an initial snapshot immediately", async () => {
      setupDefaultMocks();

      const stream = createDashboardStream("venue-1", "event-1", 10000);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Allow the async sendSnapshot to resolve
      await vi.advanceTimersByTimeAsync(0);

      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toMatch(/^data: /);
      const parsed = JSON.parse(text.replace("data: ", "").trim());
      expect(parsed.eventId).toBe("event-1");

      reader.cancel();
    });

    it("sends periodic snapshots at the specified interval", async () => {
      setupDefaultMocks();

      const stream = createDashboardStream("venue-1", "event-1", 1000);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Initial snapshot
      await vi.advanceTimersByTimeAsync(0);
      await reader.read();

      // Re-setup mocks for second call since they were consumed
      setupDefaultMocks();

      // Advance past one interval
      await vi.advanceTimersByTimeAsync(1000);

      const { value } = await reader.read();
      const text = decoder.decode(value);
      const parsed = JSON.parse(text.replace("data: ", "").trim());
      expect(parsed.eventId).toBe("event-1");

      reader.cancel();
    });

    it("sends error message when snapshot building fails", async () => {
      setupDefaultMocks({ event: null });

      const stream = createDashboardStream("venue-1", "event-1", 10000);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      await vi.advanceTimersByTimeAsync(0);

      const { value } = await reader.read();
      const text = decoder.decode(value);
      const parsed = JSON.parse(text.replace("data: ", "").trim());

      expect(parsed.error).toBe("Event not found");

      reader.cancel();
    });

    it("clears the interval timer when stream is cancelled", async () => {
      setupDefaultMocks();
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const stream = createDashboardStream("venue-1", "event-1", 5000);
      const reader = stream.getReader();

      // Allow initial snapshot to fire
      await vi.advanceTimersByTimeAsync(0);
      await reader.read();

      // Cancel the stream
      await reader.cancel();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("uses default interval of 5000ms when not specified", async () => {
      setupDefaultMocks();
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      const stream = createDashboardStream("venue-1", "event-1");
      const reader = stream.getReader();

      await vi.advanceTimersByTimeAsync(0);
      await reader.read();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      reader.cancel();
      setIntervalSpy.mockRestore();
    });
  });
});
