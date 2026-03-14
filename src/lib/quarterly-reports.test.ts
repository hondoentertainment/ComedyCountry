import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getQuarterDateRange,
  getVenueCountByCity,
  getShowCountByCity,
  getTopComediansByCity,
  getAttendanceTrends,
  getRevenueBenchmarks,
  generateQuarterlyReport,
  saveQuarterlyReport,
  getQuarterlyReports,
} from "./quarterly-reports";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      count: vi.fn(),
    },
    event: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
    industryReport: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  venue: {
    count: ReturnType<typeof vi.fn>;
  };
  event: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
  };
  industryReport: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("quarterly-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── getQuarterDateRange ───────────────────────────────────────────── */

  describe("getQuarterDateRange", () => {
    it("returns correct range for Q1", () => {
      const { start, end } = getQuarterDateRange(1, 2026);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31);
    });

    it("returns correct range for Q2", () => {
      const { start, end } = getQuarterDateRange(2, 2026);
      expect(start.getMonth()).toBe(3); // April
      expect(end.getMonth()).toBe(5); // June
    });

    it("returns correct range for Q3", () => {
      const { start, end } = getQuarterDateRange(3, 2026);
      expect(start.getMonth()).toBe(6); // July
      expect(end.getMonth()).toBe(8); // September
    });

    it("returns correct range for Q4", () => {
      const { start, end } = getQuarterDateRange(4, 2026);
      expect(start.getMonth()).toBe(9); // October
      expect(end.getMonth()).toBe(11); // December
    });
  });

  /* ── getVenueCountByCity ───────────────────────────────────────────── */

  describe("getVenueCountByCity", () => {
    it("returns venue count for a city", async () => {
      mockPrisma.venue.count.mockResolvedValue(12);

      const result = await getVenueCountByCity("Austin", "TX");

      expect(result).toBe(12);
      expect(mockPrisma.venue.count).toHaveBeenCalledWith({
        where: {
          city: { equals: "Austin", mode: "insensitive" },
          state: { equals: "TX", mode: "insensitive" },
        },
      });
    });
  });

  /* ── getShowCountByCity ────────────────────────────────────────────── */

  describe("getShowCountByCity", () => {
    it("returns show count for a city in a quarter", async () => {
      mockPrisma.event.count.mockResolvedValue(45);

      const result = await getShowCountByCity("Austin", "TX", 1, 2026);

      expect(result).toBe(45);
      expect(mockPrisma.event.count).toHaveBeenCalledWith({
        where: {
          venue: {
            city: { equals: "Austin", mode: "insensitive" },
            state: { equals: "TX", mode: "insensitive" },
          },
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        },
      });
    });
  });

  /* ── getTopComediansByCity ─────────────────────────────────────────── */

  describe("getTopComediansByCity", () => {
    it("returns top comedians sorted by show count", async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        {
          comedianId: "c1",
          comedian: { id: "c1", name: "Alice Comic" },
          reviews: [{ rating: 4 }, { rating: 5 }],
        },
        {
          comedianId: "c1",
          comedian: { id: "c1", name: "Alice Comic" },
          reviews: [{ rating: 5 }],
        },
        {
          comedianId: "c2",
          comedian: { id: "c2", name: "Bob Funny" },
          reviews: [{ rating: 3 }],
        },
      ]);

      const result = await getTopComediansByCity("Austin", "TX", 1, 2026);

      expect(result).toHaveLength(2);
      expect(result[0].comedianId).toBe("c1");
      expect(result[0].showCount).toBe(2);
      expect(result[0].avgRating).toBe(4.67);
      expect(result[1].comedianId).toBe("c2");
      expect(result[1].showCount).toBe(1);
    });

    it("returns empty array when no events found", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getTopComediansByCity("Austin", "TX", 1, 2026);

      expect(result).toHaveLength(0);
    });

    it("handles events without comedians", async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        {
          comedianId: null,
          comedian: null,
          reviews: [],
        },
      ]);

      const result = await getTopComediansByCity("Austin", "TX", 1, 2026);

      expect(result).toHaveLength(0);
    });
  });

  /* ── getAttendanceTrends ───────────────────────────────────────────── */

  describe("getAttendanceTrends", () => {
    it("calculates attendance trends correctly", async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        { id: "e1", capacity: 100, _count: { tickets: 100 } },
        { id: "e2", capacity: 200, _count: { tickets: 150 } },
        { id: "e3", capacity: 50, _count: { tickets: 50 } },
      ]);

      const result = await getAttendanceTrends("Austin", "TX", 1, 2026);

      expect(result.totalTicketsSold).toBe(300);
      expect(result.avgAttendancePerShow).toBe(100);
      // 2 sell-outs out of 3 events = 0.67
      expect(result.sellOutRate).toBe(0.67);
    });

    it("returns zeros when no events", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getAttendanceTrends("Austin", "TX", 1, 2026);

      expect(result.totalTicketsSold).toBe(0);
      expect(result.avgAttendancePerShow).toBe(0);
      expect(result.sellOutRate).toBe(0);
    });
  });

  /* ── getRevenueBenchmarks ──────────────────────────────────────────── */

  describe("getRevenueBenchmarks", () => {
    it("calculates revenue benchmarks correctly", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        { price: 25, event: { id: "e1", venue: { id: "v1", name: "Club A" } } },
        { price: 30, event: { id: "e1", venue: { id: "v1", name: "Club A" } } },
        { price: 40, event: { id: "e2", venue: { id: "v2", name: "Club B" } } },
      ]);

      const result = await getRevenueBenchmarks("Austin", "TX", 1, 2026);

      expect(result.totalRevenue).toBe(95);
      expect(result.avgTicketPrice).toBe(31.67);
      // 2 unique events: 95 / 2 = 47.5
      expect(result.avgRevenuePerShow).toBe(47.5);
      expect(result.topVenuesByRevenue).toHaveLength(2);
      expect(result.topVenuesByRevenue[0].name).toBe("Club A");
      expect(result.topVenuesByRevenue[0].revenue).toBe(55);
    });

    it("returns zeros when no tickets", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await getRevenueBenchmarks("Austin", "TX", 1, 2026);

      expect(result.totalRevenue).toBe(0);
      expect(result.avgTicketPrice).toBe(0);
      expect(result.avgRevenuePerShow).toBe(0);
      expect(result.topVenuesByRevenue).toHaveLength(0);
    });
  });

  /* ── generateQuarterlyReport ───────────────────────────────────────── */

  describe("generateQuarterlyReport", () => {
    it("generates a full report", async () => {
      mockPrisma.venue.count.mockResolvedValue(10);
      mockPrisma.event.count.mockResolvedValue(30);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await generateQuarterlyReport({
        city: "Austin",
        state: "TX",
        quarter: 1,
        year: 2026,
      });

      expect(result.city).toBe("Austin");
      expect(result.state).toBe("TX");
      expect(result.quarter).toBe(1);
      expect(result.year).toBe(2026);
      expect(result.venueCount).toBe(10);
      expect(result.showCount).toBe(30);
      expect(result.topComedians).toEqual([]);
      expect(result.attendanceTrends).toBeDefined();
      expect(result.revenueBenchmarks).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it("throws for invalid quarter", async () => {
      await expect(
        generateQuarterlyReport({
          city: "Austin",
          state: "TX",
          quarter: 5 as 1 | 2 | 3 | 4,
          year: 2026,
        })
      ).rejects.toThrow("Quarter must be between 1 and 4");
    });

    it("throws for invalid year", async () => {
      await expect(
        generateQuarterlyReport({
          city: "Austin",
          state: "TX",
          quarter: 1,
          year: 1999,
        })
      ).rejects.toThrow("Year must be between 2000 and 2100");
    });
  });

  /* ── saveQuarterlyReport ───────────────────────────────────────────── */

  describe("saveQuarterlyReport", () => {
    it("upserts the report into the database", async () => {
      const report = {
        city: "Austin",
        state: "TX",
        quarter: 1,
        year: 2026,
        venueCount: 10,
        showCount: 30,
        topComedians: [],
        attendanceTrends: {
          totalTicketsSold: 500,
          avgAttendancePerShow: 50,
          sellOutRate: 0.3,
        },
        revenueBenchmarks: {
          totalRevenue: 12500,
          avgRevenuePerShow: 417,
          avgTicketPrice: 25,
          topVenuesByRevenue: [],
        },
        generatedAt: new Date("2026-03-01"),
      };

      const saved = { id: "ir1", ...report };
      mockPrisma.industryReport.upsert.mockResolvedValue(saved);

      const result = await saveQuarterlyReport(report);

      expect(result).toEqual(saved);
      expect(mockPrisma.industryReport.upsert).toHaveBeenCalledWith({
        where: {
          city_state_quarter: {
            city: "Austin",
            state: "TX",
            quarter: "Q1",
          },
        },
        update: expect.objectContaining({
          year: 2026,
        }),
        create: expect.objectContaining({
          city: "Austin",
          state: "TX",
          quarter: "Q1",
          year: 2026,
        }),
      });
    });
  });

  /* ── getQuarterlyReports ───────────────────────────────────────────── */

  describe("getQuarterlyReports", () => {
    it("returns filtered reports", async () => {
      const reports = [
        { id: "ir1", city: "Austin", state: "TX", quarter: "Q1", year: 2026 },
      ];
      mockPrisma.industryReport.findMany.mockResolvedValue(reports);

      const result = await getQuarterlyReports({ city: "Austin", year: 2026 });

      expect(result).toEqual(reports);
      expect(mockPrisma.industryReport.findMany).toHaveBeenCalledWith({
        where: {
          city: { equals: "Austin", mode: "insensitive" },
          year: 2026,
        },
        orderBy: [{ year: "desc" }, { quarter: "desc" }],
        take: 50,
      });
    });

    it("returns all reports when no filters provided", async () => {
      mockPrisma.industryReport.findMany.mockResolvedValue([]);

      await getQuarterlyReports({});

      expect(mockPrisma.industryReport.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ year: "desc" }, { quarter: "desc" }],
        take: 50,
      });
    });
  });
});
