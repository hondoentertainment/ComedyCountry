import { prisma } from "./prisma";

// =============================================================================
// Types
// =============================================================================

type DateRange = {
  from?: Date;
  to?: Date;
};

type ContentPerformanceItem = {
  id: string;
  title: string;
  type: string;
  views: number;
  engagementScore: number;
  publishedAt: Date;
};

type AudienceGrowthPoint = {
  date: string;
  followers: number;
  newFollowers: number;
};

type EngagementTrendPoint = {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  totalEngagement: number;
};

type TopContent = {
  id: string;
  title: string;
  type: string;
  score: number;
  metric: string;
};

type RevenueByContentType = {
  contentType: string;
  revenue: number;
  percentage: number;
  count: number;
};

// =============================================================================
// Content Performance Tracking
// =============================================================================

export async function getContentPerformance(
  comedianId: string,
  dateRange?: DateRange,
  limit = 20,
): Promise<ContentPerformanceItem[]> {
  const where: Record<string, unknown> = { comedianId };

  if (dateRange?.from || dateRange?.to) {
    where.publishedAt = {
      ...(dateRange.from && { gte: dateRange.from }),
      ...(dateRange.to && { lte: dateRange.to }),
    };
  }

  const content = await prisma.exclusiveContent.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  // Enrich with engagement data from clips if available
  const clipData = await prisma.userClip.findMany({
    where: { comedianId },
    select: {
      id: true,
      caption: true,
      upvotes: true,
      downvotes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const contentItems: ContentPerformanceItem[] = content.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.mediaType ?? "text",
    views: 0, // views tracked externally
    engagementScore: c.isGated ? 2 : 1, // gated content scores higher baseline
    publishedAt: c.publishedAt,
  }));

  const clipItems: ContentPerformanceItem[] = clipData.map((c) => ({
    id: c.id,
    title: c.caption ?? "Untitled clip",
    type: "clip",
    views: c.upvotes + c.downvotes, // proxy for total interactions
    engagementScore: c.upvotes - c.downvotes,
    publishedAt: c.createdAt,
  }));

  const combined = [...contentItems, ...clipItems]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);

  return combined;
}

// =============================================================================
// Audience Growth Metrics
// =============================================================================

