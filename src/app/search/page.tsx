import { Suspense } from "react";
import { search } from "@/lib/search";
import { SearchPageContent } from "@/components/SearchPageContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search | Punchline Atlas",
  description: "Search venues, comedians, and upcoming comedy events.",
};

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const initialResults = term.length >= 2 ? await search(term, 10) : null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
            initialQuery={term}
            initialResults={initialResults}
          />
        </Suspense>
      </div>
    </main>
  );
}
