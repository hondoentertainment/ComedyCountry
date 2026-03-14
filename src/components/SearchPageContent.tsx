"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

type SearchResults = {
  venues: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    type: string;
  }>;
  comedians: Array<{
    id: string;
    name: string;
    slug: string;
    headshotUrl: string | null;
  }>;
  events: Array<{
    id: string;
    title: string | null;
    date: string | Date;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string } }>;
  }>;
};

const DEBOUNCE_MS = 300;

type SearchPageContentProps = {
  initialQuery?: string;
  initialResults?: SearchResults | null;
};

export function SearchPageContent({
  initialQuery = "",
  initialResults = null,
}: SearchPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(initialResults);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchResults = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults(null);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&take=10`,
        { signal: abortRef.current.signal }
      );
      const data = await res.json();
      if (mountedRef.current) {
        setResults(data);
        const url = new URL("/search", window.location.origin);
        url.searchParams.set("q", term);
        router.replace(url.pathname + url.search, { scroll: false });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError" && mountedRef.current) {
        setResults(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      if (searchParams.get("q")) {
        router.replace("/search", { scroll: false });
      }
      return;
    }
    if (initialResults && term === initialQuery.trim()) return;
    const t = setTimeout(() => fetchResults(term), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, initialQuery, initialResults, fetchResults, searchParams, router]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== query) setQuery(q);
  }, [searchParams, query]);

  const term = query.trim();
  const hasResults =
    results &&
    (results.venues.length > 0 || results.comedians.length > 0 || results.events.length > 0);
  const isEmpty = results && !hasResults && term.length >= 2 && !loading;

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
      <p className="text-zinc-400 mb-4">Find venues, comedians, and upcoming shows.</p>

      <div className="mb-8">
        <label htmlFor="search-page-query" className="sr-only">
          Search venues, comedians, and events
        </label>
        <div className="flex gap-2">
          <input
            id="search-page-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues, comedians, events…"
            minLength={2}
            autoComplete="off"
            autoFocus
            className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
          />
          {loading && (
            <span className="self-center text-zinc-500 text-sm" aria-live="polite">
              Searching…
            </span>
          )}
        </div>
      </div>

      {term.length < 2 ? (
        <p className="text-zinc-500">Enter at least 2 characters to search.</p>
      ) : loading && !results ? (
        <div className="space-y-10">
          <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/30 border border-zinc-800">
                <div className="w-16 h-16 rounded-lg bg-zinc-700 animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-zinc-500">No results for &ldquo;{term}&rdquo;</p>
      ) : hasResults && results ? (
        <div className="space-y-10">
          {results.comedians.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                Comedians ({results.comedians.length})
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {results.comedians.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/comedians/${c.slug}`}
                      className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                    >
                      {c.headshotUrl ? (
                        <Image
                          src={c.headshotUrl}
                          alt={`Headshot of ${c.name}`}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-white self-center">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.venues.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                Venues ({results.venues.length})
              </h2>
              <ul className="space-y-2">
                {results.venues.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/venues/${v.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                    >
                      <span className="font-medium text-white">{v.name}</span>
                      <span className="text-zinc-500 text-sm">
                        {v.city}, {v.state} • {VENUE_TYPE_LABELS[v.type as keyof typeof VENUE_TYPE_LABELS] ?? v.type}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.events.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                Events ({results.events.length})
              </h2>
              <ul className="space-y-2">
                {results.events.map((e) => {
                  const title =
                    e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ");
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                      >
                        <span className="font-medium text-white">{title}</span>
                        <span className="text-zinc-500 text-sm">
                          {e.venue.name} — {new Date(e.date).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      ) : null}
    </>
  );
}
