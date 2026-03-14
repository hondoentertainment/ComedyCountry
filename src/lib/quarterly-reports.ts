import { prisma } from "./prisma";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface QuarterlyReportInput {
  city: string;
  state: string;
  quarter: 1 | 2 | 3 | 4;
  year: number;
}

export interface CitySceneReport {
  city: string;
  state: string;
  quarter: number;
  year: number;
  venueCount: number;
  showCount: number;
  topComedians: Array<{
    comedianId: string;
    name: string;
    showCount: number;
    avgRating: number | null;
  }>;
  attendanceTrends: {
    totalTicketsSold: number;
    avgAttendancePerShow: number;
    sellOutRate: number;
  };
  revenueBenchmarks: {
    totalRevenue: number;
    avgRevenuePerShow: number;
    avgTicketPrice: number;
    topVenuesByRevenue: Array<{
      venueId: string;
      name: string;
      revenue: number;
    }>;
  };
  generatedAt: Date;
}

/* ─── Quarter date range helpers ─────────────────────────────────────────── */

export function getQuarterDateRange(
  quarter: number,
  year: number
): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

/* ─── Get venue count for a city ─────────────────────────────────────────── */

export async function getVenueCountByCity(
  city: string,
  state: string
): Promise<number> {
  return prisma.venue.count({
    where: {
      city: { equals: city, mode: "insensitive" },
      state: { equals: state, mode: "insensitive" },
    },
  });
}

/* ─── Get show count for a city in a quarter ─────────────────────────────── */

export async function getShowCountByCity(
  city: string,
  state: string,
  quarter: number,
  year: number
): Promise<number> {
  const { start, end } = getQuarterDateRange(quarter, year);

  return prisma.event.count({
    where: {
      venue: {
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
      },
      date: { gte: start, lte: end },
    },
  });
}

/* ─── Get top comedians in a city for a quarter ──────────────────────────── */

export async function getTopComediansByCity(
  city: string,
  state: string,
  quarter: number,
  year: number,
  limit: number = 10
): Promise<CitySceneReport["topComedians"]> {
  const { start, end } = getQuarterDateRange(quarter, year);

  const events = await prisma.event.findMany({
    where: {
      venue: {
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
      },
      date: { gte: start, lte: end },
    },
    select: {
      comedianId: true,
      comedian: { select: { id: true, name: true } },
      reviews: { select: { rating: true } },
    },
  });

  // Aggregate by comedian
  const comedianMap = new Map<
    string,
    { name: string; showCount: number; ratings: number[] }
  >();

  for (const event of events) {
    if (!event.comedianId || !event.comedian) continue;

    const existing = comedianMap.get(event.comedianId);
    const eventRatings = event.reviews.map((r: { rating: number }) => r.rating);

    if (existing) {
      existing.showCount += 1;
      existing.ratings.push(...eventRatings);
    } else {
      comedianMap.set(event.comedianId, {
        name: event.comedian.name,
        showCount: 1,
        ratings: eventRatings,
      });
    }
  }

  // Sort by show count descending, take top N
  return Array.from(comedianMap.entries())
    .map(([comedianId, data]) => ({
      comedianId,
      name: data.name,
      showCount: data.showCount,
      avgRating:
        data.ratings.length > 0
          ? Math.round(
              (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) *
                100
            ) / 100
          : null,
    }))
    .sort((a, b) => b.showCount - a.showCount)
    .slice(0, limit);
}

/* ─── Get attendance trends for a city in a quarter ──────────────────────── */

export async function getAttendanceTrends(
  city: string,
  state: string,
  quarter: number,
  year: number
): Promise<CitySceneReport["attendanceTrends"]> {
  const { start, end } = getQuarterDateRange(quarter, year);

  const events = await prisma.event.findMany({
    where: {
      venue: {
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
      },
      date: { gte: start, lte: end },
    },
    select: {
      id: true,
      capacity: true,
      _count: { select: { tickets: true } },
    },
  });

  const totalTicketsSold = events.reduce(
    (sum, e) => sum + e._count.tickets,
    0
  );
  const avgAttendancePerShow =
    events.length > 0
      ? Math.round(totalTicketsSold / events.length)
      : 0;

  // Sell-out rate: events where tickets sold >= capacity
  const sellOutCount = events.filter(
    (e) => e.capacity && e._count.tickets >= e.capacity
  ).length;
  const sellOutRate =
    events.length > 0
      ? Math.round((sellOutCount / events.length) * 100) / 100
      : 0;

  return { totalTicketsSold, avgAttendancePerShow, sellOutRate };
}

