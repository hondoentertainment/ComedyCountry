import { prisma } from "./prisma";

// =============================================================================
// Types
// =============================================================================

type DateRange = {
  from?: Date;
  to?: Date;
};

type HeatmapFilters = {
  country?: string;
  state?: string;
  minFanCount?: number;
};

type IndustryTrendFilters = {
  category?: string;
  region?: string;
  period?: string;
};

type PerformanceMetricInput = {
  comedianId: string;
  eventId: string;
  bitTitle: string;
  laughScore: number;
  crowdReaction: "SILENT" | "CHUCKLES" | "LAUGHING" | "ROARING" | "STANDING_OVATION";
  audienceSize: number;
  city: string;
  date: Date;
};

// =============================================================================
// Performance Metrics
// =============================================================================

export async function recordPerformanceMetric(data: PerformanceMetricInput) {
  if (data.laughScore < 0 || data.laughScore > 100) {
    throw new Error("laughScore must be between 0 and 100");
  }
  if (data.audienceSize < 0) {
    throw new Error("audienceSize must be non-negative");
  }

  return prisma.performanceMetric.create({
    data: {
      comedianId: data.comedianId,
      eventId: data.eventId,
      bitTitle: data.bitTitle,
      laughScore: data.laughScore,
      crowdReaction: data.crowdReaction,
      audienceSize: data.audienceSize,
      city: data.city,
      date: data.date,
    },
  });
}

export async function getComedianPerformanceReport(
  comedianId: string,
  dateRange?: DateRange
) {
  const where: Record<string, unknown> = { comedianId };
  if (dateRange?.from || dateRange?.to) {
    where.date = {
      ...(dateRange.from && { gte: dateRange.from }),
      ...(dateRange.to && { lte: dateRange.to }),
    };
  }

  const metrics = await prisma.performanceMetric.findMany({
    where,
    orderBy: { date: "desc" },
  });

  if (metrics.length === 0) {
    return {
      comedianId,
      totalPerformances: 0,
      averageLaughScore: 0,
      bestBits: [],
      worstBits: [],
      cityBreakdown: [],
      metrics: [],
    };
  }

  // Aggregate by bit title
  const bitScores: Record<string, { total: number; count: number }> = {};
  metrics.forEach((m) => {
    if (!bitScores[m.bitTitle]) {
      bitScores[m.bitTitle] = { total: 0, count: 0 };
    }
    bitScores[m.bitTitle].total += m.laughScore;
    bitScores[m.bitTitle].count += 1;
  });

  const bitRankings = Object.entries(bitScores)
    .map(([title, data]) => ({
      bitTitle: title,
      avgLaughScore: Math.round(data.total / data.count),
      performanceCount: data.count,
    }))
    .sort((a, b) => b.avgLaughScore - a.avgLaughScore);

  // Aggregate by city
  const cityScores: Record<string, { total: number; count: number; audiences: number[] }> = {};
  metrics.forEach((m) => {
    if (!cityScores[m.city]) {
      cityScores[m.city] = { total: 0, count: 0, audiences: [] };
    }
    cityScores[m.city].total += m.laughScore;
    cityScores[m.city].count += 1;
    cityScores[m.city].audiences.push(m.audienceSize);
  });

  const cityBreakdown = Object.entries(cityScores)
    .map(([city, data]) => ({
      city,
      avgLaughScore: Math.round(data.total / data.count),
      showCount: data.count,
      avgAudienceSize: Math.round(
        data.audiences.reduce((s, a) => s + a, 0) / data.audiences.length
      ),
    }))
    .sort((a, b) => b.avgLaughScore - a.avgLaughScore);

  const totalLaughScore = metrics.reduce((s, m) => s + m.laughScore, 0);

  return {
    comedianId,
    totalPerformances: metrics.length,
    averageLaughScore: Math.round(totalLaughScore / metrics.length),
    bestBits: bitRankings.slice(0, 5),
    worstBits: bitRankings.slice(-5).reverse(),
    cityBreakdown,
    metrics,
  };
}

export async function getTopPerformingBits(comedianId: string, limit = 10) {
  const metrics = await prisma.performanceMetric.findMany({
    where: { comedianId },
  });

  if (metrics.length === 0) return [];

  const bitScores: Record<string, { total: number; count: number; reactions: string[] }> = {};
  metrics.forEach((m) => {
    if (!bitScores[m.bitTitle]) {
      bitScores[m.bitTitle] = { total: 0, count: 0, reactions: [] };
    }
    bitScores[m.bitTitle].total += m.laughScore;
    bitScores[m.bitTitle].count += 1;
    bitScores[m.bitTitle].reactions.push(m.crowdReaction);
  });

  return Object.entries(bitScores)
    .map(([title, data]) => ({
      bitTitle: title,
      avgLaughScore: Math.round(data.total / data.count),
      performanceCount: data.count,
      bestReaction: getBestReaction(data.reactions),
    }))
    .sort((a, b) => b.avgLaughScore - a.avgLaughScore)
    .slice(0, limit);
}

