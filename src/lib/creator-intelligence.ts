import { prisma } from "@/lib/prisma";

/**
 * Creator Intelligence Dashboard — unified analytics replacing 5-10 fragmented SaaS tools.
 */

// ---------------------------------------------------------------------------
// Revenue Attribution
// ---------------------------------------------------------------------------

export async function attributeRevenue(
  comedianId: string,
  data: {
    sourceType: "CLIP" | "PODCAST" | "SOCIAL" | "REFERRAL" | "ORGANIC";
    sourceId?: string;
    revenueType: "TICKET" | "MERCH" | "TIP" | "SUBSCRIPTION";
    amount: number;
    attributedAt?: Date;
  },
) {
  return prisma.revenueAttribution.create({
    data: {
      comedianId,
      sourceType: data.sourceType,
      sourceId: data.sourceId ?? null,
      revenueType: data.revenueType,
      amount: data.amount,
      attributedAt: data.attributedAt ?? new Date(),
    },
  });
}

export async function getRevenueAttribution(
  comedianId: string,
  dateRange?: { from: Date; to: Date },
) {
  const where: Record<string, unknown> = { comedianId };
  if (dateRange) {
    where.attributedAt = { gte: dateRange.from, lte: dateRange.to };
  }

  const attributions = await prisma.revenueAttribution.findMany({
    where,
    orderBy: { attributedAt: "desc" },
  });

  // Group by sourceType → revenueType
  const bySource: Record<string, Record<string, number>> = {};
  for (const a of attributions) {
    if (!bySource[a.sourceType]) bySource[a.sourceType] = {};
    bySource[a.sourceType][a.revenueType] =
      (bySource[a.sourceType][a.revenueType] ?? 0) + a.amount;
  }

  return { attributions, bySource };
}

export async function getRevenueBySource(comedianId: string) {
  const attributions = await prisma.revenueAttribution.findMany({
    where: { comedianId },
  });

  const bySource: Record<string, number> = {};
  for (const a of attributions) {
    bySource[a.sourceType] = (bySource[a.sourceType] ?? 0) + a.amount;
  }

  return Object.entries(bySource)
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Audience Unification
// ---------------------------------------------------------------------------

export async function syncAudiencePlatform(
  comedianId: string,
  platform: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "PODCAST" | "TICKET_BUYER" | "MERCH_BUYER",
  data: {
    platformUserId?: string;
    email?: string;
    followerCount?: number;
    engagementRate?: number;
  },
) {
  // Upsert by comedianId + platform + platformUserId
  const existing = await prisma.audienceUnification.findFirst({
    where: {
      comedianId,
      platform,
      ...(data.platformUserId ? { platformUserId: data.platformUserId } : {}),
      ...(data.email ? { email: data.email } : {}),
    },
  });

  if (existing) {
    return prisma.audienceUnification.update({
      where: { id: existing.id },
      data: {
        followerCount: data.followerCount ?? existing.followerCount,
        engagementRate: data.engagementRate ?? existing.engagementRate,
        email: data.email ?? existing.email,
        lastSyncedAt: new Date(),
      },
    });
  }

  return prisma.audienceUnification.create({
    data: {
      comedianId,
      platform,
      platformUserId: data.platformUserId ?? null,
      email: data.email ?? null,
      followerCount: data.followerCount ?? null,
      engagementRate: data.engagementRate ?? null,
    },
  });
}

export async function getUnifiedAudience(comedianId: string) {
  const records = await prisma.audienceUnification.findMany({
    where: { comedianId },
    orderBy: { lastSyncedAt: "desc" },
  });

  const totalFollowers = records.reduce((s, r) => s + (r.followerCount ?? 0), 0);
  const avgEngagement =
    records.length > 0
      ? records.reduce((s, r) => s + (r.engagementRate ?? 0), 0) / records.length
      : 0;

  const platformBreakdown = records.map((r) => ({
    platform: r.platform,
    followerCount: r.followerCount,
    engagementRate: r.engagementRate,
    lastSyncedAt: r.lastSyncedAt,
  }));

  return { totalFollowers, avgEngagement, platformBreakdown, records };
}

export async function getAudienceOverlap(comedianId: string) {
  const records = await prisma.audienceUnification.findMany({
    where: { comedianId },
  });

  // Find overlap by matching emails across platforms
  const emailMap: Record<string, string[]> = {};
  for (const r of records) {
    if (r.email) {
      if (!emailMap[r.email]) emailMap[r.email] = [];
      emailMap[r.email].push(r.platform);
    }
  }

  const overlapping = Object.entries(emailMap)
    .filter(([, platforms]) => platforms.length > 1)
    .map(([email, platforms]) => ({ email, platforms }));

  const platformPairs: Record<string, number> = {};
  for (const { platforms } of overlapping) {
    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const key = [platforms[i], platforms[j]].sort().join("-");
        platformPairs[key] = (platformPairs[key] ?? 0) + 1;
      }
    }
  }

  return {
    totalRecords: records.length,
    overlappingUsers: overlapping.length,
    platformPairs,
    overlapping,
  };
}

