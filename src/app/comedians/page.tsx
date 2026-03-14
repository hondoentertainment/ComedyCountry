import Link from "next/link";
import Image from "next/image";
import { ClearComediansFiltersLink } from "./ClearComediansFiltersLink";
import { listComedians, listDistinctGenres } from "@/lib/comedians";
import { TOURING_STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";
import { ComedianFilterBar } from "@/components/ComedianFilterBar";

export const metadata = {
  title: "Comedians | Punchline Atlas",
  description: "Explore comedian profiles, touring schedules, and YouTube content.",
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    genre?: string;
    search?: string;
    page?: string;
  }>;
};

export const revalidate = 60;

export default async function ComediansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status, genre, search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  let comedians: Awaited<ReturnType<typeof listComedians>>["comedians"] = [];
  let total = 0;
  let genres: string[] = [];
  let dataUnavailable = false;

  try {
    const result = await listComedians({
      touringStatus: status as
        | "TOURING"
        | "REGIONAL"
        | "LOCAL"
        | "RETIRED"
        | "UNKNOWN"
        | undefined,
      genre: genre || undefined,
      search: search || undefined,
      take: PAGE_SIZE,
      skip,
    });
    comedians = result.comedians;
    total = result.total;
    genres = await listDistinctGenres();
  } catch {
    dataUnavailable = true;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {dataUnavailable && (
          <div className="mb-6 p-4 rounded-card bg-amber-500/10 border border-amber-500/40 text-amber-200 text-center">
            Data temporarily unavailable. Please try again later.
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Comedians</h1>
            <p className="text-zinc-400 text-sm">
              {total} comedian{total !== 1 ? "s" : ""} — explore profiles and tour dates
            </p>
          </div>
        </div>

        <ComedianFilterBar
          genres={genres}
          defaultStatus={status}
          defaultGenre={genre}
          defaultSearch={search}
        />

        {/* Spotify-style card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {comedians.map((comedian) => (
            <Link
              key={comedian.id}
              href={`/comedians/${comedian.slug}`}
              className="card-interactive overflow-hidden group block"
            >
              <div className="aspect-square bg-brand-charcoal relative overflow-hidden">
                {comedian.headshotUrl ? (
                  <Image
                    src={comedian.headshotUrl}
                    alt={`Headshot of ${comedian.name}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-500 bg-gradient-to-br from-zinc-800 to-zinc-900">
                    {comedian.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-black/50 text-zinc-300 text-xs">
                    {comedian._count.events} show{comedian._count.events !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h2 className="font-semibold text-white truncate">{comedian.name}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/80 text-zinc-300">
                    {TOURING_STATUS_LABELS[comedian.touringStatus] ?? comedian.touringStatus}
                  </span>
                  {comedian.genres.slice(0, 2).map((g) => (
                    <span key={g.id} className="text-xs text-zinc-500 truncate capitalize max-w-[80px]">
                      {g.genre}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {comedians.length === 0 && (
          <div className="py-20 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 text-lg font-medium mb-2">No comedians found</p>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              Try a different search term, touring status, or genre.
            </p>
            <ClearComediansFiltersLink />
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/comedians"
          searchParams={{ status, genre, search }}
        />
      </div>
    </div>
  );
}
