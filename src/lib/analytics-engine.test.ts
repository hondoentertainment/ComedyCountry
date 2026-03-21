import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordPerformanceMetric,
  getComedianPerformanceReport,
  getTopPerformingBits,
  getCityPerformanceComparison,
  generateAudienceHeatmap,
  getAudienceHeatmap,
  generateRevenueForecast,
  getRevenueForecast,
  computeVenueBenchmark,
  getVenueBenchmarks,
  generateComedianAnalytics,
  getComedianAnalytics,
  computeIndustryTrends,
  getIndustryTrends,
  getAudienceDemographics,
} from "./analytics-engine";

vi.mock("./prisma", () => ({
  prisma: {
    performanceMetric: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    audienceHeatmap: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    revenueForecast: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    venueBenchmark: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    comedianAnalytics: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    industryTrend: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
    comedianFollow: {
      count: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    comedian: {
      findUnique: vi.fn(),
    },
    eventAttendance: {
      count: vi.fn(),
    },
    comedianGenre: {
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  performanceMetric: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  audienceHeatmap: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  revenueForecast: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  venueBenchmark: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  comedianAnalytics: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  industryTrend: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
  };
  comedianFollow: {
    count: ReturnType<typeof vi.fn>;
  };
  event: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  venue: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  comedian: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  eventAttendance: {
    count: ReturnType<typeof vi.fn>;
  };
  comedianGenre: {
    groupBy: ReturnType<typeof vi.fn>;
  };
};

describe("analytics-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Performance Metrics
  // ===========================================================================

  describe("recordPerformanceMetric", () => {
    const validInput = {
      comedianId: "c1",
      eventId: "e1",
      bitTitle: "Airplane Food",
      laughScore: 85,
      crowdReaction: "ROARING" as const,
      audienceSize: 200,
      city: "New York",
      date: new Date("2024-06-15"),
    };

    it("creates a performance metric with valid data", async () => {
      mockPrisma.performanceMetric.create.mockResolvedValue({
        id: "pm1",
        ...validInput,
      });

      const result = await recordPerformanceMetric(validInput);

      expect(result.id).toBe("pm1");
      expect(mockPrisma.performanceMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          bitTitle: "Airplane Food",
          laughScore: 85,
        }),
      });
    });

    it("throws when laughScore is below 0", async () => {
      await expect(
        recordPerformanceMetric({ ...validInput, laughScore: -1 })
      ).rejects.toThrow("laughScore must be between 0 and 100");
    });

    it("throws when laughScore is above 100", async () => {
      await expect(
        recordPerformanceMetric({ ...validInput, laughScore: 101 })
      ).rejects.toThrow("laughScore must be between 0 and 100");
    });

    it("throws when audienceSize is negative", async () => {
      await expect(
        recordPerformanceMetric({ ...validInput, audienceSize: -5 })
      ).rejects.toThrow("audienceSize must be non-negative");
    });

    it("accepts laughScore of 0", async () => {
      mockPrisma.performanceMetric.create.mockResolvedValue({
        id: "pm2",
        ...validInput,
        laughScore: 0,
      });

      const result = await recordPerformanceMetric({
        ...validInput,
        laughScore: 0,
      });
      expect(result.laughScore).toBe(0);
    });

    it("accepts laughScore of 100", async () => {
      mockPrisma.performanceMetric.create.mockResolvedValue({
        id: "pm3",
        ...validInput,
        laughScore: 100,
      });

      const result = await recordPerformanceMetric({
        ...validInput,
        laughScore: 100,
      });
      expect(result.laughScore).toBe(100);
    });
  });

  describe("getComedianPerformanceReport", () => {
    it("returns empty report when no metrics exist", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const report = await getComedianPerformanceReport("c1");

      expect(report.totalPerformances).toBe(0);
      expect(report.averageLaughScore).toBe(0);
      expect(report.bestBits).toEqual([]);
      expect(report.worstBits).toEqual([]);
      expect(report.cityBreakdown).toEqual([]);
    });

    it("aggregates performance metrics correctly", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          id: "pm1",
          comedianId: "c1",
          bitTitle: "Airplane Food",
          laughScore: 90,
          crowdReaction: "ROARING",
          audienceSize: 200,
          city: "New York",
          date: new Date("2024-06-15"),
        },
        {
          id: "pm2",
          comedianId: "c1",
          bitTitle: "Dating Apps",
          laughScore: 70,
          crowdReaction: "LAUGHING",
          audienceSize: 150,
          city: "Chicago",
          date: new Date("2024-06-20"),
        },
        {
          id: "pm3",
          comedianId: "c1",
          bitTitle: "Airplane Food",
          laughScore: 80,
          crowdReaction: "LAUGHING",
          audienceSize: 180,
          city: "New York",
          date: new Date("2024-07-01"),
        },
      ]);

      const report = await getComedianPerformanceReport("c1");

      expect(report.totalPerformances).toBe(3);
      expect(report.averageLaughScore).toBe(80);
      expect(report.bestBits[0].bitTitle).toBe("Airplane Food");
      expect(report.bestBits[0].avgLaughScore).toBe(85);
      expect(report.bestBits[0].performanceCount).toBe(2);
      expect(report.cityBreakdown).toHaveLength(2);
    });

    it("filters by date range", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      await getComedianPerformanceReport("c1", {
        from: new Date("2024-01-01"),
        to: new Date("2024-06-30"),
      });

      expect(mockPrisma.performanceMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            comedianId: "c1",
            date: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        })
      );
    });

    it("returns city breakdown sorted by laugh score", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          id: "pm1",
          comedianId: "c1",
          bitTitle: "Bit A",
          laughScore: 60,
          crowdReaction: "LAUGHING",
          audienceSize: 100,
          city: "LA",
          date: new Date(),
        },
        {
          id: "pm2",
          comedianId: "c1",
          bitTitle: "Bit A",
          laughScore: 95,
          crowdReaction: "STANDING_OVATION",
          audienceSize: 300,
          city: "NYC",
          date: new Date(),
        },
      ]);

      const report = await getComedianPerformanceReport("c1");

      expect(report.cityBreakdown[0].city).toBe("NYC");
      expect(report.cityBreakdown[1].city).toBe("LA");
    });

    it("handles single event correctly", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          id: "pm1",
          comedianId: "c1",
          bitTitle: "Solo Bit",
          laughScore: 75,
          crowdReaction: "LAUGHING",
          audienceSize: 50,
          city: "Denver",
          date: new Date(),
        },
      ]);

      const report = await getComedianPerformanceReport("c1");

      expect(report.totalPerformances).toBe(1);
      expect(report.averageLaughScore).toBe(75);
      expect(report.bestBits).toHaveLength(1);
      expect(report.cityBreakdown).toHaveLength(1);
    });
  });

  describe("getTopPerformingBits", () => {
    it("returns empty array when no data exists", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const bits = await getTopPerformingBits("c1");
      expect(bits).toEqual([]);
    });

    it("ranks bits by average laugh score", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          bitTitle: "Great Bit",
          laughScore: 95,
          crowdReaction: "STANDING_OVATION",
        },
        {
          bitTitle: "Great Bit",
          laughScore: 90,
          crowdReaction: "ROARING",
        },
        {
          bitTitle: "OK Bit",
          laughScore: 60,
          crowdReaction: "CHUCKLES",
        },
      ]);

      const bits = await getTopPerformingBits("c1");

      expect(bits[0].bitTitle).toBe("Great Bit");
      expect(bits[0].avgLaughScore).toBe(93);
      expect(bits[0].bestReaction).toBe("STANDING_OVATION");
      expect(bits[1].bitTitle).toBe("OK Bit");
    });

    it("respects limit parameter", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        { bitTitle: "Bit 1", laughScore: 90, crowdReaction: "ROARING" },
        { bitTitle: "Bit 2", laughScore: 80, crowdReaction: "LAUGHING" },
        { bitTitle: "Bit 3", laughScore: 70, crowdReaction: "CHUCKLES" },
      ]);

      const bits = await getTopPerformingBits("c1", 2);
      expect(bits).toHaveLength(2);
    });
  });

  describe("getCityPerformanceComparison", () => {
    it("returns empty array when no metrics exist", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const comparison = await getCityPerformanceComparison("c1");
      expect(comparison).toEqual([]);
    });

    it("compares performance across cities", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          city: "NYC",
          laughScore: 90,
          audienceSize: 300,
          crowdReaction: "ROARING",
        },
        {
          city: "NYC",
          laughScore: 85,
          audienceSize: 250,
          crowdReaction: "LAUGHING",
        },
        {
          city: "LA",
          laughScore: 70,
          audienceSize: 200,
          crowdReaction: "LAUGHING",
        },
      ]);

      const comparison = await getCityPerformanceComparison("c1");

      expect(comparison).toHaveLength(2);
      expect(comparison[0].city).toBe("NYC");
      expect(comparison[0].avgLaughScore).toBe(88);
      expect(comparison[0].totalShows).toBe(2);
      expect(comparison[0].avgAudienceSize).toBe(275);
      expect(comparison[1].city).toBe("LA");
      expect(comparison[1].totalShows).toBe(1);
    });

    it("identifies best crowd reaction per city", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        {
          city: "Denver",
          laughScore: 75,
          audienceSize: 100,
          crowdReaction: "CHUCKLES",
        },
        {
          city: "Denver",
          laughScore: 95,
          audienceSize: 100,
          crowdReaction: "STANDING_OVATION",
        },
      ]);

      const comparison = await getCityPerformanceComparison("c1");

      expect(comparison[0].bestReaction).toBe("STANDING_OVATION");
    });
  });

  // ===========================================================================
  // Audience Heatmap
  // ===========================================================================

  describe("generateAudienceHeatmap", () => {
    it("generates heatmap from ticket data", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          event: { venue: { city: "NYC", state: "NY" } },
        },
        {
          event: { venue: { city: "NYC", state: "NY" } },
        },
        {
          event: { venue: { city: "LA", state: "CA" } },
        },
      ]);
      mockPrisma.comedianFollow.count.mockResolvedValue(500);
      mockPrisma.audienceHeatmap.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await generateAudienceHeatmap("c1");

      expect(result.comedianId).toBe("c1");
      expect(result.totalFollows).toBe(500);
      expect(mockPrisma.audienceHeatmap.upsert).toHaveBeenCalledTimes(2);
    });

    it("handles no ticket data", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.comedianFollow.count.mockResolvedValue(0);

      const result = await generateAudienceHeatmap("c1");

      expect(result.locations).toEqual([]);
      expect(result.totalFollows).toBe(0);
    });
  });

  describe("getAudienceHeatmap", () => {
    it("retrieves heatmap data with totals", async () => {
      mockPrisma.audienceHeatmap.findMany.mockResolvedValue([
        {
          id: "h1",
          comedianId: "c1",
          city: "NYC",
          state: "NY",
          fanCount: 500,
          engagementScore: 60,
        },
        {
          id: "h2",
          comedianId: "c1",
          city: "LA",
          state: "CA",
          fanCount: 300,
          engagementScore: 40,
        },
      ]);

      const result = await getAudienceHeatmap("c1");

      expect(result.totalFans).toBe(800);
      expect(result.locations).toHaveLength(2);
    });

    it("applies filters correctly", async () => {
      mockPrisma.audienceHeatmap.findMany.mockResolvedValue([]);

      await getAudienceHeatmap("c1", {
        state: "NY",
        minFanCount: 100,
      });

      expect(mockPrisma.audienceHeatmap.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            comedianId: "c1",
            state: "NY",
            fanCount: { gte: 100 },
          }),
        })
      );
    });

    it("returns zero fans when no data", async () => {
      mockPrisma.audienceHeatmap.findMany.mockResolvedValue([]);

      const result = await getAudienceHeatmap("c1");
      expect(result.totalFans).toBe(0);
      expect(result.locations).toEqual([]);
    });
  });

  // ===========================================================================
  // Revenue Forecast
  // ===========================================================================

  describe("generateRevenueForecast", () => {
    it("generates forecast for an event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e1",
        venueId: "v1",
        date: new Date("2024-07-20"), // Saturday
        venue: { capacity: 300 },
        comedians: [
          {
            comedian: { followers: Array(500).fill({ id: "f" }) },
          },
        ],
        tickets: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([
        { tickets: Array(200).fill({ id: "t" }) },
        { tickets: Array(180).fill({ id: "t" }) },
      ]);
      mockPrisma.revenueForecast.create.mockImplementation(
        async (args: { data: unknown }) => ({
          id: "rf1",
          ...(args.data as Record<string, unknown>),
        })
      );

      const result = await generateRevenueForecast("e1");

      expect(result.id).toBe("rf1");
      expect(result.predictedSales).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("throws when event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(generateRevenueForecast("nonexistent")).rejects.toThrow(
        "Event not found"
      );
    });

    it("uses default capacity when venue has none", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e2",
        venueId: "v2",
        date: new Date("2024-07-15"), // Monday
        venue: { capacity: null },
        comedians: [{ comedian: { followers: [] } }],
        tickets: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.revenueForecast.create.mockImplementation(
        async (args: { data: unknown }) => ({
          id: "rf2",
          ...(args.data as Record<string, unknown>),
        })
      );

      const result = await generateRevenueForecast("e2");

      expect(result.predictedSales).toBeLessThanOrEqual(200); // default capacity
    });

    it("caps prediction at venue capacity", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e3",
        venueId: "v3",
        date: new Date("2024-07-20"),
        venue: { capacity: 50 },
        comedians: [
          {
            comedian: { followers: Array(10000).fill({ id: "f" }) },
          },
        ],
        tickets: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([
        { tickets: Array(100).fill({ id: "t" }) },
      ]);
      mockPrisma.revenueForecast.create.mockImplementation(
        async (args: { data: unknown }) => ({
          id: "rf3",
          ...(args.data as Record<string, unknown>),
        })
      );

      const result = await generateRevenueForecast("e3");

      expect(result.predictedSales).toBeLessThanOrEqual(50);
    });

    it("increases confidence with more historical data", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e4",
        venueId: "v4",
        date: new Date("2024-07-20"),
        venue: { capacity: 300 },
        comedians: [{ comedian: { followers: [] } }],
        tickets: [],
      });

      // Few past events
      mockPrisma.event.findMany.mockResolvedValue([
        { tickets: Array(100).fill({ id: "t" }) },
      ]);
      mockPrisma.revenueForecast.create.mockImplementation(
        async (args: { data: unknown }) => ({
          id: "rf4",
          ...(args.data as Record<string, unknown>),
        })
      );

      const result1 = await generateRevenueForecast("e4");

      // Many past events
      mockPrisma.event.findMany.mockResolvedValue(
        Array(10)
          .fill(null)
          .map(() => ({ tickets: Array(100).fill({ id: "t" }) }))
      );

      const result2 = await generateRevenueForecast("e4");

      expect(result2.confidenceScore).toBeGreaterThan(result1.confidenceScore);
    });
  });

  describe("getRevenueForecast", () => {
    it("returns null when no forecast exists", async () => {
      mockPrisma.revenueForecast.findFirst.mockResolvedValue(null);

      const result = await getRevenueForecast("e1");
      expect(result).toBeNull();
    });

    it("returns forecast with confidence interval", async () => {
      mockPrisma.revenueForecast.findFirst.mockResolvedValue({
        id: "rf1",
        eventId: "e1",
        predictedSales: 200,
        actualSales: null,
        confidenceScore: 0.8,
        factors: {},
        createdAt: new Date(),
      });

      const result = await getRevenueForecast("e1");

      expect(result).not.toBeNull();
      expect(result!.confidenceInterval).toBeDefined();
      expect(result!.confidenceInterval.low).toBeLessThanOrEqual(
        result!.predictedSales
      );
      expect(result!.confidenceInterval.high).toBeGreaterThanOrEqual(
        result!.predictedSales
      );
    });
  });

  // ===========================================================================
  // Venue Benchmarks
  // ===========================================================================

  describe("computeVenueBenchmark", () => {
    it("throws when venue not found", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(computeVenueBenchmark("nonexistent")).rejects.toThrow(
        "Venue not found"
      );
    });

    it("returns empty array when venue has no events", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue({
        id: "v1",
        state: "NY",
        events: [],
      });

      const result = await computeVenueBenchmark("v1");
      expect(result).toEqual([]);
    });

    it("computes benchmarks with percentile rankings", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue({
        id: "v1",
        state: "NY",
        events: [
          {
            attendees: [{ userId: "u1" }, { userId: "u2" }],
            tickets: [{ id: "t1" }, { id: "t2" }],
            reviews: [{ rating: 4 }, { rating: 5 }],
          },
        ],
      });
      mockPrisma.venue.findMany.mockResolvedValue([
        {
          id: "v1",
          events: [
            {
              attendees: [{ userId: "u1" }, { userId: "u2" }],
              tickets: [{ id: "t1" }, { id: "t2" }],
              reviews: [{ rating: 4 }, { rating: 5 }],
            },
          ],
        },
        {
          id: "v2",
          events: [
            {
              attendees: [{ userId: "u3" }],
              tickets: [{ id: "t3" }],
              reviews: [{ rating: 3 }],
            },
          ],
        },
      ]);
      mockPrisma.venueBenchmark.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await computeVenueBenchmark("v1");

      expect(result).toHaveLength(4);
      const metrics = result.map(
        (r: { metric: string }) => r.metric
      );
      expect(metrics).toContain("AVG_ATTENDANCE");
      expect(metrics).toContain("AVG_SPEND");
      expect(metrics).toContain("RETURN_RATE");
      expect(metrics).toContain("SATISFACTION");
    });
  });

  describe("getVenueBenchmarks", () => {
    it("retrieves benchmarks for venue", async () => {
      const benchmarks = [
        {
          id: "vb1",
          venueId: "v1",
          metric: "AVG_ATTENDANCE",
          value: 150,
          period: "2024-Q1",
          percentileRank: 75,
        },
      ];
      mockPrisma.venueBenchmark.findMany.mockResolvedValue(benchmarks);

      const result = await getVenueBenchmarks("v1");
      expect(result).toEqual(benchmarks);
    });

    it("returns empty array for venue with no benchmarks", async () => {
      mockPrisma.venueBenchmark.findMany.mockResolvedValue([]);

      const result = await getVenueBenchmarks("v1");
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Comedian Analytics
  // ===========================================================================

  describe("generateComedianAnalytics", () => {
    it("throws when comedian not found", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue(null);

      await expect(
        generateComedianAnalytics("nonexistent")
      ).rejects.toThrow("Comedian not found");
    });

    it("computes comprehensive analytics", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({
        id: "c1",
        events: [
          {
            event: {
              date: new Date("2024-01-15"),
              venue: { city: "NYC", state: "NY" },
              tickets: [{ id: "t1" }],
              reviews: [{ rating: 4 }],
              attendees: [{ userId: "u1" }, { userId: "u2" }],
            },
          },
          {
            event: {
              date: new Date("2024-03-20"),
              venue: { city: "NYC", state: "NY" },
              tickets: [{ id: "t2" }],
              reviews: [{ rating: 5 }],
              attendees: [
                { userId: "u3" },
                { userId: "u4" },
                { userId: "u5" },
              ],
            },
          },
          {
            event: {
              date: new Date("2024-05-10"),
              venue: { city: "LA", state: "CA" },
              tickets: [{ id: "t3" }],
              reviews: [{ rating: 3 }],
              attendees: [{ userId: "u6" }],
            },
          },
        ],
        genres: [{ genre: "standup" }, { genre: "improv" }],
      });
      mockPrisma.comedianAnalytics.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await generateComedianAnalytics("c1");

      expect(result.totalShows).toBe(3);
      expect(result.totalAudience).toBe(6);
      expect(result.avgRating).toBe(4);
      expect(result.topCities).toBeDefined();
      expect(result.genreBreakdown).toBeDefined();
    });

    it("uses specified period", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({
        id: "c1",
        events: [],
        genres: [],
      });
      mockPrisma.comedianAnalytics.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await generateComedianAnalytics("c1", "2024-Q1");

      expect(result.period).toBe("2024-Q1");
    });

    it("handles comedian with no events", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({
        id: "c1",
        events: [],
        genres: [{ genre: "standup" }],
      });
      mockPrisma.comedianAnalytics.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await generateComedianAnalytics("c1");

      expect(result.totalShows).toBe(0);
      expect(result.totalAudience).toBe(0);
      expect(result.avgRating).toBe(0);
      expect(result.growthRate).toBe(0);
    });
  });

  describe("getComedianAnalytics", () => {
    it("retrieves analytics for comedian", async () => {
      const analytics = [
        {
          id: "ca1",
          comedianId: "c1",
          totalShows: 50,
          totalAudience: 5000,
          avgRating: 4.2,
          period: "all-time",
        },
      ];
      mockPrisma.comedianAnalytics.findMany.mockResolvedValue(analytics);

      const result = await getComedianAnalytics("c1");
      expect(result).toEqual(analytics);
    });
  });

  // ===========================================================================
  // Industry Trends
  // ===========================================================================

  describe("computeIndustryTrends", () => {
    it("computes industry trends", async () => {
      mockPrisma.event.count.mockResolvedValue(100);
      mockPrisma.eventAttendance.count.mockResolvedValue(5000);
      mockPrisma.comedianGenre.groupBy.mockResolvedValue([
        { genre: "standup", _count: { genre: 50 } },
        { genre: "improv", _count: { genre: 30 } },
      ]);
      mockPrisma.industryTrend.findMany.mockResolvedValue([]);
      mockPrisma.industryTrend.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await computeIndustryTrends();

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it("filters by region", async () => {
      mockPrisma.event.count.mockResolvedValue(50);
      mockPrisma.eventAttendance.count.mockResolvedValue(2500);
      mockPrisma.comedianGenre.groupBy.mockResolvedValue([]);
      mockPrisma.industryTrend.findMany.mockResolvedValue([]);
      mockPrisma.industryTrend.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      await computeIndustryTrends("NY");

      expect(mockPrisma.event.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { venue: { state: "NY" } },
        })
      );
    });

    it("computes change percentages from previous period", async () => {
      mockPrisma.event.count.mockResolvedValue(110);
      mockPrisma.eventAttendance.count.mockResolvedValue(5500);
      mockPrisma.comedianGenre.groupBy.mockResolvedValue([]);
      mockPrisma.industryTrend.findMany.mockResolvedValue([
        { metric: "total_shows", value: 100 },
        { metric: "total_attendance", value: 5000 },
      ]);
      mockPrisma.industryTrend.upsert.mockImplementation(
        async (args: { create: unknown }) => args.create
      );

      const result = await computeIndustryTrends();
      const showsTrend = result.find(
        (t: { metric: string }) => t.metric === "total_shows"
      );

      expect(showsTrend).toBeDefined();
      expect(showsTrend!.changePercent).toBe(10);
    });
  });

  describe("getIndustryTrends", () => {
    it("retrieves trends without filters", async () => {
      const trends = [
        {
          id: "it1",
          category: "shows",
          metric: "total_shows",
          value: 100,
          changePercent: 10,
        },
      ];
      mockPrisma.industryTrend.findMany.mockResolvedValue(trends);

      const result = await getIndustryTrends();
      expect(result).toEqual(trends);
    });

    it("applies category filter", async () => {
      mockPrisma.industryTrend.findMany.mockResolvedValue([]);

      await getIndustryTrends({ category: "genre" });

      expect(mockPrisma.industryTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "genre" }),
        })
      );
    });

    it("applies multiple filters", async () => {
      mockPrisma.industryTrend.findMany.mockResolvedValue([]);

      await getIndustryTrends({
        category: "attendance",
        region: "NY",
        period: "2024-Q1",
      });

      expect(mockPrisma.industryTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            category: "attendance",
            region: "NY",
            period: "2024-Q1",
          },
        })
      );
    });
  });

  // ===========================================================================
  // Audience Demographics
  // ===========================================================================

  describe("getAudienceDemographics", () => {
    it("returns empty demographics when no tickets", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await getAudienceDemographics("c1");

      expect(result.totalTicketBuyers).toBe(0);
      expect(result.uniqueBuyers).toBe(0);
      expect(result.locationBreakdown).toEqual([]);
    });

    it("computes location breakdown from ticket data", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          userId: "u1",
          user: { id: "u1" },
          event: { venue: { city: "NYC", state: "NY" } },
        },
        {
          userId: "u2",
          user: { id: "u2" },
          event: { venue: { city: "NYC", state: "NY" } },
        },
        {
          userId: "u1",
          user: { id: "u1" },
          event: { venue: { city: "LA", state: "CA" } },
        },
      ]);

      const result = await getAudienceDemographics("c1");

      expect(result.totalTicketBuyers).toBe(3);
      expect(result.uniqueBuyers).toBe(2);
      expect(result.locationBreakdown).toHaveLength(2);
      expect(result.locationBreakdown[0].city).toBe("NYC");
      expect(result.locationBreakdown[0].percentage).toBe(67);
    });
  });
});
