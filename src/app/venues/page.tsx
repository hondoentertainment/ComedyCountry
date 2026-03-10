import Link from "next/link";
import Image from "next/image";
import { listVenues, getVenueStates } from "@/lib/venues";
import { VENUE_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";

export const metadata = {
  title: "Venues | Punchline Atlas",
  description: "Browse comedy venues nationwide. Filter by state, city, or venue type.",
};

type PageProps = {
  searchParams: Promise<{ state?: string; city?: string; type?: string; search?: string; page?: string }>;
};

export const revalidate = 60;

export default async function VenuesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { state, city, type, search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  let venues: Awaited<ReturnType<typeof listVenues>>["venues"] = [];
  let total = 0;
  let states: { state: string }[] = [];

  try {
    const [v, s] = await Promise.all([
      listVenues({
        state: state || undefined,
        city: city || undefined,
        type: type as "CLUB" | "THEATER" | "BAR" | "FESTIVAL" | "OPEN_MIC" | undefined,
        search: search || undefined,
        take: PAGE_SIZE,
        skip,
      }),
      getVenueStates(),
    ]);
    venues = v.venues;
    total = v.total;
    states = s;
  } catch {
    // DB not configured
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Venues</h1>
            <p className="text-zinc-400 text-sm">
              {total} venue{total !== 1 ? "s" : ""} — clubs, theaters, and comedy spots
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
              placeholder="Search venues..."
              defaultValue={search}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="state" className="sr-only">State</label>
            <select
              id="state"
              name="state"
              defaultValue={state ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="city" className="sr-only">City</label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="City"
              defaultValue={city}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 w-36"
            />
          </div>
          <div>
            <label htmlFor="type" className="sr-only">Type</label>
            <select
              id="type"
              name="type"
              defaultValue={type ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All types</option>
              {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

        {/* Yelp photo-forward card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => {
            const photo = venue.photos?.[0];
            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="card-interactive overflow-hidden group block"
              >
                <div className="aspect-[16/10] bg-brand-charcoal relative overflow-hidden">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? venue.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
                      🏛️
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-black/50 text-zinc-300 text-xs">
                      {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-black/50 text-zinc-300 text-xs">
                      {(venue.upcomingEventCount ?? 0)} upcoming show{(venue.upcomingEventCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {venue.capacity && (
                      <span className="text-xs text-zinc-400">
                        {venue.capacity} cap
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-white">{venue.name}</h2>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {venue.city}, {venue.state}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {venues.length === 0 && (
          <div className="py-20 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 text-lg font-medium mb-2">No venues found</p>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              Try adjusting your search, state, city, or venue type.
            </p>
            <Link
              href="/venues"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
            >
              Browse all venues
            </Link>
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/venues"
          searchParams={{ state, city, type, search }}
        />
      </div>
    </div>
  );
}
