import Link from "next/link";
import Image from "next/image";
import { listComedians } from "@/lib/comedians";
import { TOURING_STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";

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

export const dynamic = "force-dynamic";

export default async function ComediansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status, genre, search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  let comedians: Awaited<ReturnType<typeof listComedians>>["comedians"] = [];
  let total = 0;

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
  } catch {
    // DB not configured
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Comedians</h1>
            <p className="text-zinc-400 text-sm">
              {total} comedian{total !== 1 ? "s" : ""} — explore profiles and tour dates
            </p>
          </div>
        </div>

        {/* Yelp-style filter bar */}
        <form
          method="get"
          className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80"
        >
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Search comedians..."
              defaultValue={search}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="status" className="sr-only">Touring status</label>
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All statuses</option>
              {Object.entries(TOURING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="sr-only">Genre</label>
            <input
              id="genre"
              name="genre"
              type="text"
              placeholder="Genre"
              defaultValue={genre}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 w-40"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

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
                    alt={comedian.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    unoptimized
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
            <Link
              href="/comedians"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
            >
              Browse all comedians
            </Link>
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/comedians"
          searchParams={{ status, genre, search }}
        />
      </div>
    </main>
  );
}
