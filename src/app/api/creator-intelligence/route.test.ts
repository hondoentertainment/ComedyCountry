import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/creator", () => ({
  getComedianForUser: vi.fn(),
}));

vi.mock("@/lib/creator-intelligence", () => ({
  attributeRevenue: vi.fn(),
  getRevenueAttribution: vi.fn(),
  getUnifiedAudience: vi.fn(),
  syncAudiencePlatform: vi.fn(),
  getAudienceOverlap: vi.fn(),
  getContentPerformance: vi.fn(),
  scheduleContentDistribution: vi.fn(),
  getCareerTimeline: vi.fn(),
  recordCareerMilestone: vi.fn(),
  checkMilestones: vi.fn(),
  getFinancialSummary: vi.fn(),
  generateFinancialSummary: vi.fn(),
  getFinancialForecast: vi.fn(),
  getTopRevenueSources: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getComedianForUser } from "@/lib/creator";
import {
  attributeRevenue,
  getRevenueAttribution,
  getUnifiedAudience,
  syncAudiencePlatform,
  getAudienceOverlap,
  getContentPerformance,
  scheduleContentDistribution,
  getCareerTimeline,
  recordCareerMilestone,
  getFinancialSummary,
  generateFinancialSummary,
  getFinancialForecast,
  getTopRevenueSources,
} from "@/lib/creator-intelligence";

// Import route handlers
import {
  GET as revenueGET,
  POST as revenuePOST,
} from "./revenue/route";
import {
  GET as audienceGET,
  POST as audiencePOST,
} from "./audience/route";
import { GET as overlapGET } from "./audience/overlap/route";
import {
  GET as contentGET,
  POST as contentPOST,
} from "./content/route";
import {
  GET as milestonesGET,
  POST as milestonesPOST,
} from "./milestones/route";
import {
  GET as financialGET,
  POST as financialPOST,
} from "./financial/route";
import { GET as forecastGET } from "./financial/forecast/route";
import { GET as topSourcesGET } from "./top-sources/route";

function mockAuth(userId: string | null, comedianId: string | null) {
  if (userId) {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
  } else {
    vi.mocked(getServerSession).mockResolvedValue(null);
  }
  if (comedianId) {
    vi.mocked(getComedianForUser).mockResolvedValue({ id: comedianId, name: "Test" } as never);
  } else {
    vi.mocked(getComedianForUser).mockResolvedValue(null);
  }
}

describe("Creator Intelligence API Routes", () => {
  beforeEach(() => vi.clearAllMocks());

  // Revenue routes
  describe("GET /api/creator-intelligence/revenue", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth(null, null);
      const req = new NextRequest("http://localhost/api/creator-intelligence/revenue");
      const res = await revenueGET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when not a comedian", async () => {
      mockAuth("u1", null);
      const req = new NextRequest("http://localhost/api/creator-intelligence/revenue");
      const res = await revenueGET(req);
      expect(res.status).toBe(403);
    });

    it("returns revenue attribution data", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getRevenueAttribution).mockResolvedValue({
        attributions: [],
        bySource: { CLIP: { TICKET: 500 } },
      } as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/revenue");
      const res = await revenueGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.bySource.CLIP.TICKET).toBe(500);
    });
  });

  describe("POST /api/creator-intelligence/revenue", () => {
    it("returns 400 for missing fields", async () => {
      mockAuth("u1", "c1");
      const req = new NextRequest("http://localhost/api/creator-intelligence/revenue", {
        method: "POST",
        body: JSON.stringify({ sourceType: "CLIP" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await revenuePOST(req);
      expect(res.status).toBe(400);
    });

    it("creates attribution record", async () => {
      mockAuth("u1", "c1");
      vi.mocked(attributeRevenue).mockResolvedValue({ id: "ra1" } as never);
      const req = new NextRequest("http://localhost/api/creator-intelligence/revenue", {
        method: "POST",
        body: JSON.stringify({
          sourceType: "CLIP",
          sourceId: "clip-1",
          revenueType: "TICKET",
          amount: 100,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await revenuePOST(req);
      expect(res.status).toBe(201);
    });
  });

  // Audience routes
  describe("GET /api/creator-intelligence/audience", () => {
    it("returns unified audience data", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getUnifiedAudience).mockResolvedValue({
        totalFollowers: 100000,
        avgEngagement: 3.5,
        platformBreakdown: [],
        records: [],
      } as never);

      const res = await audienceGET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalFollowers).toBe(100000);
    });
  });

  describe("POST /api/creator-intelligence/audience", () => {
    it("returns 400 when platform is missing", async () => {
      mockAuth("u1", "c1");
      const req = new NextRequest("http://localhost/api/creator-intelligence/audience", {
        method: "POST",
        body: JSON.stringify({ followerCount: 5000 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await audiencePOST(req);
      expect(res.status).toBe(400);
    });

    it("syncs audience platform data", async () => {
      mockAuth("u1", "c1");
      vi.mocked(syncAudiencePlatform).mockResolvedValue({ id: "au1" } as never);
      const req = new NextRequest("http://localhost/api/creator-intelligence/audience", {
        method: "POST",
        body: JSON.stringify({ platform: "TIKTOK", followerCount: 50000 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await audiencePOST(req);
      expect(res.status).toBe(201);
    });
  });

  // Audience overlap
  describe("GET /api/creator-intelligence/audience/overlap", () => {
    it("returns overlap analysis", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getAudienceOverlap).mockResolvedValue({
        totalRecords: 5,
        overlappingUsers: 2,
        platformPairs: {},
        overlapping: [],
      } as never);

      const res = await overlapGET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.overlappingUsers).toBe(2);
    });
  });

  // Content routes
  describe("GET /api/creator-intelligence/content", () => {
    it("returns 400 when contentId is missing", async () => {
      mockAuth("u1", "c1");
      const req = new NextRequest("http://localhost/api/creator-intelligence/content");
      const res = await contentGET(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent content", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getContentPerformance).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/creator-intelligence/content?contentId=x");
      const res = await contentGET(req);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/creator-intelligence/content", () => {
    it("schedules content distribution", async () => {
      mockAuth("u1", "c1");
      vi.mocked(scheduleContentDistribution).mockResolvedValue({ id: "cd1" } as never);
      const req = new NextRequest("http://localhost/api/creator-intelligence/content", {
        method: "POST",
        body: JSON.stringify({
          contentId: "clip-1",
          title: "Funny clip",
          platforms: ["TIKTOK"],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await contentPOST(req);
      expect(res.status).toBe(201);
    });
  });

  // Milestone routes
  describe("GET /api/creator-intelligence/milestones", () => {
    it("returns career timeline", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getCareerTimeline).mockResolvedValue([
        { id: "m1", milestone: "First gig" },
      ] as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/milestones");
      const res = await milestonesGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });

  // Financial routes
  describe("GET /api/creator-intelligence/financial", () => {
    it("returns financial summary", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getFinancialSummary).mockResolvedValue({ totalRevenue: 5000 } as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/financial?period=2026-01");
      const res = await financialGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalRevenue).toBe(5000);
    });
  });

  describe("POST /api/creator-intelligence/financial", () => {
    it("generates financial summary", async () => {
      mockAuth("u1", "c1");
      vi.mocked(generateFinancialSummary).mockResolvedValue({ totalRevenue: 5000 } as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/financial", {
        method: "POST",
        body: JSON.stringify({ period: "2026-01" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await financialPOST(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 when period is missing", async () => {
      mockAuth("u1", "c1");
      const req = new NextRequest("http://localhost/api/creator-intelligence/financial", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await financialPOST(req);
      expect(res.status).toBe(400);
    });
  });

  // Forecast route
  describe("GET /api/creator-intelligence/financial/forecast", () => {
    it("returns forecast data", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getFinancialForecast).mockResolvedValue({
        forecast: [{ month: 1, projected: 5500 }],
        trend: "growing",
        averageMonthlyRevenue: 5000,
      } as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/financial/forecast");
      const res = await forecastGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.trend).toBe("growing");
    });
  });

  // Top sources route
  describe("GET /api/creator-intelligence/top-sources", () => {
    it("returns top revenue sources", async () => {
      mockAuth("u1", "c1");
      vi.mocked(getTopRevenueSources).mockResolvedValue([
        { sourceType: "CLIP", sourceId: "clip-1", total: 800, count: 5 },
      ] as never);

      const req = new NextRequest("http://localhost/api/creator-intelligence/top-sources");
      const res = await topSourcesGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data[0].total).toBe(800);
    });
  });
});
