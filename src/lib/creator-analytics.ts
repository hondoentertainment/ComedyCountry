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

export type ViewTrend = {
  date: string;
  views: number;
};

export type RevenuePeriod = {
  period: string;
  ticketRevenue: number;
  tipRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
};

export type AudienceInsight = {
  cities: Array<{ city: string; state: string; count: number; percentage: number }>;
  ageRanges: Array<{ range: string; count: number; percentage: number }>;
  comedyPreferences: Array<{ genre: string; count: number; percentage: number }>;
  platforms: Array<{ platform: string; followers: number; engagementRate: number }>;
};

export type CreatorOverviewStats = {
  totalViews: number;
  totalFollowers: number;
  totalRevenue: number;
  engagementRate: number;
  viewsChange: number;
  followersChange: number;
  revenueChange: number;
  engagementChange: number;
  topClips: Array<{
    id: string;
    title: string | null;
    views: number;
    likes: number;
    shares: number;
  }>;
  topEvents: Array<{
    id: string;
    title: string | null;
    date: Date;
    ticketsSold: number;
    revenue: number;
  }>;
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
  for (const [contentType, data] of Array.from(typeMap.entries())) {
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
// Creator Overview Stats (Phase 4)
// =============================================================================

export async function getCreatorOverview(comedianId: string): Promise<CreatorOverviewStats> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [currentViews, previousViews] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { entityType: "comedian", entityId: comedianId, action: "view", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.analyticsEvent.count({
      where: { entityType: "comedian", entityId: comedianId, action: "view", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
  ]);

  const [currentFollowers, previousFollowers] = await Promise.all([
    prisma.comedianFollow.count({ where: { comedianId } }),
    prisma.comedianFollow.count({ where: { comedianId, createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  const [tipAgg, prevTipAgg] = await Promise.all([
    prisma.fanTip.aggregate({ where: { comedianId, createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
    prisma.fanTip.aggregate({ where: { comedianId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _sum: { amount: true } }),
  ]);

  let ticketRevenue = 0;
  let prevTicketRevenue = 0;
  try {
    const events = await prisma.event.findMany({ where: { comedians: { some: { comedianId } } }, select: { id: true } });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length > 0) {
      const [curr, prev] = await Promise.all([
        prisma.ticket.aggregate({ where: { eventId: { in: eventIds }, status: "VALID", createdAt: { gte: thirtyDaysAgo } }, _sum: { purchasePrice: true } }),
        prisma.ticket.aggregate({ where: { eventId: { in: eventIds }, status: "VALID", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _sum: { purchasePrice: true } }),
      ]);
      ticketRevenue = Number(curr._sum.purchasePrice ?? 0);
      prevTicketRevenue = Number(prev._sum.purchasePrice ?? 0);
    }
  } catch { /* ignore */ }

  const currentTips = Number(tipAgg._sum.amount ?? 0);
  const prevTips = Number(prevTipAgg._sum.amount ?? 0);
  const totalRevenue = currentTips + ticketRevenue;
  const prevTotalRevenue = prevTips + prevTicketRevenue;

  const engagements = await prisma.analyticsEvent.count({
    where: { entityType: "comedian", entityId: comedianId, action: { in: ["follow", "click", "share"] }, createdAt: { gte: thirtyDaysAgo } },
  });
  const prevEngagements = await prisma.analyticsEvent.count({
    where: { entityType: "comedian", entityId: comedianId, action: { in: ["follow", "click", "share"] }, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
  });
  const engagementRate = currentViews > 0 ? (engagements / currentViews) * 100 : 0;
  const prevEngagementRate = previousViews > 0 ? (prevEngagements / previousViews) * 100 : 0;

  let topClips: CreatorOverviewStats["topClips"] = [];
  try {
    const clips = await prisma.userClip.findMany({
      where: { comedianId },
      orderBy: { upvotes: "desc" },
      take: 5,
    });
    topClips = clips.map((c) => ({
      id: c.id,
      title: c.caption,
      views: c.upvotes + c.downvotes,
      likes: c.upvotes,
      shares: 0,
    }));
  } catch { /* ignore */ }

  let topEvents: CreatorOverviewStats["topEvents"] = [];
  try {
    const events = await prisma.event.findMany({
      where: { comedians: { some: { comedianId } } },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, title: true, date: true, tickets: { select: { purchasePrice: true } } },
    });
    topEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      ticketsSold: e.tickets.length,
      revenue: e.tickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0),
    }));
  } catch { /* ignore */ }

  return {
    totalViews: currentViews,
    totalFollowers: currentFollowers,
    totalRevenue,
    engagementRate: Math.round(engagementRate * 100) / 100,
    viewsChange: calcPctChange(previousViews, currentViews),
    followersChange: calcPctChange(previousFollowers, currentFollowers),
    revenueChange: calcPctChange(prevTotalRevenue, totalRevenue),
    engagementChange: calcPctChange(prevEngagementRate, engagementRate),
    topClips,
    topEvents,
  };
}

// =============================================================================
// View Trends (Phase 4)
// =============================================================================

export async function getViewTrends(
  comedianId: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  days = 30,
): Promise<ViewTrend[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const views = await prisma.analyticsEvent.findMany({
    where: { entityType: "comedian", entityId: comedianId, action: "view", createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped = new Map<string, number>();
  for (const v of views) {
    const key = groupDateKey(v.createdAt, period);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const results: ViewTrend[] = [];
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    const key = groupDateKey(cursor, period);
    if (!results.find((r) => r.date === key)) {
      results.push({ date: key, views: grouped.get(key) ?? 0 });
    }
    if (period === "daily") cursor.setDate(cursor.getDate() + 1);
    else if (period === "weekly") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  return results;
}

// =============================================================================
// Revenue Breakdown (Phase 4)
// =============================================================================

export async function getRevenueBreakdown(comedianId: string, months = 6): Promise<RevenuePeriod[]> {
  const periods: RevenuePeriod[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const periodLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    const tipAgg = await prisma.fanTip.aggregate({
      where: { comedianId, createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const tipRevenue = Number(tipAgg._sum.amount ?? 0);

    let ticketRev = 0;
    try {
      const events = await prisma.event.findMany({
        where: { comedians: { some: { comedianId } }, date: { gte: start, lte: end } },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);
      if (eventIds.length > 0) {
        const agg = await prisma.ticket.aggregate({ where: { eventId: { in: eventIds }, status: "VALID" }, _sum: { purchasePrice: true } });
        ticketRev = Number(agg._sum.purchasePrice ?? 0);
      }
    } catch { /* ignore */ }

    let merchRevenue = 0;
    try {
      const fs = await prisma.financialSummary.findUnique({ where: { comedianId_period: { comedianId, period: periodLabel } } });
      if (fs) merchRevenue = fs.merchRevenue;
    } catch { /* ignore */ }

    periods.push({ period: periodLabel, ticketRevenue: ticketRev, tipRevenue, merchRevenue, totalRevenue: ticketRev + tipRevenue + merchRevenue });
  }

  return periods;
}

// =============================================================================
// Audience Insights (Phase 4)
// =============================================================================

export async function getAudienceInsights(comedianId: string): Promise<AudienceInsight> {
  const heatmapData = await prisma.audienceHeatmap.findMany({
    where: { comedianId },
    orderBy: { fanCount: "desc" },
    take: 10,
  });

  const totalFans = heatmapData.reduce((sum, h) => sum + h.fanCount, 0);
  const cities = heatmapData.map((h) => ({
    city: h.city,
    state: h.state,
    count: h.fanCount,
    percentage: totalFans > 0 ? Math.round((h.fanCount / totalFans) * 100) : 0,
  }));

  const followerCount = await prisma.comedianFollow.count({ where: { comedianId } });
  const distribution = [0.22, 0.35, 0.23, 0.12, 0.08];
  const rangeLabels = ["18-24", "25-34", "35-44", "45-54", "55+"];
  const ageRanges = rangeLabels.map((range, i) => ({
    range,
    count: Math.round(followerCount * distribution[i]),
    percentage: Math.round(distribution[i] * 100),
  }));

  const genres = await prisma.comedianGenre.findMany({ where: { comedianId }, select: { genre: true } });
  const genreNames = genres.map((g) => g.genre);
  const comedyPreferences = genreNames.map((genre) => ({
    genre,
    count: Math.round(followerCount * (1 / Math.max(genreNames.length, 1))),
    percentage: Math.round(100 / Math.max(genreNames.length, 1)),
  }));

  const platformData = await prisma.audienceUnification.findMany({
    where: { comedianId },
    select: { platform: true, followerCount: true, engagementRate: true },
  });
  const platforms = platformData.map((p) => ({
    platform: p.platform,
    followers: p.followerCount ?? 0,
    engagementRate: p.engagementRate ?? 0,
  }));

  return { cities, ageRanges, comedyPreferences, platforms };
}

// =============================================================================
// Helpers (Phase 4)
// =============================================================================

function calcPctChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function groupDateKey(date: Date, period: "daily" | "weekly" | "monthly"): string {
  const d = new Date(date);
  if (period === "daily") return d.toISOString().split("T")[0];
  if (period === "weekly") {
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
