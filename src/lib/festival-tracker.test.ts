import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listMajorFestivals,
  getFestivalInfo,
  getFestivalsByCountry,
  getFestivalsByMonth,
  getFestivalsByCategory,
  getUpcomingFestivalSchedule,
  getComedianFestivalHistory,
  getFestivalCalendar,
  searchFestivals,
  compareFestivals,
  getFestivalCircuitStats,
  MAJOR_FESTIVALS,
} from "./festival-tracker";

vi.mock("./prisma", () => ({
  prisma: {
    festivalCircuit: {
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  festivalCircuit: {
    findMany: ReturnType<typeof vi.fn>;
  };
  event: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("festival-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MAJOR_FESTIVALS", () => {
    it("includes Edinburgh Fringe", () => {
      const fringe = MAJOR_FESTIVALS.find((f) => f.id === "edinburgh-fringe");
      expect(fringe).toBeDefined();
      expect(fringe!.city).toBe("Edinburgh");
      expect(fringe!.typicalMonth).toBe(8);
    });

    it("includes Just for Laughs", () => {
      const jfl = MAJOR_FESTIVALS.find((f) => f.id === "just-for-laughs");
      expect(jfl).toBeDefined();
      expect(jfl!.city).toBe("Montreal");
    });

    it("includes Melbourne Comedy Festival", () => {
      const melb = MAJOR_FESTIVALS.find((f) => f.id === "melbourne-comedy-fest");
      expect(melb).toBeDefined();
      expect(melb!.countryCode).toBe("AU");
    });

    it("has required fields for all festivals", () => {
      for (const f of MAJOR_FESTIVALS) {
        expect(f.id).toBeTruthy();
        expect(f.name).toBeTruthy();
        expect(f.city).toBeTruthy();
        expect(f.country).toBeTruthy();
        expect(f.countryCode).toBeTruthy();
        expect(f.typicalMonth).toBeGreaterThanOrEqual(1);
        expect(f.typicalMonth).toBeLessThanOrEqual(12);
        expect(f.durationDays).toBeGreaterThan(0);
        expect(f.established).toBeGreaterThan(1900);
      }
    });
  });

  describe("listMajorFestivals", () => {
    it("returns all festivals", () => {
      const festivals = listMajorFestivals();
      expect(festivals.length).toBe(MAJOR_FESTIVALS.length);
    });

    it("returns a copy", () => {
      const festivals = listMajorFestivals();
      festivals.pop();
      expect(listMajorFestivals().length).toBe(MAJOR_FESTIVALS.length);
    });
  });

  describe("getFestivalInfo", () => {
    it("finds by ID", () => {
      const fest = getFestivalInfo("edinburgh-fringe");
      expect(fest).toBeDefined();
      expect(fest!.name).toBe("Edinburgh Festival Fringe");
    });

    it("finds by slug", () => {
      const fest = getFestivalInfo("just-for-laughs");
      expect(fest).toBeDefined();
      expect(fest!.city).toBe("Montreal");
    });

    it("returns undefined for unknown", () => {
      expect(getFestivalInfo("nonexistent")).toBeUndefined();
    });
  });

  describe("getFestivalsByCountry", () => {
    it("returns UK festivals", () => {
      const ukFestivals = getFestivalsByCountry("GB");
      expect(ukFestivals.length).toBeGreaterThanOrEqual(2);
      expect(ukFestivals.every((f) => f.countryCode === "GB")).toBe(true);
    });

    it("handles lowercase input", () => {
      const auFestivals = getFestivalsByCountry("au");
      expect(auFestivals.length).toBe(0); // case sensitive
    });

    it("returns empty for unknown country", () => {
      expect(getFestivalsByCountry("XX")).toEqual([]);
    });
  });

  describe("getFestivalsByMonth", () => {
    it("returns August festivals (Fringe)", () => {
      const augFestivals = getFestivalsByMonth(8);
      expect(augFestivals.some((f) => f.id === "edinburgh-fringe")).toBe(true);
    });

    it("throws for invalid month", () => {
      expect(() => getFestivalsByMonth(0)).toThrow("Month must be between 1 and 12");
      expect(() => getFestivalsByMonth(13)).toThrow("Month must be between 1 and 12");
    });

    it("returns empty for months with no festivals", () => {
      // Find a month with no festivals and test it
      const allMonths = MAJOR_FESTIVALS.map((f) => f.typicalMonth);
      for (let m = 1; m <= 12; m++) {
        if (!allMonths.includes(m)) {
          expect(getFestivalsByMonth(m)).toEqual([]);
          break;
        }
      }
    });
  });

  describe("getFestivalsByCategory", () => {
    it("returns festivals of given category", () => {
      const festivals = getFestivalsByCategory("festival");
      expect(festivals.length).toBeGreaterThan(0);
      expect(festivals.every((f) => f.category === "festival")).toBe(true);
    });

    it("returns fringe festivals", () => {
      const fringes = getFestivalsByCategory("fringe");
      expect(fringes.some((f) => f.id === "edinburgh-fringe")).toBe(true);
    });
  });

  describe("getUpcomingFestivalSchedule", () => {
    it("returns upcoming festivals from database", async () => {
      const dbFestivals = [
        { id: "f1", name: "Test Fest", startDate: new Date("2026-07-01"), scene: null },
      ];
      mockPrisma.festivalCircuit.findMany.mockResolvedValue(dbFestivals);

      const result = await getUpcomingFestivalSchedule();

      expect(result).toHaveLength(1);
      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          orderBy: { startDate: "asc" },
        }),
      );
    });

    it("filters by country", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getUpcomingFestivalSchedule({ country: "United Kingdom" });

      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ country: "United Kingdom" }),
        }),
      );
    });

    it("filters by category", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getUpcomingFestivalSchedule({ category: "fringe" });

      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "fringe" }),
        }),
      );
    });

    it("respects limit", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getUpcomingFestivalSchedule({ limit: 5 });

      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe("getComedianFestivalHistory", () => {
    it("returns festival events for a comedian", async () => {
      const events = [
        {
          id: "e1",
          title: "Edinburgh Show 2025",
          date: new Date("2025-08-15"),
          venue: { name: "Pleasance Courtyard", city: "Edinburgh", state: "Scotland" },
          comedians: [{ comedian: { name: "Test Comic", slug: "test-comic" } }],
        },
      ];
      mockPrisma.event.findMany.mockResolvedValue(events);

      const result = await getComedianFestivalHistory("comedian1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Edinburgh Show 2025");
      expect(result[0].venue).toBe("Pleasance Courtyard");
    });

    it("returns empty for comedian with no festival history", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getComedianFestivalHistory("new-comedian");
      expect(result).toEqual([]);
    });
  });

  describe("getFestivalCalendar", () => {
    it("returns 12 months", () => {
      const calendar = getFestivalCalendar(2026);
      expect(calendar).toHaveLength(12);
    });

    it("has correct month names", () => {
      const calendar = getFestivalCalendar(2026);
      expect(calendar[0].monthName).toBe("January");
      expect(calendar[11].monthName).toBe("December");
    });

    it("places Edinburgh Fringe in August", () => {
      const calendar = getFestivalCalendar(2026);
      const august = calendar[7]; // 0-indexed
      expect(august.month).toBe(8);
      expect(august.festivals.some((f) => f.id === "edinburgh-fringe")).toBe(true);
    });

    it("places Just for Laughs in July", () => {
      const calendar = getFestivalCalendar(2026);
      const july = calendar[6];
      expect(july.festivals.some((f) => f.id === "just-for-laughs")).toBe(true);
    });
  });

  describe("searchFestivals", () => {
    it("searches known festivals by name", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      const result = await searchFestivals("Edinburgh");

      expect(result.knownFestivals.length).toBeGreaterThan(0);
      expect(result.knownFestivals[0].id).toBe("edinburgh-fringe");
    });

    it("searches by city", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      const result = await searchFestivals("Montreal");

      expect(result.knownFestivals.some((f) => f.id === "just-for-laughs")).toBe(true);
    });

    it("includes database results", async () => {
      const dbFest = { id: "db1", name: "Local Comedy Fest", city: "Portland" };
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([dbFest]);

      const result = await searchFestivals("comedy");

      expect(result.databaseFestivals).toHaveLength(1);
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it("returns empty for unmatched query", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      const result = await searchFestivals("zzzznonexistent");

      expect(result.knownFestivals).toHaveLength(0);
      expect(result.databaseFestivals).toHaveLength(0);
    });
  });

  describe("compareFestivals", () => {
    it("compares two festivals", () => {
      const result = compareFestivals(["edinburgh-fringe", "just-for-laughs"]);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBeDefined();
      expect(result[0].rank.attendance).toBeDefined();
      expect(result[0].rank.duration).toBeDefined();
      expect(result[0].rank.established).toBeDefined();
    });

    it("ranks Edinburgh as largest by attendance", () => {
      const result = compareFestivals(["edinburgh-fringe", "just-for-laughs", "melbourne-comedy-fest"]);

      const fringe = result.find((f) => f.id === "edinburgh-fringe");
      expect(fringe!.rank.attendance).toBe(1);
    });

    it("ranks Edinburgh as oldest (among these three)", () => {
      const result = compareFestivals(["edinburgh-fringe", "just-for-laughs", "melbourne-comedy-fest"]);

      const fringe = result.find((f) => f.id === "edinburgh-fringe");
      expect(fringe!.rank.established).toBe(1);
    });

    it("throws when fewer than 2 valid IDs", () => {
      expect(() => compareFestivals(["edinburgh-fringe"])).toThrow(
        "At least 2 valid festival IDs",
      );
    });

    it("filters out invalid IDs", () => {
      expect(() => compareFestivals(["edinburgh-fringe", "nonexistent"])).toThrow(
        "At least 2 valid festival IDs",
      );
    });
  });

  describe("getFestivalCircuitStats", () => {
    it("returns aggregate stats", () => {
      const stats = getFestivalCircuitStats();

      expect(stats.totalFestivals).toBe(MAJOR_FESTIVALS.length);
      expect(stats.countries).toBeGreaterThan(0);
      expect(stats.totalEstimatedAttendance).toBeGreaterThan(0);
      expect(stats.oldestFestival).toBeDefined();
      expect(stats.largestFestival).toBeDefined();
      expect(stats.monthWithMostFestivals.month).toBeGreaterThanOrEqual(1);
      expect(stats.monthWithMostFestivals.count).toBeGreaterThan(0);
    });

    it("identifies Edinburgh as oldest", () => {
      const stats = getFestivalCircuitStats();
      expect(stats.oldestFestival.id).toBe("edinburgh-fringe");
    });

    it("identifies Edinburgh as largest by attendance", () => {
      const stats = getFestivalCircuitStats();
      expect(stats.largestFestival.id).toBe("edinburgh-fringe");
    });
  });
});
