import Link from "next/link";
import Image from "next/image";
import { ClearVenuesFiltersLink } from "./ClearVenuesFiltersLink";
import { listVenues, getVenueStates } from "@/lib/venues";
import { VENUE_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";
import { VenueFilterBar } from "@/components/VenueFilterBar";

export const metadata = {
  title: "Venues | Punchline Atlas",
  description: "Browse comedy venues nationwide. Filter by state, city, venue type, capacity, and sort by popularity.",
};

type PageProps = {
  searchParams: Promise<{
    state?: string;
    city?: string;
    type?: string;
    search?: string;
    page?: string;
    sort?: string;
    capacityMin?: string;
    capacityMax?: string;
  }>;
};

export const revalidate = 60;

export default async function VenuesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { state, city, type, search, page, sort, capacityMin, capacityMax } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // Parse capacity range
  const parsedCapacityMin = capacityMin ? parseInt(capacityMin, 10) : undefined;
  const parsedCapacityMax = capacityMax ? parseInt(capacityMax, 10) : undefined;

  let venues: Awaited<ReturnType<typeof listVenues>>["venues"] = [];
  let total = 0;
  let states: { state: string }[] = [];
  let dataUnavailable = false;

  try {
    const [v, s] = await Promise.all([
      listVenues({
        state: state || undefined,
        city: city || undefined,
        type: type as "CLUB" | "THEATER" | "BAR" | "FESTIVAL" | "OPEN_MIC" | undefined,
        search: search || undefined,
        capacityMin: parsedCapacityMin,
        capacityMax: parsedCapacityMax,
        take: PAGE_SIZE,
        skip,
      }),
      getVenueStates(),
    ]);
    venues = v.venues;
    total = v.total;
    states = s;

    // Apply sort
    if (sort === "name") {
      venues.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "popularity") {
      // Sort by follower count - need to fetch follower counts
      // Since listVenues doesn't return followers, we sort by upcoming events as a proxy
      venues.sort((a, b) => (b.upcomingEventCount ?? 0) - (a.upcomingEventCount ?? 0));
    } else if (sort === "recently_added") {
      venues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "capacity_asc") {
      venues.sort((a, b) => (a.capacity ?? 0) - (b.capacity ?? 0));
    } else if (sort === "capacity_desc") {
      venues.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
    }
  } catch {
    dataUnavailable = true;
  }

  // Count active filters
  const activeFilterCount = [state, city, type, search, sort, capacityMin].filter(Boolean).length;

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
            <h1 className="text-3xl font-bold text-white mb-1">Venues</h1>
            <p className="text-zinc-400 text-sm">
              {total} venue{total !== 1 ? "s" : ""} -- clubs, theaters, and comedy spots
              {activeFilterCount > 0 && (
                <span className="text-brand-gold ml-1">
                  ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active)
                </span>
              )}
            </p>
          </div>
          {sort && (
            <p className="text-xs text-zinc-500">
              Sorted by:{" "}
              <span className="text-zinc-400">
                {sort === "name" ? "Name" :
                 sort === "popularity" ? "Popularity" :
                 sort === "recently_added" ? "Recently added" :
                 sort === "capacity_asc" ? "Capacity (low)" :
                 sort === "capacity_desc" ? "Capacity (high)" : sort}
              </span>
            </p>
          )}
        </div>

        <VenueFilterBar
          states={states}
          defaultState={state}
          defaultCity={city}
          defaultType={type}
          defaultSearch={search}
          defaultSort={sort}
          defaultCapacityMin={capacityMin}
          defaultCapacityMax={capacityMax}
        />

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
                      alt={photo.caption ? `Photo of ${venue.name}: ${photo.caption}` : `Photo of ${venue.name}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
                      <svg className="w-12 h-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
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
            <ClearVenuesFiltersLink />
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/venues"
          searchParams={{ state, city, type, search, sort, capacityMin, capacityMax }}
        />
      </div>
    </div>
  );
}
