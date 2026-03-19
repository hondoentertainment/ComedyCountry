import { Suspense } from "react";
import { unifiedSearch, defaultFilters } from "@/lib/search";
import { SearchPageContent } from "@/components/SearchPageContent";
import type { SearchResponse } from "@/types/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search | Punchline Atlas",
  description: "Search venues, comedians, and upcoming comedy events. Filter by city, state, genre, date, and more.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  let initialResults: SearchResponse | null = null;

  if (q.length >= 2) {
    try {
      const filters = {
        ...defaultFilters(),
        q,
        type: (params.type ?? "all") as "all" | "venue" | "comedian" | "event",
        city: params.city,
        state: params.state,
        genre: params.genre,
        venueType: params.venueType,
        showType: params.showType,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        sort: (params.sort ?? "relevance") as "relevance" | "popularity" | "name" | "date" | "recently_added",
        offset: parseInt(params.offset ?? "0", 10) || 0,
      };
      initialResults = await unifiedSearch(filters);
    } catch {
      // Fall through with null results; the client component will handle fetching
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Suspense
          fallback={
            <>
              <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="h-12 w-full bg-zinc-800 rounded-lg animate-pulse mb-8" />
              <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            </>
          }
        >
          <SearchPageContent
            initialQuery={q}
            initialResults={initialResults}
          />
        </Suspense>
      </div>
    </div>
  );
}
