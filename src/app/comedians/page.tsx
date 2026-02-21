import Link from "next/link";
import { listComedians } from "@/lib/comedians";
import { TOURING_STATUS_LABELS } from "@/lib/constants";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    genre?: string;
    search?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ComediansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status, genre, search } = params;

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
    });
    comedians = result.comedians;
    total = result.total;
  } catch {
    // DB not configured
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Comedians</h1>
        <p className="text-zinc-400 mb-8">
          Explore comedian profiles, touring schedules, and YouTube content.
        </p>

        <form
          method="get"
          className="flex flex-wrap gap-4 mb-8 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
        >
          <div>
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Search comedians..."
              defaultValue={search}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="status" className="sr-only">
              Touring status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All statuses</option>
              {Object.entries(TOURING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="sr-only">
              Genre
            </label>
            <input
              id="genre"
              name="genre"
              type="text"
              placeholder="Genre (e.g. dark, observational)"
              defaultValue={genre}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

        <p className="text-zinc-500 text-sm mb-4">
          {total} comedian{total !== 1 ? "s" : ""} found
        </p>

        <ul className="divide-y divide-zinc-800">
          {comedians.map((comedian) => (
            <li key={comedian.id}>
              <Link
                href={`/comedians/${comedian.slug}`}
                className="flex gap-4 py-4 hover:bg-zinc-800/30 -mx-4 px-4 rounded-lg transition-colors"
              >
                {comedian.headshotUrl ? (
                  <img
                    src={comedian.headshotUrl}
                    alt={comedian.name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-2xl text-zinc-500">
                    {comedian.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    {comedian.name}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      {TOURING_STATUS_LABELS[comedian.touringStatus] ??
                        comedian.touringStatus}
                    </span>
                    {comedian.genres.slice(0, 3).map((g) => (
                      <span
                        key={g.id}
                        className="text-xs text-zinc-500 capitalize"
                      >
                        {g.genre}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-zinc-500 text-sm shrink-0">
                  {comedian._count.events} show
                  {comedian._count.events !== 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {comedians.length === 0 && (
          <p className="text-zinc-500 py-12 text-center">
            No comedians found. Try adjusting your filters.
          </p>
        )}
      </div>
    </main>
  );
}