// ---------------------------------------------------------------------------
// Content Distribution
// ---------------------------------------------------------------------------

export async function scheduleContentDistribution(
  comedianId: string,
  content: {
    contentId: string;
    title: string;
    platforms: string[];
    scheduledAt?: Date;
  },
) {
  return prisma.contentDistribution.create({
    data: {
      comedianId,
      contentId: content.contentId,
      title: content.title,
      platforms: content.platforms,
      scheduledAt: content.scheduledAt ?? null,
    },
  });
}

export async function getContentPerformance(
  comedianId: string,
  contentId: string,
) {
  const distribution = await prisma.contentDistribution.findFirst({
    where: { comedianId, contentId },
  });

  if (!distribution) return null;

  return {
    id: distribution.id,
    contentId: distribution.contentId,
    title: distribution.title,
    platforms: distribution.platforms,
    scheduledAt: distribution.scheduledAt,
    distributedAt: distribution.distributedAt,
    performanceByPlatform: distribution.performanceByPlatform,
  };
}

// ---------------------------------------------------------------------------
// Career Milestones
// ---------------------------------------------------------------------------

export async function recordCareerMilestone(
  comedianId: string,
  data: {
    milestone: string;
    metric: string;
    value: number;
    previousBest?: number;
    achievedAt?: Date;
  },
) {
  return prisma.careerMilestone.create({
    data: {
      comedianId,
      milestone: data.milestone,
      metric: data.metric,
      value: data.value,
      previousBest: data.previousBest ?? null,
      achievedAt: data.achievedAt ?? new Date(),
    },
  });
}

export async function getCareerTimeline(comedianId: string) {
  return prisma.careerMilestone.findMany({
    where: { comedianId },
    orderBy: { achievedAt: "asc" },
  });
}

export async function checkMilestones(comedianId: string) {
  const detected: Array<{
    milestone: string;
    metric: string;
    value: number;
  }> = [];

  // Check follower thresholds
  const audience = await prisma.audienceUnification.findMany({
    where: { comedianId },
  });
  const totalFollowers = audience.reduce(
    (s, r) => s + (r.followerCount ?? 0),
    0,
  );

  const followerThresholds = [1000, 10000, 50000, 100000, 500000, 1000000];
  const existingMilestones = await prisma.careerMilestone.findMany({
    where: { comedianId },
  });
  const existingMetrics = new Set(
    existingMilestones.map((m) => `${m.metric}:${m.value}`),
  );

  for (const threshold of followerThresholds) {
    if (
      totalFollowers >= threshold &&
      !existingMetrics.has(`followers:${threshold}`)
    ) {
      detected.push({
        milestone: `Reached ${threshold.toLocaleString()} total followers`,
        metric: "followers",
        value: threshold,
      });
    }
  }

  // Check revenue thresholds
  const revenue = await prisma.revenueAttribution.findMany({
    where: { comedianId },
  });
  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);

  const revenueThresholds = [1000, 5000, 10000, 50000, 100000];
  for (const threshold of revenueThresholds) {
    if (
      totalRevenue >= threshold &&
      !existingMetrics.has(`revenue:${threshold}`)
    ) {
      detected.push({
        milestone: `Earned $${threshold.toLocaleString()} total revenue`,
        metric: "revenue",
        value: threshold,
      });
    }
  }

  // Check first sellout (ticket events with sold out status)
  if (!existingMetrics.has("sellout:1")) {
    try {
      const events = await prisma.event.findMany({
        where: { comedians: { some: { comedianId } } },
        select: { id: true, ticketTypes: { select: { capacity: true } } },
      });
      for (const event of events) {
        const totalCapacity = event.ticketTypes.reduce((sum: number, tt: { capacity: number }) => sum + tt.capacity, 0);
        if (totalCapacity > 0) {
          const ticketCount = await prisma.ticket.count({
            where: { eventId: event.id, status: "VALID" },
          });
          if (ticketCount >= totalCapacity) {
            detected.push({
              milestone: "First sold-out show",
              metric: "sellout",
              value: 1,
            });
            break;
          }
        }
      }
    } catch {
      // Event/Ticket tables may not exist
    }
  }

  return detected;
}

// ---------------------------------------------------------------------------
// Financial Summary
// ---------------------------------------------------------------------------

