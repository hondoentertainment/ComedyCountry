import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * Advanced Search Engine with ranking, facets, autocomplete, and filters.
 * Replaces the basic substring search with a production-grade solution.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  city?: string;
  state?: string;
  genre?: string;
  venueType?: string;
  showType?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface SearchFacets {
  cities: Array<{ value: string; count: number }>;
  states: Array<{ value: string; count: number }>;
  genres: Array<{ value: string; count: number }>;
  venueTypes: Array<{ value: string; count: number }>;
  showTypes: Array<{ value: string; count: number }>;
}

export interface RankedVenue {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  capacity: number | null;
  followerCount: number;
  eventCount: number;
  relevanceScore: number;
}

export interface RankedComedian {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  genres: string[];
  followerCount: number;
  upcomingShows: number;
  relevanceScore: number;
}

export interface RankedEvent {
  id: string;
  title: string | null;
  date: Date;
  showtime: string | null;
  priceMin: number | null;
  priceMax: number | null;
  venue: { id: string; name: string; city: string; state: string };
  comedians: Array<{ id: string; name: string; slug: string }>;
  attendeeCount: number;
  ticketsAvailable: boolean;
  relevanceScore: number;
}

export interface SearchResult {
  venues: RankedVenue[];
  comedians: RankedComedian[];
  events: RankedEvent[];
  facets: SearchFacets;
  totalCounts: { venues: number; comedians: number; events: number };
  query: string;
  suggestions: string[];
}

export interface AutocompleteResult {
  suggestions: Array<{
    text: string;
    type: "venue" | "comedian" | "city" | "genre";
    id?: string;
  }>;
}

// ── Relevance scoring helpers ────────────────────────────────────────────────

function computeStringRelevance(term: string, target: string): number {
  const t = term.toLowerCase();
  const s = target.toLowerCase();
  if (s === t) return 10; // exact match
  if (s.startsWith(t)) return 8; // prefix match
  const words = s.split(/\s+/);
  if (words.some((w) => w === t)) return 6; // exact word match
  if (words.some((w) => w.startsWith(t))) return 4; // word prefix
  if (s.includes(t)) return 2; // substring
  return 0;
}

// ── Main search ──────────────────────────────────────────────────────────────

export async function search(
  q: string,
  take = 10,
  filters?: SearchFilters
): Promise<SearchResult> {
  const term = q.trim().toLowerCase();
  if (!term || term.length < 2) {
    return {
      venues: [],
      comedians: [],
      events: [],
      facets: { cities: [], states: [], genres: [], venueTypes: [], showTypes: [] },
      totalCounts: { venues: 0, comedians: 0, events: 0 },
      query: q,
      suggestions: [],
    };
  }

  const [venues, comedians, events, facets, suggestions] = await Promise.all([
    searchVenues(term, take, filters),
    searchComedians(term, take, filters),
    searchEvents(term, take, filters),
    computeFacets(term),
    generateSuggestions(term),
  ]);

  return {
    venues: venues.results,
    comedians: comedians.results,
    events: events.results,
    facets,
    totalCounts: {
      venues: venues.total,
      comedians: comedians.total,
      events: events.total,
    },
    query: q,
    suggestions,
  };
}

// ── Venue search with ranking ────────────────────────────────────────────────

