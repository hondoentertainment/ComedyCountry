import { prisma } from "./prisma";

/**
 * Phase 18: Festival Circuit Tracking
 * Edinburgh Fringe, Just for Laughs, Melbourne Comedy Fest, etc.
 * Tracking comedian festival appearances, schedules, and circuit data.
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface FestivalInfo {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  countryCode: string;
  description: string;
  website: string;
  typicalMonth: number; // 1-12
  durationDays: number;
  estimatedAttendance: number;
  category: string;
  established: number; // year
}

export interface FestivalScheduleEntry {
  festivalId: string;
  year: number;
  startDate: Date;
  endDate: Date;
  venueCount: number;
  showCount: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
}

export interface ComedianFestivalAppearance {
  comedianId: string;
  comedianName: string;
  festivalId: string;
  festivalName: string;
  year: number;
  showTitle?: string;
  venue?: string;
  awards?: string[];
}

/* ─── Well-known festival database ────────────────────────────────────── */

export const MAJOR_FESTIVALS: FestivalInfo[] = [
  {
    id: "edinburgh-fringe",
    name: "Edinburgh Festival Fringe",
    slug: "edinburgh-fringe",
    city: "Edinburgh",
    country: "United Kingdom",
    countryCode: "GB",
    description: "The world's largest arts festival featuring thousands of comedy shows across hundreds of venues.",
    website: "https://www.edfringe.com",
    typicalMonth: 8,
    durationDays: 25,
    estimatedAttendance: 3000000,
    category: "fringe",
    established: 1947,
  },
  {
    id: "just-for-laughs",
    name: "Just for Laughs",
    slug: "just-for-laughs",
    city: "Montreal",
    country: "Canada",
    countryCode: "CA",
    description: "The world's largest international comedy festival, a launching pad for comedians.",
    website: "https://www.hahaha.com",
    typicalMonth: 7,
    durationDays: 14,
    estimatedAttendance: 2000000,
    category: "festival",
    established: 1983,
  },
  {
    id: "melbourne-comedy-fest",
    name: "Melbourne International Comedy Festival",
    slug: "melbourne-comedy-fest",
    city: "Melbourne",
    country: "Australia",
    countryCode: "AU",
    description: "One of the three largest comedy festivals in the world, featuring local and international talent.",
    website: "https://www.comedyfestival.com.au",
    typicalMonth: 3,
    durationDays: 28,
    estimatedAttendance: 800000,
    category: "festival",
    established: 1987,
  },
  {
    id: "new-york-comedy-fest",
    name: "New York Comedy Festival",
    slug: "new-york-comedy-fest",
    city: "New York",
    country: "United States",
    countryCode: "US",
    description: "New York City's premier comedy festival featuring the biggest names in comedy.",
    website: "https://nycomedyfestival.com",
    typicalMonth: 11,
    durationDays: 7,
    estimatedAttendance: 100000,
    category: "festival",
    established: 2004,
  },
  {
    id: "leicester-comedy-fest",
    name: "Leicester Comedy Festival",
    slug: "leicester-comedy-fest",
    city: "Leicester",
    country: "United Kingdom",
    countryCode: "GB",
    description: "The UK's longest-running comedy festival with a focus on emerging talent.",
    website: "https://www.comedy-festival.co.uk",
    typicalMonth: 2,
    durationDays: 17,
    estimatedAttendance: 130000,
    category: "festival",
    established: 1994,
  },
  {
    id: "cape-town-comedy-fest",
    name: "Cape Town International Comedy Festival",
    slug: "cape-town-comedy-fest",
    city: "Cape Town",
    country: "South Africa",
    countryCode: "ZA",
    description: "Africa's premier comedy festival bringing together comedians from across the continent and beyond.",
    website: "https://www.comedyfestival.co.za",
    typicalMonth: 9,
    durationDays: 5,
    estimatedAttendance: 30000,
    category: "festival",
    established: 2012,
  },
  {
    id: "cat-laughs",
    name: "Cat Laughs Comedy Festival",
    slug: "cat-laughs",
    city: "Kilkenny",
    country: "Ireland",
    countryCode: "IE",
    description: "A beloved intimate comedy festival in the medieval city of Kilkenny.",
    website: "https://www.thecatlaughs.com",
    typicalMonth: 6,
    durationDays: 4,
    estimatedAttendance: 30000,
    category: "festival",
    established: 1995,
  },
  {
    id: "tokyo-comedy-fest",
    name: "Tokyo Comedy Festival",
    slug: "tokyo-comedy-fest",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    description: "Japan's growing English-language comedy festival connecting East and West.",
    website: "https://tokyocomedyfest.com",
    typicalMonth: 5,
    durationDays: 3,
    estimatedAttendance: 10000,
    category: "festival",
    established: 2015,
  },
];

/* ─── List all known festivals ────────────────────────────────────────── */

export function listMajorFestivals(): FestivalInfo[] {
  return [...MAJOR_FESTIVALS];
}

/* ─── Get festival by ID or slug ──────────────────────────────────────── */

export function getFestivalInfo(idOrSlug: string): FestivalInfo | undefined {
  return MAJOR_FESTIVALS.find(
    (f) => f.id === idOrSlug || f.slug === idOrSlug,
  );
}

/* ─── Get festivals by country ────────────────────────────────────────── */

export function getFestivalsByCountry(countryCode: string): FestivalInfo[] {
  return MAJOR_FESTIVALS.filter(
    (f) => f.countryCode === countryCode.toUpperCase(),
  );
}

