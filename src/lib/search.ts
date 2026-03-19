import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import type {
  SearchFilters,
  SearchResponse,
  SearchResult,
  SearchFacets,
  VenueSearchResult,
  ComedianSearchResult,
  EventSearchResult,
  AutocompleteResponse,
  AutocompleteSuggestion,
  SearchSortOption,
} from "@/types/search";

/**
 * Advanced Search Engine with ranking, facets, autocomplete, filters,
 * unified results with type discrimination, and full pagination.
 */

// ── Default Filters ─────────────────────────────────────────────────────────

export function defaultFilters(): SearchFilters {
  return {
    q: "",
    type: "all",
    sort: "relevance",
    limit: 20,
    offset: 0,
  };
}

export function parseFilters(params: URLSearchParams): SearchFilters {
  const raw = {
    q: (params.get("q") ?? "").slice(0, 200).trim(),
    type: (params.get("type") ?? "all") as SearchFilters["type"],
    city: params.get("city") || undefined,
    state: params.get("state") || undefined,
    genre: params.get("genre") || undefined,
    venueType: params.get("venueType") || undefined,
    showType: params.get("showType") || undefined,
    touringStatus: params.get("touringStatus") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    priceMin: params.get("priceMin") ? parseFloat(params.get("priceMin")!) : undefined,
    priceMax: params.get("priceMax") ? parseFloat(params.get("priceMax")!) : undefined,
    capacityMin: params.get("capacityMin") ? parseInt(params.get("capacityMin")!, 10) : undefined,
    capacityMax: params.get("capacityMax") ? parseInt(params.get("capacityMax")!, 10) : undefined,
    sort: (params.get("sort") ?? "relevance") as SearchSortOption,
    limit: Math.min(Math.max(parseInt(params.get("limit") ?? "20", 10) || 20, 1), 50),
    offset: Math.max(parseInt(params.get("offset") ?? "0", 10) || 0, 0),
  };
  return raw;
}

// ── Relevance scoring helpers ───────────────────────────────────────────────

function computeStringRelevance(term: string, target: string): number {
  const t = term.toLowerCase();
  const s = target.toLowerCase();
  if (s === t) return 10;
  if (s.startsWith(t)) return 8;
  const words = s.split(/\s+/);
  if (words.some((w) => w === t)) return 6;
  if (words.some((w) => w.startsWith(t))) return 4;
  if (s.includes(t)) return 2;
  return 0;
}

// ── Main unified search ─────────────────────────────────────────────────────

export async function search(
  q: string,
  take = 20,
  legacyFilters?: LegacySearchFilters,
): Promise<LegacySearchResult> {
  // Backwards-compatible wrapper for existing callers
  const filters = defaultFilters();
  filters.q = q;
  filters.limit = take;
  if (legacyFilters) {
    filters.city = legacyFilters.city;
    filters.state = legacyFilters.state;
    filters.genre = legacyFilters.genre;
    filters.venueType = legacyFilters.venueType;
    filters.showType = legacyFilters.showType;
    filters.dateFrom = legacyFilters.dateFrom;
    filters.dateTo = legacyFilters.dateTo;
    filters.priceMin = legacyFilters.priceMin;
    filters.priceMax = legacyFilters.priceMax;
  }

  const response = await unifiedSearch(filters);

  // Convert unified response back to legacy format
  const venues: LegacyRankedVenue[] = [];
  const comedians: LegacyRankedComedian[] = [];
  const events: LegacyRankedEvent[] = [];

  for (const r of response.results) {
    if (r.type === "venue") {
      venues.push({
        id: r.id,
        name: r.name,
        city: r.city,
        state: r.state,
        type: r.venueType,
        capacity: r.capacity,
        followerCount: r.followerCount,
        eventCount: r.eventCount,
        relevanceScore: r.relevanceScore,
      });
    } else if (r.type === "comedian") {
      comedians.push({
        id: r.id,
        name: r.name,
        slug: r.slug,
        headshotUrl: r.headshotUrl,
        genres: r.genres,
        followerCount: r.followerCount,
        upcomingShows: r.upcomingShows,
        relevanceScore: r.relevanceScore,
      });
    } else if (r.type === "event") {
      events.push({
        id: r.id,
        title: r.title,
        date: new Date(r.date),
        showtime: r.showtime,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        venue: r.venue,
        comedians: r.comedians,
        attendeeCount: r.attendeeCount,
        ticketsAvailable: r.ticketsAvailable,
        relevanceScore: r.relevanceScore,
      });
    }
  }

  return {
    venues,
    comedians,
    events,
    facets: {
      cities: response.facets.cities,
      states: response.facets.states,
      genres: response.facets.genres,
      venueTypes: response.facets.venueTypes,
      showTypes: response.facets.showTypes,
    },
    totalCounts: {
      venues: response.totalCounts.venues,
      comedians: response.totalCounts.comedians,
      events: response.totalCounts.events,
    },
    query: q,
    suggestions: response.suggestions,
  };
}