export async function getAudienceGrowth(
  comedianId: string,
  days = 30,
): Promise<AudienceGrowthPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const follows = await prisma.comedianFollow.findMany({
    where: {
      comedianId,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Get total followers before the period
  const baseFollowers = await prisma.comedianFollow.count({
    where: {
      comedianId,
      createdAt: { lt: since },
    },
  });

  // Group follows by day
  const dailyMap = new Map<string, number>();
  for (const f of follows) {
    const day = f.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  // Build time series
  const points: AudienceGrowthPoint[] = [];
  let cumulativeFollowers = baseFollowers;

  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const newFollowers = dailyMap.get(dateStr) ?? 0;
    cumulativeFollowers += newFollowers;

    points.push({
      date: dateStr,
      followers: cumulativeFollowers,
      newFollowers,
    });
  }

  return points;
}

// =============================================================================
// Engagement Trends
// =============================================================================

export async function getEngagementTrends(
  comedianId: string,
  days = 30,
): Promise<EngagementTrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Gather clip engagement as proxy
  const clips = await prisma.userClip.findMany({
    where: {
      comedianId,
      createdAt: { gte: since },
    },
    select: {
      upvotes: true,
      downvotes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Gather tips as engagement signal
  const tips = await prisma.fanTip.findMany({
    where: {
      comedianId,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dailyMap = new Map<
    string,
    { likes: number; comments: number; shares: number }
  >();

  for (const clip of clips) {
    const day = clip.createdAt.toISOString().slice(0, 10);
    const current = dailyMap.get(day) ?? { likes: 0, comments: 0, shares: 0 };
    current.likes += clip.upvotes;
    current.comments += clip.downvotes; // using downvotes as comment proxy
    dailyMap.set(day, current);
  }

  for (const tip of tips) {
    const day = tip.createdAt.toISOString().slice(0, 10);
    const current = dailyMap.get(day) ?? { likes: 0, comments: 0, shares: 0 };
    current.shares += 1; // tips indicate engagement/sharing
    dailyMap.set(day, current);
  }

  // Build time series
  const points: EngagementTrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const data = dailyMap.get(dateStr) ?? { likes: 0, comments: 0, shares: 0 };
    points.push({
      date: dateStr,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      totalEngagement: data.likes + data.comments + data.shares,
    });
  }

  return points;
}

// =============================================================================
// Top Performing Content
// =============================================================================

export async function getTopPerformingContent(
  comedianId: string,
  metric: "engagement" | "revenue" | "growth" = "engagement",
  limit = 10,
): Promise<TopContent[]> {
  if (metric === "revenue") {
    const attributions = await prisma.revenueAttribution.findMany({
      where: { comedianId },
      orderBy: { amount: "desc" },
      take: limit,
    });

    return attributions.map((a) => ({
      id: a.id,
      title: a.sourceId ?? "Direct",
      type: a.sourceType,
      score: a.amount,
      metric: "revenue",
    }));
  }

  if (metric === "growth") {
    // Growth = content that drove the most follows
    // Use performance metrics as a proxy: high laugh score = audience growth driver
    const performances = await prisma.performanceMetric.findMany({
      where: { comedianId },
      orderBy: { laughScore: "desc" },
      take: limit,
    });

    return performances.map((p) => ({
      id: p.id,
      title: p.bitTitle,
      type: "performance",
      score: p.laughScore,
      metric: "growth",
    }));
  }

  // Default: engagement = clips sorted by upvotes
  const clips = await prisma.userClip.findMany({
    where: { comedianId },
    orderBy: { upvotes: "desc" },
    take: limit,
  });

  return clips.map((c) => ({
    id: c.id,
    title: c.caption ?? "Untitled",
    type: "clip",
    score: c.upvotes,
    metric: "engagement",
  }));
}

// =============================================================================
// Revenue Per Content Type Breakdown
// =============================================================================

export async function getRevenueByContentType(
  comedianId: string,
  dateRange?: DateRange,
): Promise<RevenueByContentType[]> {
  const where: Record<string, unknown> = { comedianId };
  if (dateRange?.from || dateRange?.to) {
    where.attributedAt = {
      ...(dateRange.from && { gte: dateRange.from }),
      ...(dateRange.to && { lte: dateRange.to }),
    };
  }

  const attributions = await prisma.revenueAttribution.findMany({ where });

  // Aggregate by revenueType
  const typeMap = new Map<string, { revenue: number; count: number }>();
  let totalRevenue = 0;

  for (const a of attributions) {
    const current = typeMap.get(a.revenueType) ?? { revenue: 0, count: 0 };
    current.revenue += a.amount;
    current.count += 1;
    totalRevenue += a.amount;
    typeMap.set(a.revenueType, current);
  }

  const breakdown: RevenueByContentType[] = [];
  for (const [contentType, data] of typeMap.entries()) {
    breakdown.push({
      contentType,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      count: data.count,
    });
  }

  // Sort by revenue descending
  breakdown.sort((a, b) => b.revenue - a.revenue);

  return breakdown;
}

// =============================================================================
// Full Analytics Dashboard Summary
// =============================================================================

export async function getCreatorAnalyticsSummary(
  comedianId: string,
  days = 30,
) {
  const [contentPerf, growth, trends, topContent, revenueBreakdown] =
    await Promise.all([
      getContentPerformance(comedianId, undefined, 10),
      getAudienceGrowth(comedianId, days),
      getEngagementTrends(comedianId, days),
      getTopPerformingContent(comedianId, "engagement", 5),
      getRevenueByContentType(comedianId),
    ]);

  const totalFollowers = growth.length > 0 ? growth[growth.length - 1].followers : 0;
  const newFollowersInPeriod = growth.reduce((s, g) => s + g.newFollowers, 0);
  const totalEngagement = trends.reduce((s, t) => s + t.totalEngagement, 0);
  const totalRevenue = revenueBreakdown.reduce((s, r) => s + r.revenue, 0);

  return {
    summary: {
      totalFollowers,
      newFollowersInPeriod,
      followerGrowthRate:
        totalFollowers > 0
          ? (newFollowersInPeriod / Math.max(totalFollowers - newFollowersInPeriod, 1)) * 100
          : 0,
      totalEngagement,
      avgDailyEngagement: days > 0 ? totalEngagement / days : 0,
      totalRevenue,
    },
    contentPerformance: contentPerf,
    audienceGrowth: growth,
    engagementTrends: trends,
    topContent,
    revenueBreakdown,
  };
}
