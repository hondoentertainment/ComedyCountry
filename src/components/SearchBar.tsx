"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AutocompleteSuggestion } from "@/types/search";

type SearchResults = {
  venues: Array<{ id: string; name: string; city: string; state: string }>;
  comedians: Array<{
    id: string;
    name: string;
    slug: string;
    headshotUrl: string | null;
  }>;
  events: Array<{
    id: string;
    title: string | null;
    date: string;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string } }>;
  }>;
};

type AutocompleteData = {
  suggestions: AutocompleteSuggestion[];
};

type Option = { href: string; label: string };

const DEBOUNCE_MS = 200;

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions for short queries, full results for longer ones
  useEffect(() => {
    if (query.length < 1) {
      setResults(null);
      setAutocompleteResults(null);
      setError(false);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        if (query.length < 2) {
          // Autocomplete mode for single-character queries
          const res = await fetch(
            `/api/search?mode=autocomplete&q=${encodeURIComponent(query)}`,
            { signal: ctrl.signal },
          );
          const data = await res.json();
          setAutocompleteResults(data);
          setResults(null);
          setOpen(true);
        } else {
          // Full search results for 2+ characters
          const [searchRes, autoRes] = await Promise.all([
            fetch(`/api/search?q=${encodeURIComponent(query)}&take=5`, {
              signal: ctrl.signal,
            }),
            fetch(`/api/search?mode=autocomplete&q=${encodeURIComponent(query)}`, {
              signal: ctrl.signal,
            }),
          ]);
          const [searchData, autoData] = await Promise.all([
            searchRes.json(),
            autoRes.json(),
          ]);
          setResults(searchData);
          setAutocompleteResults(autoData);
          setError(false);
          setOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults(null);
          setAutocompleteResults(null);
          setError(true);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, retryTrigger]);

  // Click outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const hasResults =
    results &&
    (results.venues.length > 0 || results.comedians.length > 0 || results.events.length > 0);
  const hasAutocomplete = autocompleteResults && autocompleteResults.suggestions.length > 0;
  const isEmpty =
    !hasResults && !hasAutocomplete && query.length >= 2 && !loading;

  // Build flat option list for keyboard navigation
  const options: Option[] = useMemo(() => {
    const opts: Option[] = [];

    if (hasAutocomplete && !hasResults) {
      // Autocomplete-only mode
      for (const s of autocompleteResults!.suggestions) {
        if (s.type === "comedian" && s.slug) {
          opts.push({ href: `/comedians/${s.slug}`, label: s.text });
        } else if (s.type === "venue" && s.id) {
          opts.push({ href: `/venues/${s.id}`, label: s.text });
        } else if (s.type === "city") {
          opts.push({ href: `/search?q=${encodeURIComponent(s.text)}`, label: s.text });
        } else if (s.type === "genre") {
          opts.push({ href: `/search?q=${encodeURIComponent(s.text)}&genre=${encodeURIComponent(s.text)}`, label: s.text });
        }
      }
    }

    if (hasResults) {
      for (const c of results!.comedians) {
        opts.push({ href: `/comedians/${c.slug}`, label: c.name });
      }
      for (const v of results!.venues) {
        opts.push({ href: `/venues/${v.id}`, label: v.name });
      }
      for (const e of results!.events) {
        const title = e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ");
        opts.push({ href: `/events/${e.id}`, label: title });
      }
    }

    if (query.length >= 2) {
      opts.push({
        href: `/search?q=${encodeURIComponent(query)}`,
        label: `View all results for "${query}"`,
      });
    }

    return opts;
  }, [hasResults, hasAutocomplete, results, autocompleteResults, query]);

  const optionCount = options.length;

  // Reset active index when options change
  useEffect(() => {
    setActiveIndex((i) => (i >= optionCount ? -1 : i));
  }, [optionCount]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && open) {
      document.getElementById(`search-option-${activeIndex}`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex, open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open && optionCount > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(e.key === "ArrowDown" ? 0 : optionCount - 1);
        return;
      }
      if (!open || optionCount === 0) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < optionCount - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && options[activeIndex]) {
          e.preventDefault();
          router.push(options[activeIndex].href);
          setOpen(false);
          setActiveIndex(-1);
        } else if (query.trim().length >= 2) {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          setOpen(false);
          setActiveIndex(-1);
        }
      }
    },
    [open, optionCount, activeIndex, options, router, query],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim().length >= 2) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setOpen(false);
      }
    },
    [query, router],
  );

  // Render autocomplete-only suggestions (for single char queries)
  const renderAutocompleteSuggestions = () => {
    if (!hasAutocomplete || hasResults) return null;
    return (
      <div>
        <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
          Suggestions
        </div>
        <ul>
          {autocompleteResults!.suggestions.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <li key={`ac-${s.type}-${s.text}-${i}`}>
                <Link
                  id={`search-option-${i}`}
                  href={
                    s.type === "comedian" && s.slug
                      ? `/comedians/${s.slug}`
                      : s.type === "venue" && s.id
                        ? `/venues/${s.id}`
                        : `/search?q=${encodeURIComponent(s.text)}`
                  }
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-inset transition-colors ${isActive ? "bg-zinc-800" : ""}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0">
                    {s.type === "comedian" && (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    )}
                    {s.type === "venue" && (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                    {s.type === "city" && (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    )}
                    {s.type === "genre" && (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium text-sm">{s.text}</span>
                    {s.subtitle && (
                      <span className="text-zinc-500 text-xs ml-2">{s.subtitle}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 capitalize shrink-0">{s.type}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <label htmlFor="site-search" className="sr-only">
        Search venues, comedians, and events
      </label>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {open && !loading && (hasResults || hasAutocomplete) && `${optionCount} result${optionCount === 1 ? "" : "s"} available. Use arrow keys to navigate.`}
        {open && !loading && isEmpty && !error && `No results found for "${query}".`}
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="site-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => (results || autocompleteResults) && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            role="combobox"
            aria-expanded={!!(open && (loading || hasResults || hasAutocomplete || isEmpty || error))}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={
              activeIndex >= 0 && activeIndex < optionCount
                ? `search-option-${activeIndex}`
                : undefined
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent transition-all"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-brand-gold rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {open && (loading || hasResults || hasAutocomplete || isEmpty || error) && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-2 rounded-lg bg-brand-surface border border-zinc-700 shadow-xl z-50 max-h-[80vh] overflow-y-auto"
        >
          {loading && !hasResults && !hasAutocomplete && (
            <div className="px-4 py-6 text-center">
              <div className="inline-block w-5 h-5 border-2 border-zinc-600 border-t-brand-gold rounded-full animate-spin mb-2" />
              <p className="text-zinc-500 text-sm">Searching...</p>
            </div>
          )}

          {!loading && hasAutocomplete && !hasResults && renderAutocompleteSuggestions()}

          {!loading && hasResults && (
            <div className="space-y-3">
              {results!.comedians.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Comedians
                  </div>
                  <ul>
                    {results!.comedians.map((c, i) => {
                      const idx = i;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={c.id}>
                          <Link
                            id={`search-option-${idx}`}
                            href={`/comedians/${c.slug}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-inset transition-colors ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            {c.headshotUrl ? (
                              <Image
                                src={c.headshotUrl}
                                alt={`Headshot of ${c.name}`}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                                {c.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-white font-medium text-sm">{c.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {results!.venues.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Venues
                  </div>
                  <ul>
                    {results!.venues.map((v, i) => {
                      const idx = results!.comedians.length + i;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={v.id}>
                          <Link
                            id={`search-option-${idx}`}
                            href={`/venues/${v.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-inset transition-colors ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div className="min-w-0">
                              <span className="text-white font-medium text-sm block">{v.name}</span>
                              <span className="text-zinc-500 text-xs">{v.city}, {v.state}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {results!.events.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Events
                  </div>
                  <ul>
                    {results!.events.map((e, i) => {
                      const idx =
                        results!.comedians.length + results!.venues.length + i;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={e.id}>
                          <Link
                            id={`search-option-${idx}`}
                            href={`/events/${e.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-inset transition-colors ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-white font-medium text-sm block truncate">
                                {e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ")}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                {e.venue.name} -- {new Date(e.date).toLocaleDateString()}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* View all results link */}
              <div className="border-t border-zinc-800 mt-1 pt-1">
                <Link
                  id={`search-option-${optionCount - 1}`}
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(optionCount - 1)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-brand-gold hover:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-inset transition-colors ${optionCount - 1 === activeIndex ? "bg-zinc-800" : ""}`}
                  role="option"
                  aria-selected={optionCount - 1 === activeIndex}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  View all results
                  <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          )}
          {!loading && isEmpty && !error && (
            <div className="px-4 py-6 text-center">
              <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <p className="text-zinc-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
            </div>
          )}
          {!loading && error && query.length >= 2 && (
            <div
              role="alert"
              className="px-4 py-6 text-center text-zinc-300 text-sm space-y-3"
            >
              <p>Search failed. Please try again.</p>
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setRetryTrigger((t) => t + 1);
                }}
                className="px-3 py-1.5 rounded bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-surface transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