export async function generateFinancialSummary(
  comedianId: string,
  period: string,
) {
  // Determine date range from period string (e.g. "2026-01", "2026-Q1", "2026")
  const { from, to } = parsePeriod(period);

  const attributions = await prisma.revenueAttribution.findMany({
    where: {
      comedianId,
      attributedAt: { gte: from, lte: to },
    },
  });

  let ticketRevenue = 0;
  let merchRevenue = 0;
  let tipRevenue = 0;
  let subscriptionRevenue = 0;

  for (const a of attributions) {
    switch (a.revenueType) {
      case "TICKET":
        ticketRevenue += a.amount;
        break;
      case "MERCH":
        merchRevenue += a.amount;
        break;
      case "TIP":
        tipRevenue += a.amount;
        break;
      case "SUBSCRIPTION":
        subscriptionRevenue += a.amount;
        break;
    }
  }

  const totalRevenue =
    ticketRevenue + merchRevenue + tipRevenue + subscriptionRevenue;
  const taxEstimate = totalRevenue * 0.25; // Estimate 25% tax rate

  return prisma.financialSummary.upsert({
    where: { comedianId_period: { comedianId, period } },
    create: {
      comedianId,
      period,
      ticketRevenue,
      merchRevenue,
      tipRevenue,
      subscriptionRevenue,
      totalRevenue,
      taxEstimate,
    },
    update: {
      ticketRevenue,
      merchRevenue,
      tipRevenue,
      subscriptionRevenue,
      totalRevenue,
      taxEstimate,
    },
  });
}

export async function getFinancialSummary(
  comedianId: string,
  period?: string,
) {
  if (period) {
    return prisma.financialSummary.findUnique({
      where: { comedianId_period: { comedianId, period } },
    });
  }

  return prisma.financialSummary.findMany({
    where: { comedianId },
    orderBy: { period: "desc" },
  });
}

export async function getFinancialForecast(
  comedianId: string,
  months = 3,
) {
  const summaries = await prisma.financialSummary.findMany({
    where: { comedianId },
    orderBy: { period: "asc" },
  });

  if (summaries.length < 2) {
    return {
      forecast: [],
      trend: "insufficient_data" as const,
      averageMonthlyRevenue: summaries.length === 1 ? summaries[0].totalRevenue : 0,
    };
  }

  // Calculate growth rate from available periods
  const revenues = summaries.map((s) => s.totalRevenue);
  const growthRates: number[] = [];
  for (let i = 1; i < revenues.length; i++) {
    if (revenues[i - 1] > 0) {
      growthRates.push((revenues[i] - revenues[i - 1]) / revenues[i - 1]);
    }
  }

  const avgGrowthRate =
    growthRates.length > 0
      ? growthRates.reduce((s, r) => s + r, 0) / growthRates.length
      : 0;

  const lastRevenue = revenues[revenues.length - 1];
  const averageMonthlyRevenue =
    revenues.reduce((s, r) => s + r, 0) / revenues.length;

  const forecast: Array<{ month: number; projected: number }> = [];
  for (let i = 1; i <= months; i++) {
    forecast.push({
      month: i,
      projected: Math.round(lastRevenue * Math.pow(1 + avgGrowthRate, i) * 100) / 100,
    });
  }

  const trend =
    avgGrowthRate > 0.05
      ? ("growing" as const)
      : avgGrowthRate < -0.05
        ? ("declining" as const)
        : ("stable" as const);

  return { forecast, trend, averageMonthlyRevenue, avgGrowthRate };
}

export async function getTopRevenueSources(comedianId: string, limit = 10) {
  const attributions = await prisma.revenueAttribution.findMany({
    where: { comedianId },
  });

  const bySourceId: Record<
    string,
    { sourceType: string; sourceId: string | null; total: number; count: number }
  > = {};

  for (const a of attributions) {
    const key = `${a.sourceType}:${a.sourceId ?? "none"}`;
    if (!bySourceId[key]) {
      bySourceId[key] = {
        sourceType: a.sourceType,
        sourceId: a.sourceId,
        total: 0,
        count: 0,
      };
    }
    bySourceId[key].total += a.amount;
    bySourceId[key].count += 1;
  }

  return Object.values(bySourceId)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePeriod(period: string): { from: Date; to: Date } {
  // "2026-01" → month
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    return { from, to };
  }

  // "2026-Q1" → quarter
  const quarterMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3;
    const from = new Date(year, startMonth, 1);
    const to = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    return { from, to };
  }

  // "2026" → full year
  if (/^\d{4}$/.test(period)) {
    const year = Number(period);
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    return { from, to };
  }

  // Fallback: last 30 days
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}
