import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getContentPerformance,
  getAudienceGrowth,
  getEngagementTrends,
  getTopPerformingContent,
  getRevenueByContentType,
  getCreatorAnalyticsSummary,
} from "./creator-analytics";

vi.mock("./prisma", () => ({
  prisma: {
    exclusiveContent: { findMany: vi.fn() },
    userClip: { findMany: vi.fn() },
    comedianFollow: { findMany: vi.fn(), count: vi.fn() },
    fanTip: { findMany: vi.fn() },
    revenueAttribution: { findMany: vi.fn() },
    performanceMetric: { findMany: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  exclusiveContent: { findMany: ReturnType<typeof vi.fn> };
  userClip: { findMany: ReturnType<typeof vi.fn> };
  comedianFollow: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  fanTip: { findMany: ReturnType<typeof vi.fn> };
  revenueAttribution: { findMany: ReturnType<typeof vi.fn> };
  performanceMetric: { findMany: ReturnType<typeof vi.fn> };
};

describe("creator-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Content Performance
  // ---------------------------------------------------------------------------

  describe("getContentPerformance", () => {
    it("combines exclusive content and clips", async () => {
      const now = new Date();
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([
        {
          id: "ec1",
          title: "Behind the Scenes",
          mediaType: "video",
          isGated: false,
          publishedAt: now,
        },
      ]);
      mockPrisma.userClip.findMany.mockResolvedValue([
        {
          id: "clip1",
          caption: "Killer set",
          upvotes: 50,
          downvotes: 5,
          createdAt: now,
        },
      ]);

      const result = await getContentPerformance("c1");

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.id === "ec1")?.type).toBe("video");
      expect(result.find((r) => r.id === "clip1")?.type).toBe("clip");
    });

    it("respects limit parameter", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([]);
      mockPrisma.userClip.findMany.mockResolvedValue([]);

      await getContentPerformance("c1", undefined, 5);

      expect(mockPrisma.exclusiveContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it("applies date range filter", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-06-30");
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([]);
      mockPrisma.userClip.findMany.mockResolvedValue([]);

      await getContentPerformance("c1", { from, to });

      expect(mockPrisma.exclusiveContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            comedianId: "c1",
            publishedAt: { gte: from, lte: to },
          },
        }),
      );
    });

    it("scores gated content higher", async () => {
      const now = new Date();
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([
        { id: "ec1", title: "Free", mediaType: "video", isGated: false, publishedAt: now },
        { id: "ec2", title: "Premium", mediaType: "video", isGated: true, publishedAt: now },
      ]);
      mockPrisma.userClip.findMany.mockResolvedValue([]);

      const result = await getContentPerformance("c1");

      const free = result.find((r) => r.id === "ec1");
      const premium = result.find((r) => r.id === "ec2");
      expect(premium!.engagementScore).toBeGreaterThan(free!.engagementScore);
    });
  });

  // ---------------------------------------------------------------------------
  // Audience Growth
  // ---------------------------------------------------------------------------

  describe("getAudienceGrowth", () => {
    it("returns daily growth points for the period", async () => {
      mockPrisma.comedianFollow.count.mockResolvedValue(100);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);

      const result = await getAudienceGrowth("c1", 7);

      expect(result).toHaveLength(7);
      expect(result[0].followers).toBe(100);
      expect(result[0].newFollowers).toBe(0);
    });

    it("accumulates followers over days", async () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockPrisma.comedianFollow.count.mockResolvedValue(50);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { createdAt: twoDaysAgo },
        { createdAt: twoDaysAgo },
        { createdAt: today },
      ]);

      const result = await getAudienceGrowth("c1", 5);

      // Base is 50, should grow from there
      expect(result.length).toBe(5);
      const lastPoint = result[result.length - 1];
      expect(lastPoint.followers).toBeGreaterThanOrEqual(50);
    });

    it("handles zero followers", async () => {
      mockPrisma.comedianFollow.count.mockResolvedValue(0);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);

      const result = await getAudienceGrowth("c1", 3);

      expect(result).toHaveLength(3);
      result.forEach((point) => {
        expect(point.followers).toBe(0);
        expect(point.newFollowers).toBe(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Engagement Trends
  // ---------------------------------------------------------------------------

  describe("getEngagementTrends", () => {
    it("returns daily engagement points", async () => {
      mockPrisma.userClip.findMany.mockResolvedValue([]);
      mockPrisma.fanTip.findMany.mockResolvedValue([]);

      const result = await getEngagementTrends("c1", 7);

      expect(result).toHaveLength(7);
      result.forEach((point) => {
        expect(point.totalEngagement).toBe(0);
      });
    });

    it("aggregates clip engagement by day", async () => {
      const today = new Date();
      const dayStr = today.toISOString().slice(0, 10);

      mockPrisma.userClip.findMany.mockResolvedValue([
        { upvotes: 10, downvotes: 2, createdAt: today },
        { upvotes: 5, downvotes: 1, createdAt: today },
      ]);
      mockPrisma.fanTip.findMany.mockResolvedValue([]);

      const result = await getEngagementTrends("c1", 1);

      const todayPoint = result.find((p) => p.date === dayStr);
      if (todayPoint) {
        expect(todayPoint.likes).toBe(15);
        expect(todayPoint.comments).toBe(3);
      }
    });

    it("includes tips as engagement signals", async () => {
      const today = new Date();
      const dayStr = today.toISOString().slice(0, 10);

      mockPrisma.userClip.findMany.mockResolvedValue([]);
      mockPrisma.fanTip.findMany.mockResolvedValue([
        { createdAt: today },
        { createdAt: today },
      ]);

      const result = await getEngagementTrends("c1", 1);

      const todayPoint = result.find((p) => p.date === dayStr);
      if (todayPoint) {
        expect(todayPoint.shares).toBe(2);
        expect(todayPoint.totalEngagement).toBe(2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Top Performing Content
  // ---------------------------------------------------------------------------

  describe("getTopPerformingContent", () => {
    it("returns top clips by engagement by default", async () => {
      mockPrisma.userClip.findMany.mockResolvedValue([
        { id: "c1", caption: "Best set", upvotes: 100 },
        { id: "c2", caption: "Good set", upvotes: 50 },
      ]);

      const result = await getTopPerformingContent("c1");

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(100);
      expect(result[0].metric).toBe("engagement");
    });

    it("returns revenue-based top content when metric is revenue", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { id: "ra1", sourceId: "special-1", sourceType: "CLIP", amount: 500 },
      ]);

      const result = await getTopPerformingContent("c1", "revenue");

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(500);
      expect(result[0].metric).toBe("revenue");
    });

    it("returns growth-based top content from performance metrics", async () => {
      mockPrisma.performanceMetric.findMany.mockResolvedValue([
        { id: "pm1", bitTitle: "Airport bit", laughScore: 95 },
        { id: "pm2", bitTitle: "Dad jokes", laughScore: 80 },
      ]);

      const result = await getTopPerformingContent("c1", "growth");

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(95);
      expect(result[0].metric).toBe("growth");
    });

    it("respects limit parameter", async () => {
      mockPrisma.userClip.findMany.mockResolvedValue([]);

      await getTopPerformingContent("c1", "engagement", 3);

      expect(mockPrisma.userClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Revenue By Content Type
  // ---------------------------------------------------------------------------

  describe("getRevenueByContentType", () => {
    it("aggregates revenue by type with percentages", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { revenueType: "TICKET", amount: 1000 },
        { revenueType: "TICKET", amount: 500 },
        { revenueType: "TIP", amount: 200 },
        { revenueType: "MERCH", amount: 300 },
      ]);

      const result = await getRevenueByContentType("c1");

      expect(result).toHaveLength(3);
      // Sorted by revenue desc
      expect(result[0].contentType).toBe("TICKET");
      expect(result[0].revenue).toBe(1500);
      expect(result[0].count).toBe(2);
      expect(result[0].percentage).toBeCloseTo(75, 0);

      const tipEntry = result.find((r) => r.contentType === "TIP");
      expect(tipEntry!.revenue).toBe(200);
      expect(tipEntry!.percentage).toBeCloseTo(10, 0);
    });

    it("returns empty array when no attributions exist", async () => {
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);

      const result = await getRevenueByContentType("c1");

      expect(result).toEqual([]);
    });

    it("applies date range filter", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-12-31");
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);

      await getRevenueByContentType("c1", { from, to });

      expect(mockPrisma.revenueAttribution.findMany).toHaveBeenCalledWith({
        where: {
          comedianId: "c1",
          attributedAt: { gte: from, lte: to },
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Full Summary
  // ---------------------------------------------------------------------------

  describe("getCreatorAnalyticsSummary", () => {
    it("returns a complete analytics summary", async () => {
      // Mock all dependencies
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([]);
      mockPrisma.userClip.findMany.mockResolvedValue([
        { id: "c1", caption: "Set", upvotes: 20, downvotes: 2, createdAt: new Date() },
      ]);
      mockPrisma.comedianFollow.count.mockResolvedValue(100);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.fanTip.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([
        { revenueType: "TICKET", amount: 500, sourceType: "ORGANIC", sourceId: null, id: "ra1" },
      ]);
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const result = await getCreatorAnalyticsSummary("c1", 7);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalFollowers).toBe(100);
      expect(result.summary.totalRevenue).toBe(500);
      expect(result.contentPerformance).toBeDefined();
      expect(result.audienceGrowth).toHaveLength(7);
      expect(result.engagementTrends).toHaveLength(7);
      expect(result.topContent).toBeDefined();
      expect(result.revenueBreakdown).toHaveLength(1);
    });

    it("calculates follower growth rate", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([]);
      mockPrisma.userClip.findMany.mockResolvedValue([]);

      const recentFollow = new Date();
      recentFollow.setDate(recentFollow.getDate() - 1);

      mockPrisma.comedianFollow.count.mockResolvedValue(90);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
        { createdAt: recentFollow },
      ]);
      mockPrisma.fanTip.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const result = await getCreatorAnalyticsSummary("c1", 7);

      // 10 new followers / 90 base = 11.11% growth
      expect(result.summary.newFollowersInPeriod).toBe(10);
      expect(result.summary.followerGrowthRate).toBeCloseTo(11.11, 0);
    });

    it("handles zero-data scenario", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([]);
      mockPrisma.userClip.findMany.mockResolvedValue([]);
      mockPrisma.comedianFollow.count.mockResolvedValue(0);
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.fanTip.findMany.mockResolvedValue([]);
      mockPrisma.revenueAttribution.findMany.mockResolvedValue([]);
      mockPrisma.performanceMetric.findMany.mockResolvedValue([]);

      const result = await getCreatorAnalyticsSummary("c1", 7);

      expect(result.summary.totalFollowers).toBe(0);
      expect(result.summary.totalEngagement).toBe(0);
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.followerGrowthRate).toBe(0);
    });
  });
});
