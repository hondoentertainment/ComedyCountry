/**
 * Search & Discovery types for Punchline Atlas.
 * Provides discriminated unions for unified search results,
 * filter definitions, and response shapes.
 */

// ── Result Type Discriminant ────────────────────────────────────────────────

export type SearchResultType = "venue" | "comedian" | "event";

// ── Individual Result Types ─────────────────────────────────────────────────

export interface VenueSearchResult {
  type: "venue";
  id: string;
  name: string;
  city: string;
  state: string;
  venueType: string;
  capacity: number | null;
  followerCount: number;
  eventCount: number;
  relevanceScore: number;
}

export interface ComedianSearchResult {
  type: "comedian";
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  genres: string[];
  touringStatus: string;
  followerCount: number;
  upcomingShows: number;
  relevanceScore: number;
}

export interface EventSearchResult {
  type: "event";
  id: string;
  title: string | null;
  date: string;
  showtime: string | null;
  showType: string;
  priceMin: number | null;
  priceMax: number | null;
  venue: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  comedians: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  attendeeCount: number;
  ticketsAvailable: boolean;
  relevanceScore: number;
}

// ── Discriminated Union ─────────────────────────────────────────────────────

export type SearchResult =
  | VenueSearchResult
  | ComedianSearchResult
  | EventSearchResult;

// ── Filters ─────────────────────────────────────────────────────────────────

export type SearchSortOption =
  | "relevance"
  | "date"
  | "popularity"
  | "name"
  | "recently_added";

export interface SearchFilters {
  q: string;
  type: SearchResultType | "all";
  city?: string;
  state?: string;
  genre?: string;
  venueType?: string;
  showType?: string;
  touringStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  capacityMin?: number;
  capacityMax?: number;
  sort: SearchSortOption;
  limit: number;
  offset: number;
}

// ── Facets ──────────────────────────────────────────────────────────────────

export interface SearchFacetItem {
  value: string;
  count: number;
}

export interface SearchFacets {
  cities: SearchFacetItem[];
  states: SearchFacetItem[];
  genres: SearchFacetItem[];
  venueTypes: SearchFacetItem[];
  showTypes: SearchFacetItem[];
  touringStatuses: SearchFacetItem[];
}

// ── Response ────────────────────────────────────────────────────────────────

export interface SearchResponse {
  results: SearchResult[];
  facets: SearchFacets;
  totalCounts: {
    venues: number;
    comedians: number;
    events: number;
    total: number;
  };
  query: string;
  suggestions: string[];
  filters: Partial<SearchFilters>;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ── Autocomplete ────────────────────────────────────────────────────────────

export interface AutocompleteSuggestion {
  text: string;
  type: "venue" | "comedian" | "city" | "genre" | "event";
  id?: string;
  slug?: string;
  subtitle?: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

// ── Type Guards ─────────────────────────────────────────────────────────────

export function isVenueResult(r: SearchResult): r is VenueSearchResult {
  return r.type === "venue";
}

export function isComedianResult(r: SearchResult): r is ComedianSearchResult {
  return r.type === "comedian";
}

export function isEventResult(r: SearchResult): r is EventSearchResult {
  return r.type === "event";
}
