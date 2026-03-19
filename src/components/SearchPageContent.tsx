"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { VENUE_TYPE_LABELS, SHOW_TYPE_LABELS, TOURING_STATUS_LABELS } from "@/lib/constants";
import type {
  SearchResponse,
  SearchResult,
  SearchResultType,
  SearchSortOption,
  SearchFacets,
  VenueSearchResult,
  ComedianSearchResult,
  EventSearchResult,
} from "@/types/search";

const DEBOUNCE_MS = 300;
const RESULTS_PER_PAGE = 20;

type SearchPageContentProps = {
  initialQuery?: string;
  initialResults?: SearchResponse | null;
};

export function SearchPageContent({
  initialQuery = "",
  initialResults = null,
}: SearchPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState<SearchResponse | null>(initialResults);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Filter state from URL params
  const currentType = (searchParams.get("type") ?? "all") as SearchResultType | "all";
  const currentCity = searchParams.get("city") ?? "";
  const currentState = searchParams.get("state") ?? "";
  const currentGenre = searchParams.get("genre") ?? "";
  const currentVenueType = searchParams.get("venueType") ?? "";
  const currentShowType = searchParams.get("showType") ?? "";
  const currentSort = (searchParams.get("sort") ?? "relevance") as SearchSortOption;
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const currentOffset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  // Build search URL
  const buildSearchUrl = useCallback(
    (overrides: Record<string, string | undefined> = {}) => {
      const url = new URL("/search", window.location.origin);
      const params: Record<string, string> = {
        q: query.trim(),
        type: currentType,
        sort: currentSort,
        ...(currentCity ? { city: currentCity } : {}),
        ...(currentState ? { state: currentState } : {}),
        ...(currentGenre ? { genre: currentGenre } : {}),
        ...(currentVenueType ? { venueType: currentVenueType } : {}),
        ...(currentShowType ? { showType: currentShowType } : {}),
        ...(currentDateFrom ? { dateFrom: currentDateFrom } : {}),
        ...(currentDateTo ? { dateTo: currentDateTo } : {}),
        ...overrides,
      };

      for (const [key, value] of Object.entries(params)) {
        if (value && value !== "all" && key !== "sort") {
          url.searchParams.set(key, value);
        } else if (key === "sort" && value !== "relevance") {
          url.searchParams.set(key, value);
        }
      }

      return url.pathname + url.search;
    },
    [query, currentType, currentSort, currentCity, currentState, currentGenre, currentVenueType, currentShowType, currentDateFrom, currentDateTo],
  );

  // Fetch results
  const fetchResults = useCallback(
    async (term: string, offset = 0) => {
      if (term.length < 2) {
        setResponse(null);
        return;
      }
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);

      const fetchParams = new URLSearchParams();
      fetchParams.set("mode", "unified");
      fetchParams.set("q", term);
      fetchParams.set("limit", String(RESULTS_PER_PAGE));
      fetchParams.set("offset", String(offset));
      if (currentType !== "all") fetchParams.set("type", currentType);
      if (currentCity) fetchParams.set("city", currentCity);
      if (currentState) fetchParams.set("state", currentState);
      if (currentGenre) fetchParams.set("genre", currentGenre);
      if (currentVenueType) fetchParams.set("venueType", currentVenueType);
      if (currentShowType) fetchParams.set("showType", currentShowType);
      if (currentSort !== "relevance") fetchParams.set("sort", currentSort);
      if (currentDateFrom) fetchParams.set("dateFrom", currentDateFrom);
      if (currentDateTo) fetchParams.set("dateTo", currentDateTo);

      try {
        const res = await fetch(`/api/search?${fetchParams.toString()}`, {
          signal: abortRef.current.signal,
        });
        const data: SearchResponse = await res.json();
        if (mountedRef.current) {
          setResponse(data);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError" && mountedRef.current) {
          setResponse(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [currentType, currentCity, currentState, currentGenre, currentVenueType, currentShowType, currentSort, currentDateFrom, currentDateTo],
  );

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Fetch on query or filter change
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResponse(null);
      return;
    }
    const t = setTimeout(() => {
      fetchResults(term, currentOffset);
      // Update URL
      const url = buildSearchUrl({ offset: currentOffset > 0 ? String(currentOffset) : undefined });
      router.replace(url, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentType, currentCity, currentState, currentGenre, currentVenueType, currentShowType, currentSort, currentDateFrom, currentDateTo, currentOffset]);

  // Sync query from URL
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Navigation helpers
  const setFilter = (key: string, value: string) => {
    const url = buildSearchUrl({ [key]: value || undefined, offset: undefined });
    router.push(url, { scroll: false });
  };

  const clearFilters = () => {
    const url = new URL("/search", window.location.origin);
    url.searchParams.set("q", query.trim());
    router.push(url.pathname + url.search, { scroll: false });
  };

  const goToPage = (page: number) => {
    const offset = page * RESULTS_PER_PAGE;
    const url = buildSearchUrl({ offset: offset > 0 ? String(offset) : undefined });
    router.push(url, { scroll: true });
  };

  // Computed values
  const term = query.trim();
  const totalResults = response?.totalCounts?.total ?? 0;
  const hasResults = response && response.results.length > 0;
  const isEmpty = response && !hasResults && term.length >= 2 && !loading;
  const currentPage = Math.floor(currentOffset / RESULTS_PER_PAGE);
  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  const hasActiveFilters = currentType !== "all" || currentCity || currentState || currentGenre || currentVenueType || currentShowType || currentDateFrom || currentDateTo;
  const facets = response?.facets;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
        <p className="text-zinc-400">Find venues, comedians, and upcoming shows.</p>
      </div>

      {/* Search input */}
      <div className="mb-6">
        <label htmlFor="search-page-query" className="sr-only">
          Search venues, comedians, and events
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search-page-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search venues, comedians, events..."
              minLength={2}
              autoComplete="off"
              autoFocus
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent transition-all"
            />
          </div>
          {loading && (
            <span className="self-center flex items-center gap-2 text-zinc-500 text-sm shrink-0">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-brand-gold rounded-full animate-spin" />
              Searching...
            </span>
          )}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors lg:hidden ${
              hasActiveFilters
                ? "bg-brand-gold/20 border-brand-gold/40 text-brand-gold"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Type tabs */}
      {term.length >= 2 && (
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {(["all", "comedian", "venue", "event"] as const).map((type) => {
            const count =
              type === "all"
                ? totalResults
                : type === "comedian"
                  ? response?.totalCounts?.comedians ?? 0
                  : type === "venue"
                    ? response?.totalCounts?.venues ?? 0
                    : response?.totalCounts?.events ?? 0;
            const isActive = currentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilter("type", type === "all" ? "" : type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {type === "all" ? "All" : type === "comedian" ? "Comedians" : type === "venue" ? "Venues" : "Events"}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? "text-brand-dark/70" : "text-zinc-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content: filters sidebar + results */}
      <div className="flex gap-6">
        {/* Filters sidebar */}
        {term.length >= 2 && (
          <aside
            className={`${
              filtersOpen ? "block" : "hidden"
            } lg:block w-full lg:w-64 shrink-0 fixed lg:static inset-0 lg:inset-auto z-40 lg:z-auto bg-brand-dark/95 lg:bg-transparent p-6 lg:p-0 overflow-y-auto`}
          >
            <div className="lg:sticky lg:top-4 space-y-5">
              {/* Mobile close button */}
              <div className="flex items-center justify-between lg:hidden mb-4">
                <h2 className="text-lg font-semibold text-white">Filters</h2>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="hidden lg:flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Filters</h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Sort */}
              <FilterSection title="Sort by">
                <select
                  value={currentSort}
                  onChange={(e) => setFilter("sort", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                >
                  <option value="relevance">Relevance</option>
                  <option value="popularity">Popularity</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="date">Date (soonest)</option>
                  <option value="recently_added">Recently added</option>
                </select>
              </FilterSection>

              {/* City facets */}
              {facets && facets.cities.length > 0 && (
                <FilterSection title="City">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setFilter("city", "")}
                      className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        !currentCity ? "text-brand-gold bg-brand-gold/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      All cities
                    </button>
                    {facets.cities.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFilter("city", c.value)}
                        className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          currentCity === c.value ? "text-brand-gold bg-brand-gold/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <span className="truncate">{c.value}</span>
                        <span className="text-xs text-zinc-600 ml-2 shrink-0">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* State facets */}
              {facets && facets.states.length > 0 && (
                <FilterSection title="State">
                  <select
                    value={currentState}
                    onChange={(e) => setFilter("state", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  >
                    <option value="">All states</option>
                    {facets.states.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.value} ({s.count})
                      </option>
                    ))}
                  </select>
                </FilterSection>
              )}

              {/* Genre facets */}
              {facets && facets.genres.length > 0 && (currentType === "all" || currentType === "comedian") && (
                <FilterSection title="Genre">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setFilter("genre", "")}
                      className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        !currentGenre ? "text-brand-gold bg-brand-gold/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      All genres
                    </button>
                    {facets.genres.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setFilter("genre", g.value)}
                        className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          currentGenre === g.value ? "text-brand-gold bg-brand-gold/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <span className="truncate capitalize">{g.value}</span>
                        <span className="text-xs text-zinc-600 ml-2 shrink-0">{g.count}</span>
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Venue Type */}
              {(currentType === "all" || currentType === "venue") && (
                <FilterSection title="Venue type">
                  <select
                    value={currentVenueType}
                    onChange={(e) => setFilter("venueType", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  >
                    <option value="">All types</option>
                    {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FilterSection>
              )}

              {/* Show Type */}
              {(currentType === "all" || currentType === "event") && (
                <FilterSection title="Show type">
                  <select
                    value={currentShowType}
                    onChange={(e) => setFilter("showType", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  >
                    <option value="">All show types</option>
                    {Object.entries(SHOW_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FilterSection>
              )}

              {/* Date range */}
              {(currentType === "all" || currentType === "event") && (
                <FilterSection title="Date range">
                  <div className="space-y-2">
                    <div>
                      <label htmlFor="dateFrom" className="text-xs text-zinc-500 block mb-1">From</label>
                      <input
                        id="dateFrom"
                        type="date"
                        value={currentDateFrom}
                        onChange={(e) => setFilter("dateFrom", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                    </div>
                    <div>
                      <label htmlFor="dateTo" className="text-xs text-zinc-500 block mb-1">To</label>
                      <input
                        id="dateTo"
                        type="date"
                        value={currentDateTo}
                        onChange={(e) => setFilter("dateTo", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                    </div>
                  </div>
                </FilterSection>
              )}

              {/* Mobile clear + apply */}
              <div className="flex gap-2 lg:hidden pt-4 border-t border-zinc-800">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      clearFilters();
                      setFiltersOpen(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-medium"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Results area */}
        <div className="flex-1 min-w-0">
          {/* Active filter chips */}
          {hasActiveFilters && term.length >= 2 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentCity && (
                <FilterChip label={`City: ${currentCity}`} onRemove={() => setFilter("city", "")} />
              )}
              {currentState && (
                <FilterChip label={`State: ${currentState}`} onRemove={() => setFilter("state", "")} />
              )}
              {currentGenre && (
                <FilterChip label={`Genre: ${currentGenre}`} onRemove={() => setFilter("genre", "")} />
              )}
              {currentVenueType && (
                <FilterChip
                  label={`Venue: ${VENUE_TYPE_LABELS[currentVenueType] ?? currentVenueType}`}
                  onRemove={() => setFilter("venueType", "")}
                />
              )}
              {currentShowType && (
                <FilterChip
                  label={`Show: ${SHOW_TYPE_LABELS[currentShowType] ?? currentShowType}`}
                  onRemove={() => setFilter("showType", "")}
                />
              )}
              {currentDateFrom && (
                <FilterChip label={`From: ${currentDateFrom}`} onRemove={() => setFilter("dateFrom", "")} />
              )}
              {currentDateTo && (
                <FilterChip label={`To: ${currentDateTo}`} onRemove={() => setFilter("dateTo", "")} />
              )}
            </div>
          )}

          {/* Results count */}
          {term.length >= 2 && !loading && response && (
            <p className="text-zinc-500 text-sm mb-4">
              {totalResults === 0
                ? "No results found"
                : `${totalResults} result${totalResults !== 1 ? "s" : ""} found`}
              {currentSort !== "relevance" && (
                <span> -- sorted by {currentSort.replace("_", " ")}</span>
              )}
            </p>
          )}

          {/* Loading skeleton */}
          {term.length >= 2 && loading && !response && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/30 border border-zinc-800 animate-pulse">
                  <div className="w-14 h-14 rounded-lg bg-zinc-700 shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 w-40 bg-zinc-700 rounded mb-2" />
                    <div className="h-4 w-28 bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="py-16 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
              <svg className="w-12 h-12 text-zinc-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-zinc-400 text-lg font-medium mb-2">No results for &ldquo;{term}&rdquo;</p>
              <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                Try adjusting your search or filters to find what you are looking for.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 text-sm font-medium transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Short query hint */}
          {term.length < 2 && (
            <div className="py-16 text-center">
              <svg className="w-16 h-16 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-zinc-500 text-lg">Enter at least 2 characters to search.</p>
            </div>
          )}

          {/* Results list */}
          {hasResults && response && (
            <div className="space-y-3">
              {response.results.map((result) => (
                <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {hasResults && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Previous
              </button>

              {generatePageNumbers(currentPage, totalPages).map((page, i) =>
                page === -1 ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-zinc-600">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-brand-gold text-brand-dark"
                        : "bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {page + 1}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          )}

          {/* Suggestions */}
          {response && response.suggestions.length > 0 && !hasResults && term.length >= 2 && (
            <div className="mt-6">
              <p className="text-zinc-500 text-sm mb-3">Did you mean:</p>
              <div className="flex flex-wrap gap-2">
                {response.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-brand-gold text-sm hover:bg-zinc-800 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-white transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  switch (result.type) {
    case "venue":
      return <VenueResultCard result={result} />;
    case "comedian":
      return <ComedianResultCard result={result} />;
    case "event":
      return <EventResultCard result={result} />;
  }
}

function VenueResultCard({ result }: { result: VenueSearchResult }) {
  return (
    <Link
      href={`/venues/${result.id}`}
      className="flex items-center gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      <div className="w-14 h-14 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 group-hover:bg-zinc-600 transition-colors">
        <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{result.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/80 text-zinc-300 shrink-0">
            {VENUE_TYPE_LABELS[result.venueType] ?? result.venueType}
          </span>
        </div>
        <p className="text-zinc-500 text-sm mt-0.5">
          {result.city}, {result.state}
          {result.capacity && <span> -- {result.capacity} capacity</span>}
        </p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-zinc-400 text-sm">{result.followerCount} followers</p>
        <p className="text-zinc-600 text-xs">{result.eventCount} events</p>
      </div>
    </Link>
  );
}

function ComedianResultCard({ result }: { result: ComedianSearchResult }) {
  return (
    <Link
      href={`/comedians/${result.slug}`}
      className="flex items-center gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      {result.headshotUrl ? (
        <Image
          src={result.headshotUrl}
          alt={`Headshot of ${result.name}`}
          width={56}
          height={56}
          className="w-14 h-14 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-zinc-700 flex items-center justify-center text-xl text-zinc-500 shrink-0 group-hover:bg-zinc-600 transition-colors">
          {result.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{result.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/80 text-zinc-300 shrink-0">
            {TOURING_STATUS_LABELS[result.touringStatus] ?? result.touringStatus}
          </span>
        </div>
        {result.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-xs text-zinc-500 capitalize">{g}</span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-zinc-400 text-sm">{result.followerCount} followers</p>
        {result.upcomingShows > 0 && (
          <p className="text-brand-gold text-xs">{result.upcomingShows} upcoming</p>
        )}
      </div>
    </Link>
  );
}

function EventResultCard({ result }: { result: EventSearchResult }) {
  const title =
    result.title ?? result.comedians.map((c) => c.name).join(", ");
  const eventDate = new Date(result.date);

  return (
    <Link
      href={`/events/${result.id}`}
      className="flex items-center gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      {/* Date badge */}
      <div className="w-14 h-14 rounded-lg bg-zinc-700 flex flex-col items-center justify-center shrink-0 group-hover:bg-zinc-600 transition-colors">
        <span className="text-xs text-zinc-400 uppercase leading-none">
          {eventDate.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-lg font-bold text-white leading-none mt-0.5">
          {eventDate.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-white truncate block">{title}</span>
        <p className="text-zinc-500 text-sm mt-0.5">
          {result.venue.name} -- {result.venue.city}, {result.venue.state}
          {result.showtime && <span> -- {result.showtime}</span>}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {result.priceMin !== null && (
            <span className="text-xs text-zinc-400">
              {result.priceMin === result.priceMax
                ? `$${result.priceMin}`
                : `$${result.priceMin} - $${result.priceMax}`}
            </span>
          )}
          {result.ticketsAvailable && (
            <span className="text-xs text-green-400">Tickets available</span>
          )}
          {!result.ticketsAvailable && (
            <span className="text-xs text-red-400">Sold out</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-zinc-400 text-sm">{result.attendeeCount} going</p>
        <p className="text-zinc-600 text-xs">
          {SHOW_TYPE_LABELS[result.showType] ?? result.showType}
        </p>
      </div>
    </Link>
  );
}

// ── Pagination helpers ──────────────────────────────────────────────────────

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: number[] = [];

  // Always show first page
  pages.push(0);

  if (current > 2) {
    pages.push(-1); // ellipsis
  }

  // Show pages around current
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    pages.push(i);
  }

  if (current < total - 3) {
    pages.push(-1); // ellipsis
  }

  // Always show last page
  pages.push(total - 1);

  return pages;
}
