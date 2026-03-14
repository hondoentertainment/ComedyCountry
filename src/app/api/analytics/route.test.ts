import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/analytics-engine", () => ({
  recordPerformanceMetric: vi.fn(),
  getComedianPerformanceReport: vi.fn(),
  getAudienceHeatmap: vi.fn(),
  generateRevenueForecast: vi.fn(),
  getRevenueForecast: vi.fn(),
  getVenueBenchmarks: vi.fn(),
  getComedianAnalytics: vi.fn(),
  getIndustryTrends: vi.fn(),
  getAudienceDemographics: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  recordPerformanceMetric,
  getComedianPerformanceReport,
  getAudienceHeatmap,
  generateRevenueForecast,
  getRevenueForecast,
  getVenueBenchmarks,
  getComedianAnalytics,
  getIndustryTrends,
  getAudienceDemographics,
} from "@/lib/analytics-engine";

import { GET as performanceGET, POST as performancePOST } from "./performance/route";
import { GET as heatmapGET } from "./heatmap/route";
import { GET as forecastGET, POST as forecastPOST } from "./forecast/route";
import { GET as benchmarksGET } from "./benchmarks/route";
import { GET as comedianStatsGET } from "./comedian-stats/route";
import { GET as industryGET } from "./industry/route";
import { GET as demographicsGET } from "./demographics/route";

function createRequest(url: string, method = "GET", body?: unknown) {
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(`http://localhost${url}`, options);
}

describe("Analytics API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Performance Routes
  // =========================================================================

  describe("GET /api/analytics/performance", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await performanceGET(
        createRequest("/api/analytics/performance?comedianId=c1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when comedianId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await performanceGET(
        createRequest("/api/analytics/performance")
      );
      expect(res.status).toBe(400);
    });

    it("returns performance report", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getComedianPerformanceReport).mockResolvedValue({
        comedianId: "c1",
        totalPerformances: 5,
        averageLaughScore: 80,
        bestBits: [],
        worstBits: [],
        cityBreakdown: [],
        metrics: [],
      });

      const res = await performanceGET(
        createRequest("/api/analytics/performance?comedianId=c1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.comedianId).toBe("c1");
      expect(data.totalPerformances).toBe(5);
    });
  });

  describe("POST /api/analytics/performance", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await performancePOST(
        createRequest("/api/analytics/performance", "POST", {})
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when required fields missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await performancePOST(
        createRequest("/api/analytics/performance", "POST", {
          comedianId: "c1",
        })
      );
      expect(res.status).toBe(400);
    });

    it("records a performance metric", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(recordPerformanceMetric).mockResolvedValue({
        id: "pm1",
        comedianId: "c1",
        eventId: "e1",
        bitTitle: "Airplane Food",
        laughScore: 85,
        crowdReaction: "ROARING",
        audienceSize: 200,
        city: "NYC",
        date: new Date(),
        createdAt: new Date(),
      });

      const res = await performancePOST(
        createRequest("/api/analytics/performance", "POST", {
          comedianId: "c1",
          eventId: "e1",
          bitTitle: "Airplane Food",
          laughScore: 85,
          crowdReaction: "ROARING",
          audienceSize: 200,
          city: "NYC",
          date: "2024-06-15",
        })
      );

      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // Heatmap Routes
  // =========================================================================

  describe("GET /api/analytics/heatmap", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await heatmapGET(
        createRequest("/api/analytics/heatmap?comedianId=c1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when comedianId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await heatmapGET(
        createRequest("/api/analytics/heatmap")
      );
      expect(res.status).toBe(400);
    });

    it("returns heatmap data", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getAudienceHeatmap).mockResolvedValue({
        comedianId: "c1",
        totalFans: 800,
        locations: [],
      });

      const res = await heatmapGET(
        createRequest("/api/analytics/heatmap?comedianId=c1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalFans).toBe(800);
    });
  });

  // =========================================================================
  // Forecast Routes
  // =========================================================================

  describe("GET /api/analytics/forecast", () => {
    it("returns 404 when no forecast exists", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getRevenueForecast).mockResolvedValue(null);

      const res = await forecastGET(
        createRequest("/api/analytics/forecast?eventId=e1")
      );
      expect(res.status).toBe(404);
    });

    it("returns forecast data", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getRevenueForecast).mockResolvedValue({
        id: "rf1",
        eventId: "e1",
        predictedSales: 200,
        confidenceScore: 0.8,
        confidenceInterval: { low: 160, high: 240 },
        actualSales: null,
        factors: {},
        createdAt: new Date(),
      });

      const res = await forecastGET(
        createRequest("/api/analytics/forecast?eventId=e1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.predictedSales).toBe(200);
    });
  });

  describe("POST /api/analytics/forecast", () => {
    it("returns 400 when eventId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await forecastPOST(
        createRequest("/api/analytics/forecast", "POST", {})
      );
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Benchmarks Routes
  // =========================================================================

  describe("GET /api/analytics/benchmarks", () => {
    it("returns 400 when venueId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await benchmarksGET(
        createRequest("/api/analytics/benchmarks")
      );
      expect(res.status).toBe(400);
    });

    it("returns venue benchmarks", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getVenueBenchmarks).mockResolvedValue([
        {
          id: "vb1",
          venueId: "v1",
          metric: "AVG_ATTENDANCE",
          value: 150,
          period: "2024-Q1",
          percentileRank: 75,
        },
      ]);

      const res = await benchmarksGET(
        createRequest("/api/analytics/benchmarks?venueId=v1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });

  // =========================================================================
  // Comedian Stats Routes
  // =========================================================================

  describe("GET /api/analytics/comedian-stats", () => {
    it("returns 400 when comedianId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await comedianStatsGET(
        createRequest("/api/analytics/comedian-stats")
      );
      expect(res.status).toBe(400);
    });

    it("returns comedian analytics", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getComedianAnalytics).mockResolvedValue([
        {
          id: "ca1",
          comedianId: "c1",
          totalShows: 50,
          avgRating: 4.2,
          period: "all-time",
        },
      ]);

      const res = await comedianStatsGET(
        createRequest("/api/analytics/comedian-stats?comedianId=c1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data[0].totalShows).toBe(50);
    });
  });

  // =========================================================================
  // Industry Routes
  // =========================================================================

  describe("GET /api/analytics/industry", () => {
    it("returns industry trends", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getIndustryTrends).mockResolvedValue([
        {
          id: "it1",
          category: "shows",
          metric: "total_shows",
          value: 100,
          changePercent: 10,
        },
      ]);

      const res = await industryGET(
        createRequest("/api/analytics/industry")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });

  // =========================================================================
  // Demographics Routes
  // =========================================================================

  describe("GET /api/analytics/demographics", () => {
    it("returns 400 when comedianId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);

      const res = await demographicsGET(
        createRequest("/api/analytics/demographics")
      );
      expect(res.status).toBe(400);
    });

    it("returns audience demographics", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getAudienceDemographics).mockResolvedValue({
        comedianId: "c1",
        totalTicketBuyers: 100,
        uniqueBuyers: 80,
        locationBreakdown: [
          { city: "NYC", state: "NY", count: 50, percentage: 50 },
        ],
      });

      const res = await demographicsGET(
        createRequest("/api/analytics/demographics?comedianId=c1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalTicketBuyers).toBe(100);
      expect(data.locationBreakdown).toHaveLength(1);
    });
  });
});
