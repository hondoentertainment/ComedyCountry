import Link from "next/link";
import { listVenues, getVenueStates } from "@/lib/venues";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

type PageProps = {
  searchParams: Promise<{ state?: string; city?: string; type?: string; search?: string }>;
};

export const dynamic = "force-dynamic";

export default async function VenuesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { state, city, type, search } = params;

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
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Venues</h1>
        <p className="text-zinc-400 mb-8">
          Browse comedy venues nationwide. Filter by state, city, or type.
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
              placeholder="Search venues..."
              defaultValue={search}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="state" className="sr-only">
              State
            </label>
            <select
              id="state"
              name="state"
              defaultValue={state ?? ""}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="city" className="sr-only">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="City"
              defaultValue={city}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="type" className="sr-only">
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={type ?? ""}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All types</option>
              {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

        <p className="text-zinc-500 text-sm mb-4">
          {total} venue{total !== 1 ? "s" : ""} found
        </p>

        <ul className="divide-y divide-zinc-800">
          {venues.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/venues/${venue.id}`}
                className="block py-4 hover:bg-zinc-800/30 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {venue.name}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      {venue.city}, {venue.state}
                      {venue.capacity && ` • ${venue.capacity} capacity`}
                    </p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                    </span>
                  </div>
                  <span className="text-zinc-500 text-sm shrink-0">
                    {venue._count.events} upcoming show
                    {venue._count.events !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {venues.length === 0 && (
          <p className="text-zinc-500 py-12 text-center">
            No venues found. Try adjusting your filters or{" "}
            <Link href="/venues" className="text-brand-gold hover:underline">
              browse venues
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