export async function unifiedSearch(filters: SearchFilters): Promise<SearchResponse> {
  const term = filters.q.toLowerCase();

  if (!term || term.length < 2) {
    return emptyResponse(filters);
  }

  const searchType = filters.type;
  const shouldSearchVenues = searchType === "all" || searchType === "venue";
  const shouldSearchComedians = searchType === "all" || searchType === "comedian";
  const shouldSearchEvents = searchType === "all" || searchType === "event";

  const fetchLimit = filters.type === "all"
    ? Math.ceil(filters.limit / 3) + 5
    : filters.limit + filters.offset;

  const [venueData, comedianData, eventData, facets, suggestions] = await Promise.all([
    shouldSearchVenues ? searchVenues(term, fetchLimit, filters) : { results: [], total: 0 },
    shouldSearchComedians ? searchComedians(term, fetchLimit, filters) : { results: [], total: 0 },
    shouldSearchEvents ? searchEvents(term, fetchLimit, filters) : { results: [], total: 0 },
    computeFacets(term),
    generateSuggestions(term),
  ]);

  let results: SearchResult[];

  if (searchType === "all") {
    // Interleave results by relevance score for unified ranking
    const allResults: SearchResult[] = [
      ...venueData.results.map((v): VenueSearchResult => ({ type: "venue", ...v })),
      ...comedianData.results.map((c): ComedianSearchResult => ({ type: "comedian", ...c })),
      ...eventData.results.map((e): EventSearchResult => ({ type: "event", ...e })),
    ];
    results = sortResults(allResults, filters.sort);
  } else if (searchType === "venue") {
    results = venueData.results.map((v): VenueSearchResult => ({ type: "venue", ...v }));
    results = sortResults(results, filters.sort);
  } else if (searchType === "comedian") {
    results = comedianData.results.map((c): ComedianSearchResult => ({ type: "comedian", ...c }));
    results = sortResults(results, filters.sort);
  } else {
    results = eventData.results.map((e): EventSearchResult => ({ type: "event", ...e }));
    results = sortResults(results, filters.sort);
  }

  // Apply pagination
  const paginatedResults = results.slice(filters.offset, filters.offset + filters.limit);

  const totalResults = venueData.total + comedianData.total + eventData.total;

  return {
    results: paginatedResults,
    facets: {
      ...facets,
      touringStatuses: [
        { value: "TOURING", count: 0 },
        { value: "REGIONAL", count: 0 },
        { value: "LOCAL", count: 0 },
        { value: "RETIRED", count: 0 },
      ],
    },
    totalCounts: {
      venues: venueData.total,
      comedians: comedianData.total,
      events: eventData.total,
      total: totalResults,
    },
    query: filters.q,
    suggestions,
    filters: {
      type: filters.type,
      city: filters.city,
      state: filters.state,
      genre: filters.genre,
      sort: filters.sort,
    },
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      hasMore: filters.offset + filters.limit < totalResults,
    },
  };
}

function sortResults(results: SearchResult[], sort: SearchSortOption): SearchResult[] {
  switch (sort) {
    case "relevance":
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    case "name":
      return results.sort((a, b) => {
        const nameA = getResultName(a);
        const nameB = getResultName(b);
        return nameA.localeCompare(nameB);
      });
    case "popularity":
      return results.sort((a, b) => getPopularity(b) - getPopularity(a));
    case "date":
      return results.sort((a, b) => {
        if (a.type === "event" && b.type === "event") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (a.type === "event") return -1;
        if (b.type === "event") return 1;
        return b.relevanceScore - a.relevanceScore;
      });
    case "recently_added":
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    default:
      return results;
  }
}

function getResultName(r: SearchResult): string {
  if (r.type === "venue") return r.name;
  if (r.type === "comedian") return r.name;
  return r.title ?? "";
}

function getPopularity(r: SearchResult): number {
  if (r.type === "venue") return r.followerCount + r.eventCount;
  if (r.type === "comedian") return r.followerCount + r.upcomingShows;
  return r.attendeeCount;
}

function emptyResponse(filters: SearchFilters): SearchResponse {
  return {
    results: [],
    facets: {
      cities: [],
      states: [],
      genres: [],
      venueTypes: [],
      showTypes: [],
      touringStatuses: [],
    },
    totalCounts: { venues: 0, comedians: 0, events: 0, total: 0 },
    query: filters.q,
    suggestions: [],
    filters: {},
    pagination: { limit: filters.limit, offset: filters.offset, hasMore: false },
  };
}

// ── Venue search with ranking ───────────────────────────────────────────────

type VenueResult = Omit<VenueSearchResult, "type">;