/* ─── Get festivals by month ──────────────────────────────────────────── */

export function getFestivalsByMonth(month: number): FestivalInfo[] {
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  return MAJOR_FESTIVALS.filter((f) => f.typicalMonth === month);
}

/* ─── Get festivals by category ───────────────────────────────────────── */

export function getFestivalsByCategory(category: string): FestivalInfo[] {
  return MAJOR_FESTIVALS.filter((f) => f.category === category);
}

/* ─── Get upcoming festival schedule from database ────────────────────── */

export async function getUpcomingFestivalSchedule(options?: {
  country?: string;
  category?: string;
  limit?: number;
}) {
  const { country, category, limit = 10 } = options || {};
  const now = new Date();

  const where: Record<string, unknown> = {
    startDate: { gte: now },
  };

  if (country) where.country = country;
  if (category) where.category = category;

  return prisma.festivalCircuit.findMany({
    where,
    include: { scene: true },
    orderBy: { startDate: "asc" },
    take: limit,
  });
}

/* ─── Track comedian festival appearances ─────────────────────────────── */

export async function getComedianFestivalHistory(comedianId: string) {
  // Get events that are tagged as festival events for this comedian
  const festivalEvents = await prisma.event.findMany({
    where: {
      comedians: {
        some: { comedianId },
      },
      title: { contains: "festival", mode: "insensitive" },
    },
    include: {
      venue: true,
      comedians: {
        include: { comedian: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return festivalEvents.map((event) => ({
    eventId: event.id,
    title: event.title,
    date: event.date,
    venue: event.venue?.name,
    city: event.venue?.city,
    country: event.venue?.state, // Using state field for country context
  }));
}

/* ─── Festival circuit calendar ───────────────────────────────────────── */

export function getFestivalCalendar(year: number): Array<{
  month: number;
  monthName: string;
  festivals: FestivalInfo[];
}> {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return months.map((name, index) => ({
    month: index + 1,
    monthName: name,
    festivals: MAJOR_FESTIVALS.filter((f) => f.typicalMonth === index + 1),
  }));
}

/* ─── Festival search with database enrichment ────────────────────────── */

export async function searchFestivals(query: string) {
  const lowerQuery = query.toLowerCase();

  // Search in known festivals
  const localResults = MAJOR_FESTIVALS.filter(
    (f) =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.city.toLowerCase().includes(lowerQuery) ||
      f.country.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery),
  );

  // Also search in database
  const dbResults = await prisma.festivalCircuit.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { scene: true },
    take: 20,
  });

  return {
    knownFestivals: localResults,
    databaseFestivals: dbResults,
    totalResults: localResults.length + dbResults.length,
  };
}

/* ─── Festival comparison ─────────────────────────────────────────────── */

export function compareFestivals(
  festivalIds: string[],
): Array<FestivalInfo & { rank: Record<string, number> }> {
  const festivals = festivalIds
    .map((id) => getFestivalInfo(id))
    .filter((f): f is FestivalInfo => f !== undefined);

  if (festivals.length < 2) {
    throw new Error("At least 2 valid festival IDs are required for comparison");
  }

  // Rank by various criteria
  const byAttendance = [...festivals].sort(
    (a, b) => b.estimatedAttendance - a.estimatedAttendance,
  );
  const byDuration = [...festivals].sort(
    (a, b) => b.durationDays - a.durationDays,
  );
  const byEstablished = [...festivals].sort(
    (a, b) => a.established - b.established,
  );

  return festivals.map((f) => ({
    ...f,
    rank: {
      attendance: byAttendance.findIndex((x) => x.id === f.id) + 1,
      duration: byDuration.findIndex((x) => x.id === f.id) + 1,
      established: byEstablished.findIndex((x) => x.id === f.id) + 1,
    },
  }));
}

/* ─── Get festival circuit stats ──────────────────────────────────────── */

export function getFestivalCircuitStats(): {
  totalFestivals: number;
  countries: number;
  totalEstimatedAttendance: number;
  oldestFestival: FestivalInfo;
  largestFestival: FestivalInfo;
  monthWithMostFestivals: { month: number; count: number };
} {
  const countries = new Set(MAJOR_FESTIVALS.map((f) => f.countryCode));
  const totalAttendance = MAJOR_FESTIVALS.reduce(
    (sum, f) => sum + f.estimatedAttendance,
    0,
  );

  const oldest = [...MAJOR_FESTIVALS].sort(
    (a, b) => a.established - b.established,
  )[0];
  const largest = [...MAJOR_FESTIVALS].sort(
    (a, b) => b.estimatedAttendance - a.estimatedAttendance,
  )[0];

  // Find month with most festivals
  const monthCounts: Record<number, number> = {};
  for (const f of MAJOR_FESTIVALS) {
    monthCounts[f.typicalMonth] = (monthCounts[f.typicalMonth] || 0) + 1;
  }
  const peakMonth = Object.entries(monthCounts).sort(
    ([, a], [, b]) => b - a,
  )[0];

  return {
    totalFestivals: MAJOR_FESTIVALS.length,
    countries: countries.size,
    totalEstimatedAttendance: totalAttendance,
    oldestFestival: oldest,
    largestFestival: largest,
    monthWithMostFestivals: {
      month: parseInt(peakMonth[0]),
      count: peakMonth[1],
    },
  };
}