async function searchVenues(
  term: string,
  take: number,
  filters?: SearchFilters
): Promise<{ results: RankedVenue[]; total: number }> {
  const where: Prisma.VenueWhereInput = {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { state: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ],
    ...(filters?.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
    ...(filters?.state ? { state: filters.state } : {}),
    ...(filters?.venueType ? { type: filters.venueType as Prisma.EnumVenueTypeFilter } : {}),
  };

  const [rawVenues, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      take: take * 3, // over-fetch for ranking
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        type: true,
        capacity: true,
        _count: { select: { followers: true, events: true } },
      },
    }),
    prisma.venue.count({ where }),
  ]);

  const ranked = rawVenues
    .map((v) => {
      const nameRelevance = computeStringRelevance(term, v.name);
      const cityRelevance = computeStringRelevance(term, v.city);
      const popularityBoost = Math.min(v._count.followers * 0.1, 3);
      const activityBoost = Math.min(v._count.events * 0.05, 2);
      return {
        id: v.id,
        name: v.name,
        city: v.city,
        state: v.state,
        type: v.type,
        capacity: v.capacity,
        followerCount: v._count.followers,
        eventCount: v._count.events,
        relevanceScore:
          Math.max(nameRelevance, cityRelevance) + popularityBoost + activityBoost,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, take);

  return { results: ranked, total };
}

// ── Comedian search with ranking ─────────────────────────────────────────────

async function searchComedians(
  term: string,
  take: number,
  filters?: SearchFilters
): Promise<{ results: RankedComedian[]; total: number }> {
  const where: Prisma.ComedianWhereInput = {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { bio: { contains: term, mode: "insensitive" } },
    ],
    ...(filters?.genre
      ? { genres: { some: { genre: { equals: filters.genre, mode: "insensitive" } } } }
      : {}),
  };

  const now = new Date();

  const [rawComedians, total] = await Promise.all([
    prisma.comedian.findMany({
      where,
      take: take * 3,
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
        genres: { select: { genre: true } },
        _count: { select: { followers: true } },
        events: {
          where: { event: { date: { gte: now } } },
          select: { eventId: true },
        },
      },
    }),
    prisma.comedian.count({ where }),
  ]);

  const ranked = rawComedians
    .map((c) => {
      const nameRelevance = computeStringRelevance(term, c.name);
      const popularityBoost = Math.min(c._count.followers * 0.05, 4);
      const activeBoost = c.events.length > 0 ? 2 : 0;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        headshotUrl: c.headshotUrl,
        genres: c.genres.map((g) => g.genre),
        followerCount: c._count.followers,
        upcomingShows: c.events.length,
        relevanceScore: nameRelevance + popularityBoost + activeBoost,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, take);

  return { results: ranked, total };
}

// ── Event search with ranking ────────────────────────────────────────────────