export async function getCityPerformanceComparison(comedianId: string) {
  const metrics = await prisma.performanceMetric.findMany({
    where: { comedianId },
  });

  if (metrics.length === 0) return [];

  const cityData: Record<
    string,
    { scores: number[]; audiences: number[]; reactions: string[] }
  > = {};
  metrics.forEach((m) => {
    if (!cityData[m.city]) {
      cityData[m.city] = { scores: [], audiences: [], reactions: [] };
    }
    cityData[m.city].scores.push(m.laughScore);
    cityData[m.city].audiences.push(m.audienceSize);
    cityData[m.city].reactions.push(m.crowdReaction);
  });

  return Object.entries(cityData)
    .map(([city, data]) => ({
      city,
      avgLaughScore: Math.round(
        data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      ),
      totalShows: data.scores.length,
      avgAudienceSize: Math.round(
        data.audiences.reduce((s, v) => s + v, 0) / data.audiences.length
      ),
      bestReaction: getBestReaction(data.reactions),
    }))
    .sort((a, b) => b.avgLaughScore - a.avgLaughScore);
}

// =============================================================================
// Audience Heatmap
// =============================================================================

export async function generateAudienceHeatmap(comedianId: string) {
  // Aggregate fan data from ticket purchases, follows, and views
  const [tickets, follows] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        event: {
          comedians: { some: { comedianId } },
        },
      },
      include: {
        event: {
          include: { venue: { select: { city: true, state: true } } },
        },
      },
    }),
    prisma.comedianFollow.count({
      where: { comedianId },
    }),
  ]);

  // Group by city/state
  const locationData: Record<
    string,
    { city: string; state: string; count: number }
  > = {};
  tickets.forEach((t) => {
    const key = `${t.event.venue.city}|${t.event.venue.state}`;
    if (!locationData[key]) {
      locationData[key] = {
        city: t.event.venue.city,
        state: t.event.venue.state,
        count: 0,
      };
    }
    locationData[key].count += 1;
  });

  const totalFans = Object.values(locationData).reduce(
    (s, d) => s + d.count,
    0
  ) || 1;

  // Upsert heatmap entries
  const results = await Promise.all(
    Object.values(locationData).map((loc) =>
      prisma.audienceHeatmap.upsert({
        where: {
          comedianId_country_city_state: {
            comedianId,
            country: "US",
            city: loc.city,
            state: loc.state,
          },
        },
        update: {
          fanCount: loc.count,
          engagementScore: Math.round((loc.count / totalFans) * 100),
          lastUpdated: new Date(),
        },
        create: {
          comedianId,
          country: "US",
          city: loc.city,
          state: loc.state,
          fanCount: loc.count,
          engagementScore: Math.round((loc.count / totalFans) * 100),
        },
      })
    )
  );

  return { comedianId, totalFollows: follows, locations: results };
}

export async function getAudienceHeatmap(
  comedianId: string,
  filters?: HeatmapFilters
) {
  const where: Record<string, unknown> = { comedianId };
  if (filters?.country) where.country = filters.country;
  if (filters?.state) where.state = filters.state;
  if (filters?.minFanCount) where.fanCount = { gte: filters.minFanCount };

  const heatmap = await prisma.audienceHeatmap.findMany({
    where,
    orderBy: { fanCount: "desc" },
  });

  const totalFans = heatmap.reduce((s, h) => s + h.fanCount, 0);

  return {
    comedianId,
    totalFans,
    locations: heatmap,
  };
}

// =============================================================================
// Revenue Forecast
// =============================================================================

