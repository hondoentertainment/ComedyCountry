"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchDropdown } from "@/hooks/useSearchDropdown";
import { HighlightMatch } from "./HighlightMatch";
import type {
  AutocompleteComedian,
  AutocompleteVenue,
  AutocompleteEvent,
} from "@/lib/search";

type CombinedResults = {
  comedians: AutocompleteComedian[];
  venues: AutocompleteVenue[];
  events: AutocompleteEvent[];
};

type Option = { href: string };

async function fetchCombined(q: string, signal: AbortSignal): Promise<CombinedResults> {
  const qs = q ? `&q=${encodeURIComponent(q)}` : "";
  const [comedians, venues, events] = await Promise.all([
    fetch(`/api/autocomplete?type=comedian${qs}&take=4`, { signal }).then((r) => r.json()),
    fetch(`/api/autocomplete?type=venue${qs}&take=4`, { signal }).then((r) => r.json()),
    fetch(`/api/autocomplete?type=event${qs}&take=3`, { signal }).then((r) => r.json()),
  ]);
  return { comedians, venues, events };
}

export function SearchBar() {
  const router = useRouter();
  const {
    query,
    setQuery,
    data: results,
    loading,
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    containerRef,
    inputRef,
    handleKeyDown: baseHandleKeyDown,
    handleFocus,
  } = useSearchDropdown<CombinedResults>({
    fetchFn: fetchCombined,
    fetchOnFocus: true,
  });

  const hasResults =
    results &&
    (results.venues.length > 0 || results.comedians.length > 0 || results.events.length > 0);
  const isEmpty = results && !hasResults && query.length >= 2 && !loading;

  const isPopular = hasResults && query.trim().length < 2;

  const options: Option[] = useMemo(
    () =>
      hasResults
        ? [
            ...results!.comedians.map((c) => ({ href: `/comedians/${c.slug}` })),
            ...results!.venues.map((v) => ({ href: `/venues/${v.id}` })),
            ...results!.events.map((e) => ({ href: `/events/${e.id}` })),
            ...(query.trim().length >= 2
              ? [{ href: `/search?q=${encodeURIComponent(query)}` }]
              : []),
          ]
        : [],
    [hasResults, results, query],
  );
  const optionCount = options.length;

  const onSelect = useCallback(
    (index: number) => {
      if (options[index]) router.push(options[index].href);
    },
    [options, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => baseHandleKeyDown(e, optionCount, onSelect),
    [baseHandleKeyDown, optionCount, onSelect],
  );

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <label htmlFor="site-search" className="sr-only">
        Search venues, comedians, and events
      </label>
      <input
        id="site-search"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        role="combobox"
        aria-expanded={!!(open && (loading || hasResults || isEmpty))}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls="search-results"
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < optionCount
            ? `search-dropdown-option-${activeIndex}`
            : undefined
        }
        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
      />
      {open && (loading || hasResults || isEmpty) && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-2 rounded-lg bg-brand-surface border border-zinc-700 shadow-xl z-50 max-h-[80vh] overflow-y-auto"
        >
          {loading && !hasResults && (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              Searching…
            </div>
          )}
          {!loading && hasResults && (
            <div className="space-y-4">
              {isPopular && (
                <div className="px-4 py-1 text-xs font-medium text-zinc-600">
                  Popular
                </div>
              )}
              {results!.comedians.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase">
                    Comedians
                  </div>
                  <ul>
                    {results!.comedians.map((c, i) => {
                      const idx = i;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={c.id}>
                          <Link
                            id={`search-dropdown-option-${idx}`}
                            href={`/comedians/${c.slug}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
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
                            <span className="text-white font-medium">
                              <HighlightMatch text={c.name} query={query} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {results!.venues.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase">
                    Venues
                  </div>
                  <ul>
                    {results!.venues.map((v, i) => {
                      const idx = results!.comedians.length + i;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={v.id}>
                          <Link
                            id={`search-dropdown-option-${idx}`}
                            href={`/venues/${v.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`block px-4 py-2 hover:bg-zinc-800 text-white font-medium ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <HighlightMatch text={v.name} query={query} /> —{" "}
                            <span className="text-zinc-400 font-normal">
                              {v.city}, {v.state}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {results!.events.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase">
                    Events
                  </div>
                  <ul>
                    {results!.events.map((e, i) => {
                      const idx =
                        results!.comedians.length + results!.venues.length + i;
                      const isActive = idx === activeIndex;
                      const label =
                        e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ");
                      return (
                        <li key={e.id}>
                          <Link
                            id={`search-dropdown-option-${idx}`}
                            href={`/events/${e.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`block px-4 py-2 hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <span className="text-white font-medium">
                              <HighlightMatch text={label} query={query} />
                            </span>
                            <span className="text-zinc-500 text-sm block">
                              {e.venue.name} — {new Date(e.date).toLocaleDateString()}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {query.trim().length >= 2 && (
                <Link
                  id={`search-dropdown-option-${optionCount - 1}`}
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(optionCount - 1)}
                  className={`block px-4 py-2 text-brand-gold hover:bg-zinc-800 text-sm font-medium ${optionCount - 1 === activeIndex ? "bg-zinc-800" : ""}`}
                  role="option"
                  aria-selected={optionCount - 1 === activeIndex}
                >
                  View all results →
                </Link>
              )}
            </div>
          )}
          {!loading && isEmpty && (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
