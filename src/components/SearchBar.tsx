"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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

type Option = { href: string };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&take=5`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setResults(data);
        setError(false);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults(null);
          setError(true);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, retryTrigger]);

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
  const isEmpty = results && !hasResults && query.length >= 2 && !loading;

  // Flat list of options for arrow-key navigation (comedians, venues, events, "view all")
  const options: Option[] = useMemo(
    () =>
      hasResults
        ? [
            ...results!.comedians.map((c) => ({ href: `/comedians/${c.slug}` })),
            ...results!.venues.map((v) => ({ href: `/venues/${v.id}` })),
            ...results!.events.map((e) => ({ href: `/events/${e.id}` })),
            { href: `/search?q=${encodeURIComponent(query)}` },
          ]
        : [],
    [hasResults, results, query]
  );
  const optionCount = options.length;

  // Reset active index when options change
  useEffect(() => {
    setActiveIndex((i) => (i >= optionCount ? -1 : i));
  }, [optionCount]);

  // Scroll active option into view for keyboard users
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
        } else if (open && hasResults && query.trim().length >= 2) {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          setOpen(false);
          setActiveIndex(-1);
        }
      }
    },
    [open, optionCount, activeIndex, options, router, hasResults, query]
  );

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
        {open && !loading && hasResults && `${optionCount} result${optionCount === 1 ? "" : "s"} available. Use arrow keys to navigate.`}
        {open && !loading && isEmpty && !error && `No results for ${query}.`}
      </div>
      <input
        id="site-search"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        role="combobox"
        aria-expanded={!!(open && (loading || hasResults || isEmpty || error))}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls="search-results"
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < optionCount
            ? `search-option-${activeIndex}`
            : undefined
        }
        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
      />
      {open && (loading || hasResults || isEmpty || error) && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-2 rounded-lg bg-brand-surface border border-zinc-700 shadow-xl z-50 max-h-[80vh] overflow-y-auto"
        >
          {loading && (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              Searching…
            </div>
          )}
          {!loading && hasResults && (
            <div className="space-y-4">
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
                            id={`search-option-${idx}`}
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
                            <span className="text-white font-medium">{c.name}</span>
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
                            id={`search-option-${idx}`}
                            href={`/venues/${v.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`block px-4 py-2 hover:bg-zinc-800 text-white font-medium ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            {v.name} — {v.city}, {v.state}
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
                      return (
                        <li key={e.id}>
                          <Link
                            id={`search-option-${idx}`}
                            href={`/events/${e.id}`}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`block px-4 py-2 hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <span className="text-white font-medium">
                              {e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ")}
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
              <Link
                id={`search-option-${optionCount - 1}`}
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActiveIndex(optionCount - 1)}
                className={`block px-4 py-2 text-brand-gold hover:bg-zinc-800 text-sm font-medium ${optionCount - 1 === activeIndex ? "bg-zinc-800" : ""}`}
                role="option"
                aria-selected={optionCount - 1 === activeIndex}
              >
                View all results →
              </Link>
            </div>
          )}
          {!loading && isEmpty && !error && (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              No results for &ldquo;{query}&rdquo;
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
                className="px-3 py-1.5 rounded bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 text-sm font-medium"
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