export async function generateRevenueForecast(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
      comedians: {
        include: { comedian: { include: { followers: true } } },
      },
      tickets: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Factors for prediction
  const venueCapacity = event.venue.capacity || 200;
  const totalFollowers = event.comedians.reduce(
    (s, ec) => s + (ec.comedian.followers?.length || 0),
    0
  );

  // Historical data at same venue
  const pastEvents = await prisma.event.findMany({
    where: {
      venueId: event.venueId,
      date: { lt: event.date },
    },
    include: { tickets: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  const pastSales = pastEvents.map((e) => e.tickets.length);
  const avgPastSales =
    pastSales.length > 0
      ? Math.round(pastSales.reduce((s, v) => s + v, 0) / pastSales.length)
      : Math.round(venueCapacity * 0.6);

  // Day of week factor (weekends sell better)
  const dayOfWeek = event.date.getDay();
  const dayFactor = dayOfWeek === 5 || dayOfWeek === 6 ? 1.2 : dayOfWeek === 0 ? 1.05 : 0.9;

  // Social momentum factor
  const followerFactor = Math.min(totalFollowers / 1000, 1.5);
  const momentumMultiplier = 0.7 + followerFactor * 0.3;

  // Prediction
  const basePrediction = avgPastSales * dayFactor * momentumMultiplier;
  const predictedSales = Math.min(
    Math.round(basePrediction),
    venueCapacity
  );

  // Confidence based on historical data availability
  const confidenceScore = Math.min(
    0.5 + pastEvents.length * 0.05,
    0.95
  );

  const factors = {
    venueCapacity,
    totalFollowers,
    avgPastSales,
    dayOfWeek,
    dayFactor,
    momentumMultiplier,
    pastEventsAnalyzed: pastEvents.length,
  };

  const forecast = await prisma.revenueForecast.create({
    data: {
      eventId,
      predictedSales,
      confidenceScore,
      factors,
    },
  });

  return forecast;
}

export async function getRevenueForecast(eventId: string) {
  const forecast = await prisma.revenueForecast.findFirst({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  if (!forecast) return null;

  const confidenceLow = Math.round(
    forecast.predictedSales * (1 - (1 - forecast.confidenceScore))
  );
  const confidenceHigh = Math.round(
    forecast.predictedSales * (1 + (1 - forecast.confidenceScore))
  );

  return {
    ...forecast,
    confidenceInterval: { low: confidenceLow, high: confidenceHigh },
  };
}

// =============================================================================
// Venue Benchmarks
// =============================================================================

export async function computeVenueBenchmark(venueId: string, period?: string) {
  const currentPeriod = period || getCurrentPeriod();

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      events: {
        include: {
          tickets: true,
          reviews: true,
          attendees: true,
        },
      },
    },
  });

  if (!venue) {
    throw new Error("Venue not found");
  }

  const events = venue.events;
  if (events.length === 0) {
    return [];
  }

  // Calculate metrics
  const avgAttendance =
    events.reduce((s, e) => s + e.attendees.length, 0) / events.length;
  const avgSpend =
    events.reduce((s, e) => s + e.tickets.length, 0) / events.length;
  const totalAttendees = new Set(
    events.flatMap((e) => e.attendees.map((a) => a.userId))
  );
  const returningAttendees = events.flatMap((e) =>
    e.attendees.map((a) => a.userId)
  );
  const returnRate =
    totalAttendees.size > 0
      ? ((returningAttendees.length - totalAttendees.size) /
          totalAttendees.size) *
        100
      : 0;
  const allRatings = events.flatMap((e) => e.reviews.map((r) => r.rating));
  const avgSatisfaction =
    allRatings.length > 0
      ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
      : 0;

  // Get city/state averages for percentile calculation
  const allVenuesInArea = await prisma.venue.findMany({
    where: { state: venue.state },
    include: {
      events: {
        include: {
          tickets: true,
          reviews: true,
          attendees: true,
        },
      },
    },
  });

  const areaAttendances = allVenuesInArea
    .filter((v) => v.events.length > 0)
    .map(
      (v) =>
        v.events.reduce((s, e) => s + e.attendees.length, 0) / v.events.length
    );

  const benchmarkData = [
    {
      metric: "AVG_ATTENDANCE" as const,
      value: avgAttendance,
      percentileRank: computePercentile(avgAttendance, areaAttendances),
    },
    {
      metric: "AVG_SPEND" as const,
      value: avgSpend,
      percentileRank: computePercentile(
        avgSpend,
        allVenuesInArea
          .filter((v) => v.events.length > 0)
          .map(
            (v) =>
              v.events.reduce((s, e) => s + e.tickets.length, 0) /
              v.events.length
          )
      ),
    },
    {
      metric: "RETURN_RATE" as const,
      value: Math.max(0, returnRate),
      percentileRank: 50, // Default; full percentile computation would need all venue return rates
    },
    {
      metric: "SATISFACTION" as const,
      value: avgSatisfaction,
      percentileRank: computePercentile(
        avgSatisfaction,
        allVenuesInArea
          .filter((v) => v.events.length > 0)
          .map((v) => {
            const ratings = v.events.flatMap((e) =>
              e.reviews.map((r) => r.rating)
            );
            return ratings.length > 0
              ? ratings.reduce((s, r) => s + r, 0) / ratings.length
              : 0;
          })
          .filter((r) => r > 0)
      ),
    },
  ];

  // Upsert benchmarks
  const results = await Promise.all(
    benchmarkData.map((b) =>
      prisma.venueBenchmark.upsert({
        where: {
          venueId_metric_period: {
            venueId,
            metric: b.metric,
            period: currentPeriod,
          },
        },
        update: {
          value: b.value,
          percentileRank: b.percentileRank,
        },
        create: {
          venueId,
          metric: b.metric,
          value: b.value,
          period: currentPeriod,
          percentileRank: b.percentileRank,
        },
      })
    )
  );

  return results;
}

export async function getVenueBenchmarks(venueId: string) {
  const benchmarks = await prisma.venueBenchmark.findMany({
    where: { venueId },
    orderBy: { period: "desc" },
  });

  return benchmarks;
}

// =============================================================================
// Comedian Analytics
// =============================================================================

export async function generateComedianAnalytics(
  comedianId: string,
  period?: string
) {
  const currentPeriod = period || "all-time";

  const comedian = await prisma.comedian.findUnique({
    where: { id: comedianId },
    include: {
      events: {
        include: {
          event: {
            include: {
              venue: true,
              tickets: true,
              reviews: true,
              attendees: true,
            },
          },
        },
      },
      genres: true,
    },
  });

  if (!comedian) {
    throw new Error("Comedian not found");
  }

  const events = comedian.events.map((ec) => ec.event);
  const totalShows = events.length;
  const totalAudience = events.reduce(
    (s, e) => s + e.attendees.length,
    0
  );
  const allRatings = events.flatMap((e) => e.reviews.map((r) => r.rating));
  const avgRating =
    allRatings.length > 0
      ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
      : 0;

  // Top cities
  const cityCounts: Record<string, { city: string; state: string; count: number }> = {};
  events.forEach((e) => {
    const key = `${e.venue.city}|${e.venue.state}`;
    if (!cityCounts[key]) {
      cityCounts[key] = { city: e.venue.city, state: e.venue.state, count: 0 };
    }
    cityCounts[key].count += 1;
  });
  const topCities = Object.values(cityCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Genre breakdown
  const totalGenres = comedian.genres.length || 1;
  const genreBreakdown = comedian.genres.map((g) => ({
    genre: g.genre,
    percentage: Math.round((1 / totalGenres) * 100),
  }));

  // Growth rate (compare recent half to earlier half)
  const sortedEvents = [...events].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const mid = Math.floor(sortedEvents.length / 2);
  const earlierAudience = sortedEvents
    .slice(0, mid)
    .reduce((s, e) => s + e.attendees.length, 0);
  const laterAudience = sortedEvents
    .slice(mid)
    .reduce((s, e) => s + e.attendees.length, 0);
  const growthRate =
    earlierAudience > 0
      ? Math.round(((laterAudience - earlierAudience) / earlierAudience) * 100)
      : 0;

  const analytics = await prisma.comedianAnalytics.upsert({
    where: {
      comedianId_period: { comedianId, period: currentPeriod },
    },
    update: {
      totalShows,
      totalAudience,
      avgRating: Math.round(avgRating * 10) / 10,
      topCities,
      genreBreakdown,
      growthRate,
    },
    create: {
      comedianId,
      totalShows,
      totalAudience,
      avgRating: Math.round(avgRating * 10) / 10,
      topCities,
      genreBreakdown,
      growthRate,
      period: currentPeriod,
    },
  });

  return analytics;
}

export async function getComedianAnalytics(comedianId: string) {
  const analytics = await prisma.comedianAnalytics.findMany({
    where: { comedianId },
    orderBy: { createdAt: "desc" },
  });

  return analytics;
}

// =============================================================================
// Industry Trends
// =============================================================================

export async function computeIndustryTrends(region?: string, period?: string) {
  const currentPeriod = period || getCurrentPeriod();

  const venueWhere = region ? { state: region } : {};

  const [totalEvents, totalAttendance, genreData] = await Promise.all([
    prisma.event.count({
      where: { venue: venueWhere },
    }),
    prisma.eventAttendance.count({
      where: { event: { venue: venueWhere } },
    }),
    prisma.comedianGenre.groupBy({
      by: ["genre"],
      _count: { genre: true },
      orderBy: { _count: { genre: "desc" } },
      take: 10,
    }),
  ]);

  // Get previous period data for comparison
  const previousPeriod = getPreviousPeriod(currentPeriod);
  const existingPreviousTrends = await prisma.industryTrend.findMany({
    where: { period: previousPeriod, region: region || null },
  });

  const previousShowCount =
    existingPreviousTrends.find((t) => t.metric === "total_shows")?.value ||
    totalEvents * 0.9;
  const previousAttendance =
    existingPreviousTrends.find((t) => t.metric === "total_attendance")
      ?.value || totalAttendance * 0.9;

  const trendsData = [
    {
      category: "shows",
      metric: "total_shows",
      value: totalEvents,
      previousValue: previousShowCount,
      changePercent: computeChangePercent(totalEvents, previousShowCount),
    },
    {
      category: "attendance",
      metric: "total_attendance",
      value: totalAttendance,
      previousValue: previousAttendance,
      changePercent: computeChangePercent(totalAttendance, previousAttendance),
    },
    {
      category: "attendance",
      metric: "avg_attendance_per_show",
      value: totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0,
      previousValue:
        previousShowCount > 0
          ? Math.round(previousAttendance / previousShowCount)
          : 0,
      changePercent:
        previousShowCount > 0
          ? computeChangePercent(
              totalEvents > 0 ? totalAttendance / totalEvents : 0,
              previousAttendance / previousShowCount
            )
          : 0,
    },
    ...genreData.slice(0, 5).map((g) => ({
      category: "genre",
      metric: `genre_${g.genre}`,
      value: g._count.genre,
      previousValue: Math.round(g._count.genre * 0.9),
      changePercent: 11.1,
    })),
  ];

  const results = await Promise.all(
    trendsData.map((t) =>
      prisma.industryTrend.upsert({
        where: {
          category_metric_period_region: {
            category: t.category,
            metric: t.metric,
            period: currentPeriod,
            region: region || null,
          },
        },
        update: {
          value: t.value,
          previousValue: t.previousValue,
          changePercent: t.changePercent,
        },
        create: {
          category: t.category,
          metric: t.metric,
          value: t.value,
          previousValue: t.previousValue,
          changePercent: t.changePercent,
          period: currentPeriod,
          region: region || null,
        },
      })
    )
  );

  return results;
}

export async function getIndustryTrends(filters?: IndustryTrendFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.region) where.region = filters.region;
  if (filters?.period) where.period = filters.period;

  const trends = await prisma.industryTrend.findMany({
    where,
    orderBy: [{ category: "asc" }, { metric: "asc" }],
  });

  return trends;
}

// =============================================================================
// Audience Demographics
// =============================================================================

export async function getAudienceDemographics(comedianId: string) {
  const tickets = await prisma.ticket.findMany({
    where: {
      event: {
        comedians: { some: { comedianId } },
      },
    },
    include: {
      user: {
        select: { id: true },
      },
      event: {
        include: {
          venue: { select: { city: true, state: true } },
        },
      },
    },
  });

  if (tickets.length === 0) {
    return {
      comedianId,
      totalTicketBuyers: 0,
      locationBreakdown: [],
      uniqueBuyers: 0,
    };
  }

  // Location breakdown
  const locationCounts: Record<string, { city: string; state: string; count: number }> = {};
  tickets.forEach((t) => {
    const key = `${t.event.venue.city}|${t.event.venue.state}`;
    if (!locationCounts[key]) {
      locationCounts[key] = {
        city: t.event.venue.city,
        state: t.event.venue.state,
        count: 0,
      };
    }
    locationCounts[key].count += 1;
  });

  const locationBreakdown = Object.values(locationCounts)
    .sort((a, b) => b.count - a.count)
    .map((loc) => ({
      ...loc,
      percentage: Math.round((loc.count / tickets.length) * 100),
    }));

  const uniqueBuyers = new Set(tickets.map((t) => t.userId)).size;

  return {
    comedianId,
    totalTicketBuyers: tickets.length,
    uniqueBuyers,
    locationBreakdown,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function getBestReaction(reactions: string[]): string {
  const order = [
    "STANDING_OVATION",
    "ROARING",
    "LAUGHING",
    "CHUCKLES",
    "SILENT",
  ];
  for (const reaction of order) {
    if (reactions.includes(reaction)) return reaction;
  }
  return "SILENT";
}

function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

function getCurrentPeriod(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

function getPreviousPeriod(period: string): string {
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (match) {
    const year = parseInt(match[1]);
    const q = parseInt(match[2]);
    if (q === 1) return `${year - 1}-Q4`;
    return `${year}-Q${q - 1}`;
  }
  return period;
}

function computeChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
