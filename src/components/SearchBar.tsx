"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

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

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&take=5`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

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
        onFocus={() => results && setOpen(true)}
        placeholder="Search…"
        aria-autocomplete="list"
        aria-controls="search-results"
        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
      />
      {open && (loading || hasResults || isEmpty) && (
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
                    {results!.comedians.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/comedians/${c.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800"
                          role="option"
                        >
                          {c.headshotUrl ? (
                            <Image
                              src={c.headshotUrl}
                              alt=""
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
                    ))}
                  </ul>
                </div>
              )}
              {results!.venues.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase">
                    Venues
                  </div>
                  <ul>
                    {results!.venues.map((v) => (
                      <li key={v.id}>
                        <Link
                          href={`/venues/${v.id}`}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2 hover:bg-zinc-800 text-white font-medium"
                          role="option"
                        >
                          {v.name} — {v.city}, {v.state}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results!.events.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-zinc-500 uppercase">
                    Events
                  </div>
                  <ul>
                    {results!.events.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/events/${e.id}`}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2 hover:bg-zinc-800"
                          role="option"
                        >
                          <span className="text-white font-medium">
                            {e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ")}
                          </span>
                          <span className="text-zinc-500 text-sm block">
                            {e.venue.name} — {new Date(e.date).toLocaleDateString()}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-brand-gold hover:bg-zinc-800 text-sm font-medium"
              >
                View all results →
              </Link>
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