async function searchVenues(
  term: string,
  take: number,
  filters: SearchFilters,
): Promise<{ results: VenueResult[]; total: number }> {
  const where: Prisma.VenueWhereInput = {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { state: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ],
    ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" as const } } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.venueType ? { type: filters.venueType as Prisma.EnumVenueTypeFilter } : {}),
  };

  if (filters.capacityMin != null || filters.capacityMax != null) {
    const cap: Record<string, number> = {};
    if (filters.capacityMin != null) cap.gte = filters.capacityMin;
    if (filters.capacityMax != null) cap.lte = filters.capacityMax;
    where.capacity = cap;
  }

  const [rawVenues, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      take: take * 3,
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
        venueType: v.type,
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

// ── Comedian search with ranking ────────────────────────────────────────────

type ComedianResult = Omit<ComedianSearchResult, "type">;

async function searchComedians(
  term: string,
  take: number,
  filters: SearchFilters,
): Promise<{ results: ComedianResult[]; total: number }> {
  const where: Prisma.ComedianWhereInput = {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { bio: { contains: term, mode: "insensitive" } },
    ],
    ...(filters.genre
      ? { genres: { some: { genre: { equals: filters.genre, mode: "insensitive" as const } } } }
      : {}),
    ...(filters.touringStatus
      ? { touringStatus: filters.touringStatus as Prisma.EnumTouringStatusFilter }
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
        touringStatus: true,
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
        touringStatus: c.touringStatus,
        followerCount: c._count.followers,
        upcomingShows: c.events.length,
        relevanceScore: nameRelevance + popularityBoost + activeBoost,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, take);

  return { results: ranked, total };
}

// ── Event search with ranking ───────────────────────────────────────────────

type EventResult = Omit<EventSearchResult, "type">;

async function searchEvents(
  term: string,
  take: number,
  filters: SearchFilters,
): Promise<{ results: EventResult[]; total: number }> {
  const dateFilters: Prisma.EventWhereInput = {};
  if (filters.dateFrom || filters.dateTo) {
    dateFilters.date = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : { gte: new Date() }),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  } else {
    dateFilters.date = { gte: new Date() };
  }

  const venueFilter: Prisma.VenueWhereInput = {};
  if (filters.city) venueFilter.city = { equals: filters.city, mode: "insensitive" };
  if (filters.state) venueFilter.state = filters.state;

  const where: Prisma.EventWhereInput = {
    ...dateFilters,
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { comedians: { some: { comedian: { name: { contains: term, mode: "insensitive" } } } } },
      { venue: { name: { contains: term, mode: "insensitive" } } },
      { venue: { city: { contains: term, mode: "insensitive" } } },
    ],
    ...(filters.showType ? { showType: filters.showType as Prisma.EnumShowTypeFilter } : {}),
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
        0,
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
      if (filters.priceMin && priceMin !== null && priceMin < filters.priceMin) return null;
      if (filters.priceMax && priceMax !== null && priceMax > filters.priceMax) return null;

      return {
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        showtime: e.showtime,
        showType: e.showType,
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

async function computeFacets(term: string): Promise<Omit<SearchFacets, "touringStatuses">> {
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
        take: 20,
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
        take: 20,
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
        take: 25,
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

// ── Suggestions ─────────────────────────────────────────────────────────────

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

// ── Autocomplete endpoint ───────────────────────────────────────────────────

export async function autocomplete(q: string): Promise<AutocompleteResponse> {
  const term = q.trim().toLowerCase();
  if (!term || term.length < 1) {
    return { suggestions: [] };
  }

  const [venues, comedians, cities, genres] = await Promise.all([
    prisma.venue.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { id: true, name: true, city: true, state: true },
      take: 3,
      orderBy: { followers: { _count: "desc" } },
    }),
    prisma.comedian.findMany({
      where: { name: { startsWith: term, mode: "insensitive" } },
      select: { id: true, name: true, slug: true },
      take: 3,
      orderBy: { followers: { _count: "desc" } },
    }),
    prisma.venue.findMany({
      where: { city: { startsWith: term, mode: "insensitive" } },
      select: { city: true, state: true },
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

  const suggestions: AutocompleteSuggestion[] = [
    ...comedians.map((c) => ({
      text: c.name,
      type: "comedian" as const,
      id: c.id,
      slug: c.slug,
      subtitle: "Comedian",
    })),
    ...venues.map((v) => ({
      text: v.name,
      type: "venue" as const,
      id: v.id,
      subtitle: `${v.city}, ${v.state}`,
    })),
    ...cities.map((c) => ({
      text: c.city,
      type: "city" as const,
      subtitle: c.state,
    })),
    ...genres.map((g) => ({
      text: g.genre,
      type: "genre" as const,
      subtitle: "Genre",
    })),
  ];

  return { suggestions: suggestions.slice(0, 10) };
}

// ── Legacy types (backwards compatibility) ──────────────────────────────────

export interface LegacySearchFilters {
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

export interface LegacyRankedVenue {
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

export interface LegacyRankedComedian {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  genres: string[];
  followerCount: number;
  upcomingShows: number;
  relevanceScore: number;
}

export interface LegacyRankedEvent {
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

export interface LegacySearchResult {
  venues: LegacyRankedVenue[];
  comedians: LegacyRankedComedian[];
  events: LegacyRankedEvent[];
  facets: {
    cities: Array<{ value: string; count: number }>;
    states: Array<{ value: string; count: number }>;
    genres: Array<{ value: string; count: number }>;
    venueTypes: Array<{ value: string; count: number }>;
    showTypes: Array<{ value: string; count: number }>;
  };
  totalCounts: { venues: number; comedians: number; events: number };
  query: string;
  suggestions: string[];
}

// Re-export the new typed autocomplete response for use in API route
export type { AutocompleteResponse } from "@/types/search";