async function searchEvents(
  term: string,
  take: number,
  filters?: SearchFilters
): Promise<{ results: RankedEvent[]; total: number }> {
  const dateFilters: Prisma.EventWhereInput = {};
  if (filters?.dateFrom || filters?.dateTo) {
    dateFilters.date = {
      ...(filters?.dateFrom ? { gte: new Date(filters.dateFrom) } : { gte: new Date() }),
      ...(filters?.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  } else {
    dateFilters.date = { gte: new Date() };
  }

  const venueFilter: Prisma.VenueWhereInput = {};
  if (filters?.city) venueFilter.city = { equals: filters.city, mode: "insensitive" };
  if (filters?.state) venueFilter.state = filters.state;

  const where: Prisma.EventWhereInput = {
    ...dateFilters,
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { comedians: { some: { comedian: { name: { contains: term, mode: "insensitive" } } } } },
      { venue: { name: { contains: term, mode: "insensitive" } } },
      { venue: { city: { contains: term, mode: "insensitive" } } },
    ],
    ...(filters?.showType ? { showType: filters.showType as Prisma.EnumShowTypeFilter } : {}),
    ...(Object.keys(venueFilter).length > 0 ? { venue: venueFilter } : {}),
  };

  const [rawEvents, total] = await Promise.all([
    prisma.event.findMany({
      where,
      take: take * 3,
      include: {
        venue: { select: { id: true, name: true, city: true, state: true } },
        comedians: {
          include: { comedian: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { attendees: true } },
        ticketTypes: { select: { capacity: true, sold: true, price: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.event.count({ where }),
  ]);

  const ranked = rawEvents
    .map((e) => {
      const titleRelevance = e.title ? computeStringRelevance(term, e.title) : 0;
      const venueRelevance = computeStringRelevance(term, e.venue.name);
      const comedianRelevance = Math.max(
        ...e.comedians.map((ec) => computeStringRelevance(term, ec.comedian.name)),
        0
      );
      const attendeeBoost = Math.min(e._count.attendees * 0.05, 3);
      const soonBoost = e.date.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 ? 2 : 0;

      const totalCapacity = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
      const totalSold = e.ticketTypes.reduce((s, t) => s + t.sold, 0);
      const ticketsAvailable = e.ticketTypes.length === 0 || totalSold < totalCapacity;

      const prices = e.ticketTypes.map((t) => Number(t.price)).filter((p) => p > 0);
      const priceMin = prices.length > 0 ? Math.min(...prices) : null;
      const priceMax = prices.length > 0 ? Math.max(...prices) : null;

      // Price filter
      if (filters?.priceMin && priceMin !== null && priceMin < filters.priceMin) return null;
      if (filters?.priceMax && priceMax !== null && priceMax > filters.priceMax) return null;

      return {
        id: e.id,
        title: e.title,
        date: e.date,
        showtime: e.showtime,
        priceMin,
        priceMax,
        venue: e.venue,
        comedians: e.comedians.map((ec) => ({
          id: ec.comedian.id,
          name: ec.comedian.name,
          slug: ec.comedian.slug,
        })),
        attendeeCount: e._count.attendees,
        ticketsAvailable,
        relevanceScore:
          Math.max(titleRelevance, venueRelevance, comedianRelevance) +
          attendeeBoost +
          soonBoost,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, take);

  return { results: ranked, total };
}

// ── Facets ───────────────────────────────────────────────────────────────────

async function computeFacets(term: string): Promise<SearchFacets> {
  const [venueCities, venueStates, venueTypes, genres, showTypes] =
    await Promise.all([
      prisma.venue.groupBy({
        by: ["city"],
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { city: { contains: term, mode: "insensitive" } },
          ],
        },
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 10,
      }),
      prisma.venue.groupBy({
        by: ["state"],
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { city: { contains: term, mode: "insensitive" } },
          ],
        },
        _count: { state: true },
        orderBy: { _count: { state: "desc" } },
        take: 10,
      }),
      prisma.venue.groupBy({
        by: ["type"],
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.comedianGenre.groupBy({
        by: ["genre"],
        _count: { genre: true },
        orderBy: { _count: { genre: "desc" } },
        take: 15,
      }),
      prisma.event.groupBy({
        by: ["showType"],
        where: { date: { gte: new Date() } },
        _count: { showType: true },
        orderBy: { _count: { showType: "desc" } },
      }),
    ]);

  return {
    cities: venueCities.map((v) => ({ value: v.city, count: v._count.city })),
    states: venueStates.map((v) => ({ value: v.state, count: v._count.state })),
    venueTypes: venueTypes.map((v) => ({ value: v.type, count: v._count.type })),
    genres: genres.map((g) => ({ value: g.genre, count: g._count.genre })),
    showTypes: showTypes
      .filter((s) => s.showType)
      .map((s) => ({ value: s.showType!, count: s._count.showType })),
  };
}

// ── Suggestions / Autocomplete ───────────────────────────────────────────────

async function generateSuggestions(term: string): Promise<string[]> {
  const suggestions = new Set<string>();

  const [venues, comedians, genres] = await Promise.all([
    prisma.venue.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { name: true },
      take: 3,
    }),
    prisma.comedian.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { name: true },
      take: 3,
    }),
    prisma.comedianGenre.findMany({
      where: { genre: { startsWith: term, mode: "insensitive" } },
      select: { genre: true },
      distinct: ["genre"],
      take: 3,
    }),
  ]);

  venues.forEach((v) => suggestions.add(v.name));
  comedians.forEach((c) => suggestions.add(c.name));
  genres.forEach((g) => suggestions.add(g.genre));

  return Array.from(suggestions).slice(0, 8);
}

// ── Autocomplete endpoint ────────────────────────────────────────────────────

export async function autocomplete(q: string): Promise<AutocompleteResult> {
  const term = q.trim().toLowerCase();
  if (!term || term.length < 1) {
    return { suggestions: [] };
  }

  const [venues, comedians, cities, genres] = await Promise.all([
    prisma.venue.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 3,
      orderBy: { followers: { _count: "desc" } },
    }),
    prisma.comedian.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 3,
      orderBy: { followers: { _count: "desc" } },
    }),
    prisma.venue.findMany({
      where: { city: { startsWith: term, mode: "insensitive" } },
      select: { city: true },
      distinct: ["city"],
      take: 3,
    }),
    prisma.comedianGenre.findMany({
      where: { genre: { startsWith: term, mode: "insensitive" } },
      select: { genre: true },
      distinct: ["genre"],
      take: 3,
    }),
  ]);

  const suggestions: AutocompleteResult["suggestions"] = [
    ...venues.map((v) => ({ text: v.name, type: "venue" as const, id: v.id })),
    ...comedians.map((c) => ({ text: c.name, type: "comedian" as const, id: c.id })),
    ...cities.map((c) => ({ text: c.city, type: "city" as const })),
    ...genres.map((g) => ({ text: g.genre, type: "genre" as const })),
  ];

  return { suggestions: suggestions.slice(0, 10) };
}
