import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attributeRevenue,
  getRevenueAttribution,
  getRevenueBySource,
  syncAudiencePlatform,
  getUnifiedAudience,
  getAudienceOverlap,
  scheduleContentDistribution,
  getContentPerformance,
  recordCareerMilestone,
  getCareerTimeline,
  checkMilestones,
  generateFinancialSummary,
  getFinancialSummary,
  getFinancialForecast,
  getTopRevenueSources,
} from "./creator-intelligence";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    revenueAttribution: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    audienceUnification: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contentDistribution: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    careerMilestone: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    financialSummary: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    event: { findMany: vi.fn() },
    ticket: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  revenueAttribution: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  audienceUnification: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  contentDistribution: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  careerMilestone: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  financialSummary: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  event: { findMany: ReturnType<typeof vi.fn> };
  ticket: { count: ReturnType<typeof vi.fn> };
};

describe("creator-intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Revenue Attribution
  // -------------------------------------------------------------------------

  describe("attributeRevenue", () => {
    it("creates a revenue attribution record", async () => {
      const record = { id: "ra1", comedianId: "c1", sourceType: "CLIP", amount: 100 };
      mockPrisma.revenueAttribution.create.mockResolvedValue(record);

      const result = await attributeRevenue("c1", {
        sourceType: "CLIP",
        sourceId: "clip-123",
        revenueType: "TICKET",
        amount: 100,
      });

      expect(result).toEqual(record);
      expect(mockPrisma.revenueAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          sourceType: "CLIP",
          sourceId: "clip-123",
          revenueType: "TICKET",
          amount: 100,
        }),
      });
    });

    it("defaults sourceId to null when not provided", async () => {
      mockPrisma.revenueAttribution.create.mockResolvedValue({ id: "ra2" });

      await attributeRevenue("c1", {
        sourceType: "ORGANIC",
        revenueType: "TIP",
        amount: 25,
      });

      expect(mockPrisma.revenueAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sourceId: null }),
      });
    });

    it("uses provided attributedAt date", async () => {
      mockPrisma.revenueAttribution.create.mockResolvedValue({ id: "ra3" });
      const customDate = new Date("2026-01-15");

      await attributeRevenue("c1", {
        sourceType: "SOCIAL",
        revenueType: "MERCH",
        amount: 50,
        attributedAt: customDate,
      });

      expect(mockPrisma.revenueAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ attributedAt: customDate }),
      });
    });
  });

  describe("getRevenueAttribution", () => {
    it("returns attributions grouped by source", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { sourceType: "CLIP", revenueType: "TICKET", amount: 100 },
        { sourceType: "CLIP", revenueType: "TICKET", amount: 200 },
        { sourceType: "PODCAST", revenueType: "MERCH", amount: 50 },
      ]);

      const result = await getRevenueAttribution("c1");

      expect(result.bySource.CLIP.TICKET).toBe(300);
      expect(result.bySource.PODCAST.MERCH).toBe(50);
      expect(result.attributions).toHaveLength(3);
    });

    it("filters by date range when provided", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      const from = new Date("2026-01-01");
      const to = new Date("2026-01-31");

      await getRevenueAttribution("c1", { from, to });

      expect(mockPrisma.revenueAttribution.findMany).toHaveBeenCalledWith({
        where: {
          comedianId: "c1",
          attributedAt: { gte: from, lte: to },
        },
        orderBy: { attributedAt: "desc" },
      });
    });

    it("returns empty bySource for no attributions", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);

      const result = await getRevenueAttribution("c1");

      expect(result.attributions).toHaveLength(0);
      expect(result.bySource).toEqual({});
    });
  });

  describe("getRevenueBySource", () => {
    it("aggregates and sorts by total descending", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { sourceType: "CLIP", amount: 100 },
        { sourceType: "PODCAST", amount: 300 },
        { sourceType: "CLIP", amount: 200 },
        { sourceType: "SOCIAL", amount: 50 },
      ]);

      const result = await getRevenueBySource("c1");

      // CLIP and PODCAST both total 300, order between them is stable but depends on iteration
      expect(result[0].total).toBe(300);
      expect(result[1].total).toBe(300);
      expect(result[2]).toEqual({ source: "SOCIAL", total: 50 });
      const sources = result.map((r: { source: string }) => r.source);
      expect(sources).toContain("CLIP");
      expect(sources).toContain("PODCAST");
    });

    it("returns empty array for new comedian", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);

      const result = await getRevenueBySource("c-new");

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Audience Unification
  // -------------------------------------------------------------------------

  describe("syncAudiencePlatform", () => {
    it("creates new audience record when none exists", async () => {
      mockPrisma.audienceUnification.findFirst.mockResolvedValue(null);
      const created = { id: "au1", comedianId: "c1", platform: "TIKTOK" };
      mockPrisma.audienceUnification.create.mockResolvedValue(created);

      const result = await syncAudiencePlatform("c1", "TIKTOK", {
        platformUserId: "tt-user-1",
        followerCount: 50000,
        engagementRate: 3.5,
      });

      expect(result).toEqual(created);
      expect(mockPrisma.audienceUnification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          platform: "TIKTOK",
          platformUserId: "tt-user-1",
          followerCount: 50000,
          engagementRate: 3.5,
        }),
      });
    });

    it("updates existing audience record", async () => {
      const existing = { id: "au1", followerCount: 40000, engagementRate: 3.0, email: null };
      mockPrisma.audienceUnification.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, followerCount: 50000 };
      mockPrisma.audienceUnification.update.mockResolvedValue(updated);

      const result = await syncAudiencePlatform("c1", "TIKTOK", {
        platformUserId: "tt-user-1",
        followerCount: 50000,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.audienceUnification.update).toHaveBeenCalledWith({
        where: { id: "au1" },
        data: expect.objectContaining({ followerCount: 50000 }),
      });
    });

    it("handles sync with email-based matching", async () => {
      mockPrisma.audienceUnification.findFirst.mockResolvedValue(null);
      mockPrisma.audienceUnification.create.mockResolvedValue({ id: "au2" });

      await syncAudiencePlatform("c1", "TICKET_BUYER", {
        email: "fan@example.com",
        followerCount: 1,
      });

      expect(mockPrisma.audienceUnification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "fan@example.com",
          platform: "TICKET_BUYER",
        }),
      });
    });
  });

  describe("getUnifiedAudience", () => {
    it("returns aggregated audience across platforms", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { platform: "TIKTOK", followerCount: 50000, engagementRate: 3.5, lastSyncedAt: new Date() },
        { platform: "INSTAGRAM", followerCount: 30000, engagementRate: 2.0, lastSyncedAt: new Date() },
        { platform: "YOUTUBE", followerCount: 20000, engagementRate: 4.0, lastSyncedAt: new Date() },
      ]);

      const result = await getUnifiedAudience("c1");

      expect(result.totalFollowers).toBe(100000);
      expect(result.avgEngagement).toBeCloseTo(3.167, 2);
      expect(result.platformBreakdown).toHaveLength(3);
    });

    it("handles comedian with no audience data", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);

      const result = await getUnifiedAudience("c-new");

      expect(result.totalFollowers).toBe(0);
      expect(result.avgEngagement).toBe(0);
      expect(result.platformBreakdown).toHaveLength(0);
    });
  });

  describe("getAudienceOverlap", () => {
    it("detects overlapping users across platforms", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { email: "fan@example.com", platform: "TIKTOK" },
        { email: "fan@example.com", platform: "TICKET_BUYER" },
        { email: "other@example.com", platform: "INSTAGRAM" },
        { email: "fan@example.com", platform: "MERCH_BUYER" },
      ]);

      const result = await getAudienceOverlap("c1");

      expect(result.overlappingUsers).toBe(1);
      expect(result.totalRecords).toBe(4);
      expect(result.platformPairs).toHaveProperty("TICKET_BUYER-TIKTOK");
    });

    it("returns zero overlap when no matching emails", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { email: "a@test.com", platform: "TIKTOK" },
        { email: "b@test.com", platform: "INSTAGRAM" },
      ]);

      const result = await getAudienceOverlap("c1");

      expect(result.overlappingUsers).toBe(0);
      expect(result.platformPairs).toEqual({});
    });

    it("handles records without email", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { email: null, platform: "TIKTOK" },
        { email: null, platform: "INSTAGRAM" },
      ]);

      const result = await getAudienceOverlap("c1");

      expect(result.overlappingUsers).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Content Distribution
  // -------------------------------------------------------------------------

  describe("scheduleContentDistribution", () => {
    it("creates content distribution record", async () => {
      const created = { id: "cd1", contentId: "clip-1", title: "Funny Clip" };
      mockPrisma.contentDistribution.create.mockResolvedValue(created);

      const result = await scheduleContentDistribution("c1", {
        contentId: "clip-1",
        title: "Funny Clip",
        platforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE"],
      });

      expect(result).toEqual(created);
      expect(mockPrisma.contentDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          contentId: "clip-1",
          title: "Funny Clip",
          platforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE"],
        }),
      });
    });

    it("sets scheduledAt when provided", async () => {
      mockPrisma.contentDistribution.create.mockResolvedValue({ id: "cd2" });
      const scheduledAt = new Date("2026-04-01T12:00:00Z");

      await scheduleContentDistribution("c1", {
        contentId: "clip-2",
        title: "Clip 2",
        platforms: ["TIKTOK"],
        scheduledAt,
      });

      expect(mockPrisma.contentDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scheduledAt }),
      });
    });

    it("defaults scheduledAt to null", async () => {
      mockPrisma.contentDistribution.create.mockResolvedValue({ id: "cd3" });

      await scheduleContentDistribution("c1", {
        contentId: "clip-3",
        title: "Clip 3",
        platforms: ["YOUTUBE"],
      });

      expect(mockPrisma.contentDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scheduledAt: null }),
      });
    });
  });

  describe("getContentPerformance", () => {
    it("returns performance data for distributed content", async () => {
      mockPrisma.contentDistribution.findFirst.mockResolvedValue({
        id: "cd1",
        contentId: "clip-1",
        title: "Funny Clip",
        platforms: ["TIKTOK", "INSTAGRAM"],
        scheduledAt: null,
        distributedAt: new Date("2026-01-10"),
        performanceByPlatform: {
          TIKTOK: { views: 100000, likes: 5000 },
          INSTAGRAM: { views: 30000, likes: 2000 },
        },
      });

      const result = await getContentPerformance("c1", "clip-1");

      expect(result).not.toBeNull();
      expect(result!.contentId).toBe("clip-1");
      expect(result!.performanceByPlatform).toHaveProperty("TIKTOK");
    });

    it("returns null for non-existent content", async () => {
      mockPrisma.contentDistribution.findFirst.mockResolvedValue(null);

      const result = await getContentPerformance("c1", "non-existent");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Career Milestones
  // -------------------------------------------------------------------------

  describe("recordCareerMilestone", () => {
    it("creates milestone record", async () => {
      const milestone = { id: "cm1", milestone: "First sold-out show" };
      mockPrisma.careerMilestone.create.mockResolvedValue(milestone);

      const result = await recordCareerMilestone("c1", {
        milestone: "First sold-out show",
        metric: "sellout",
        value: 1,
      });

      expect(result).toEqual(milestone);
      expect(mockPrisma.careerMilestone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          milestone: "First sold-out show",
          metric: "sellout",
          value: 1,
          previousBest: null,
        }),
      });
    });

    it("records previousBest when provided", async () => {
      mockPrisma.careerMilestone.create.mockResolvedValue({ id: "cm2" });

      await recordCareerMilestone("c1", {
        milestone: "New attendance record",
        metric: "attendance",
        value: 500,
        previousBest: 300,
      });

      expect(mockPrisma.careerMilestone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ previousBest: 300 }),
      });
    });
  });

  describe("getCareerTimeline", () => {
    it("returns milestones in chronological order", async () => {
      const milestones = [
        { id: "cm1", milestone: "First gig", achievedAt: new Date("2024-01-01") },
        { id: "cm2", milestone: "1K followers", achievedAt: new Date("2025-06-01") },
      ];
      mockPrisma.careerMilestone.findMany.mockResolvedValue(milestones);

      const result = await getCareerTimeline("c1");

      expect(result).toEqual(milestones);
      expect(mockPrisma.careerMilestone.findMany).toHaveBeenCalledWith({
        where: { comedianId: "c1" },
        orderBy: { achievedAt: "asc" },
      });
    });
  });

  describe("checkMilestones", () => {
    it("detects follower thresholds", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { followerCount: 60000 },
        { followerCount: 50000 },
      ]);
      mockPrisma.careerMilestone.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await checkMilestones("c1");

      const followerMilestones = result.filter((m) => m.metric === "followers");
      expect(followerMilestones.length).toBeGreaterThanOrEqual(3); // 1K, 10K, 50K, 100K
      expect(followerMilestones.some((m) => m.value === 100000)).toBe(true);
    });

    it("detects revenue thresholds", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);
      mockPrisma.careerMilestone.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { amount: 3000 },
        { amount: 4000 },
        { amount: 5000 },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await checkMilestones("c1");

      const revenueMilestones = result.filter((m) => m.metric === "revenue");
      expect(revenueMilestones.some((m) => m.value === 10000)).toBe(true);
      expect(revenueMilestones.some((m) => m.value === 5000)).toBe(true);
    });

    it("skips already-recorded milestones", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([
        { followerCount: 2000 },
      ]);
      mockPrisma.careerMilestone.findMany.mockResolvedValue([
        { metric: "followers", value: 1000 },
      ]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await checkMilestones("c1");

      const followerMilestones = result.filter((m) => m.metric === "followers");
      expect(followerMilestones.every((m) => m.value !== 1000)).toBe(true);
    });

    it("detects first sellout", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);
      mockPrisma.careerMilestone.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([
        { id: "e1", capacity: 100 },
      ]);
      mockPrisma.ticket.count.mockResolvedValue(100);

      const result = await checkMilestones("c1");

      expect(result.some((m) => m.milestone === "First sold-out show")).toBe(true);
    });

    it("returns empty for new comedian with no data", async () => {
      mockPrisma.audienceUnification.findMany.mockResolvedValue([]);
      mockPrisma.careerMilestone.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await checkMilestones("c-new");

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Financial Summary
  // -------------------------------------------------------------------------

  describe("generateFinancialSummary", () => {
    it("computes summary from revenue attributions", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { revenueType: "TICKET", amount: 500 },
        { revenueType: "TICKET", amount: 300 },
        { revenueType: "MERCH", amount: 200 },
        { revenueType: "TIP", amount: 100 },
        { revenueType: "SUBSCRIPTION", amount: 50 },
      ]);
      mockPrisma.financialSummary.upsert.mockImplementation(
        async ({ create }: { create: Record<string, unknown> }) => create,
      );

      const result = await generateFinancialSummary("c1", "2026-01");

      expect(result).toMatchObject({
        ticketRevenue: 800,
        merchRevenue: 200,
        tipRevenue: 100,
        subscriptionRevenue: 50,
        totalRevenue: 1150,
      });
      expect((result as { taxEstimate: number }).taxEstimate).toBeCloseTo(287.5);
    });

    it("handles quarter period format", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.financialSummary.upsert.mockImplementation(
        async ({ create }: { create: Record<string, unknown> }) => create,
      );

      await generateFinancialSummary("c1", "2026-Q1");

      expect(mockPrisma.revenueAttribution.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          comedianId: "c1",
          attributedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      });
    });

    it("handles year period format", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.financialSummary.upsert.mockImplementation(
        async ({ create }: { create: Record<string, unknown> }) => create,
      );

      const result = await generateFinancialSummary("c1", "2026");

      expect(result).toMatchObject({ totalRevenue: 0 });
    });
  });

  describe("getFinancialSummary", () => {
    it("returns specific period summary", async () => {
      const summary = { period: "2026-01", totalRevenue: 1150 };
      mockPrisma.financialSummary.findUnique.mockResolvedValue(summary);

      const result = await getFinancialSummary("c1", "2026-01");

      expect(result).toEqual(summary);
    });

    it("returns all summaries when no period specified", async () => {
      const summaries = [
        { period: "2026-02", totalRevenue: 1500 },
        { period: "2026-01", totalRevenue: 1150 },
      ];
      mockPrisma.financialSummary.findMany.mockResolvedValue(summaries);

      const result = await getFinancialSummary("c1");

      expect(result).toEqual(summaries);
    });
  });

  describe("getFinancialForecast", () => {
    it("projects future revenue based on trends", async () => {
      mockPrisma.financialSummary.findMany.mockResolvedValue([
        { period: "2026-01", totalRevenue: 1000 },
        { period: "2026-02", totalRevenue: 1200 },
        { period: "2026-03", totalRevenue: 1500 },
      ]);

      const result = await getFinancialForecast("c1", 3);

      expect(result.forecast).toHaveLength(3);
      expect(result.trend).toBe("growing");
      expect(result.forecast[0].projected).toBeGreaterThan(1500);
    });

    it("returns insufficient_data for single period", async () => {
      mockPrisma.financialSummary.findMany.mockResolvedValue([
        { period: "2026-01", totalRevenue: 1000 },
      ]);

      const result = await getFinancialForecast("c1");

      expect(result.trend).toBe("insufficient_data");
      expect(result.averageMonthlyRevenue).toBe(1000);
    });

    it("returns insufficient_data for no data", async () => {
      mockPrisma.financialSummary.findMany.mockResolvedValue([]);

      const result = await getFinancialForecast("c-new");

      expect(result.trend).toBe("insufficient_data");
      expect(result.averageMonthlyRevenue).toBe(0);
      expect(result.forecast).toEqual([]);
    });

    it("detects declining trend", async () => {
      mockPrisma.financialSummary.findMany.mockResolvedValue([
        { period: "2026-01", totalRevenue: 2000 },
        { period: "2026-02", totalRevenue: 1500 },
        { period: "2026-03", totalRevenue: 1000 },
      ]);

      const result = await getFinancialForecast("c1");

      expect(result.trend).toBe("declining");
    });

    it("detects stable trend", async () => {
      mockPrisma.financialSummary.findMany.mockResolvedValue([
        { period: "2026-01", totalRevenue: 1000 },
        { period: "2026-02", totalRevenue: 1010 },
        { period: "2026-03", totalRevenue: 1020 },
      ]);

      const result = await getFinancialForecast("c1");

      expect(result.trend).toBe("stable");
    });
  });

  describe("getTopRevenueSources", () => {
    it("returns ranked sources by total revenue", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { sourceType: "CLIP", sourceId: "clip-1", amount: 500 },
        { sourceType: "CLIP", sourceId: "clip-1", amount: 300 },
        { sourceType: "PODCAST", sourceId: "pod-1", amount: 600 },
        { sourceType: "SOCIAL", sourceId: "ig-post-1", amount: 100 },
      ]);

      const result = await getTopRevenueSources("c1");

      expect(result[0].sourceType).toBe("CLIP");
      expect(result[0].total).toBe(800);
      expect(result[1].sourceType).toBe("PODCAST");
      expect(result[1].total).toBe(600);
    });

    it("respects limit parameter", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { sourceType: "CLIP", sourceId: "clip-1", amount: 500 },
        { sourceType: "PODCAST", sourceId: "pod-1", amount: 400 },
        { sourceType: "SOCIAL", sourceId: "ig-1", amount: 300 },
        { sourceType: "REFERRAL", sourceId: "ref-1", amount: 200 },
      ]);

      const result = await getTopRevenueSources("c1", 2);

      expect(result).toHaveLength(2);
    });

    it("returns empty for no attributions", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);

      const result = await getTopRevenueSources("c-new");

      expect(result).toEqual([]);
    });
  });
});