/* ─── Get revenue benchmarks for a city in a quarter ─────────────────────── */

export async function getRevenueBenchmarks(
  city: string,
  state: string,
  quarter: number,
  year: number
): Promise<CitySceneReport["revenueBenchmarks"]> {
  const { start, end } = getQuarterDateRange(quarter, year);

  const tickets = await prisma.ticket.findMany({
    where: {
      event: {
        venue: {
          city: { equals: city, mode: "insensitive" },
          state: { equals: state, mode: "insensitive" },
        },
        date: { gte: start, lte: end },
      },
    },
    select: {
      price: true,
      event: {
        select: {
          id: true,
          venue: { select: { id: true, name: true } },
        },
      },
    },
  });

  const totalRevenue = tickets.reduce((sum, t) => sum + (t.price ?? 0), 0);
  const avgTicketPrice =
    tickets.length > 0
      ? Math.round((totalRevenue / tickets.length) * 100) / 100
      : 0;

  // Get unique event count for avg revenue per show
  const eventIds = new Set(tickets.map((t) => t.event.id));
  const avgRevenuePerShow =
    eventIds.size > 0
      ? Math.round((totalRevenue / eventIds.size) * 100) / 100
      : 0;

  // Aggregate revenue by venue
  const venueRevenue = new Map<
    string,
    { name: string; revenue: number }
  >();

  for (const ticket of tickets) {
    const venueId = ticket.event.venue.id;
    const existing = venueRevenue.get(venueId);
    if (existing) {
      existing.revenue += ticket.price ?? 0;
    } else {
      venueRevenue.set(venueId, {
        name: ticket.event.venue.name,
        revenue: ticket.price ?? 0,
      });
    }
  }

  const topVenuesByRevenue = Array.from(venueRevenue.entries())
    .map(([venueId, data]) => ({
      venueId,
      name: data.name,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgRevenuePerShow,
    avgTicketPrice,
    topVenuesByRevenue,
  };
}

/* ─── Generate full quarterly city report ────────────────────────────────── */

export async function generateQuarterlyReport(
  input: QuarterlyReportInput
): Promise<CitySceneReport> {
  const { city, state, quarter, year } = input;

  if (quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4");
  }

  if (year < 2000 || year > 2100) {
    throw new Error("Year must be between 2000 and 2100");
  }

  const [venueCount, showCount, topComedians, attendanceTrends, revenueBenchmarks] =
    await Promise.all([
      getVenueCountByCity(city, state),
      getShowCountByCity(city, state, quarter, year),
      getTopComediansByCity(city, state, quarter, year),
      getAttendanceTrends(city, state, quarter, year),
      getRevenueBenchmarks(city, state, quarter, year),
    ]);

  return {
    city,
    state,
    quarter,
    year,
    venueCount,
    showCount,
    topComedians,
    attendanceTrends,
    revenueBenchmarks,
    generatedAt: new Date(),
  };
}

/* ─── Save a quarterly report to the database ────────────────────────────── */

export async function saveQuarterlyReport(report: CitySceneReport) {
  return prisma.industryReport.upsert({
    where: {
      city_state_quarter: {
        city: report.city,
        state: report.state,
        quarter: `Q${report.quarter}`,
      },
    },
    update: {
      year: report.year,
      metrics: JSON.stringify({
        venueCount: report.venueCount,
        showCount: report.showCount,
        topComedians: report.topComedians,
        attendanceTrends: report.attendanceTrends,
        revenueBenchmarks: report.revenueBenchmarks,
      }),
      publishedAt: report.generatedAt,
    },
    create: {
      city: report.city,
      state: report.state,
      quarter: `Q${report.quarter}`,
      year: report.year,
      metrics: JSON.stringify({
        venueCount: report.venueCount,
        showCount: report.showCount,
        topComedians: report.topComedians,
        attendanceTrends: report.attendanceTrends,
        revenueBenchmarks: report.revenueBenchmarks,
      }),
      publishedAt: report.generatedAt,
    },
  });
}

/* ─── Get saved quarterly reports ────────────────────────────────────────── */

export async function getQuarterlyReports(filters: {
  city?: string;
  state?: string;
  year?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters.state) where.state = { equals: filters.state, mode: "insensitive" };
  if (filters.year) where.year = filters.year;

  return prisma.industryReport.findMany({
    where,
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    take: 50,
  });
}
