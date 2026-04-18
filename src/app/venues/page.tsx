import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { listVenues, getVenueStates } from "@/lib/venues";
import { VENUE_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";
import { VenueFilterBar } from "@/components/VenueFilterBar";

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

        <Suspense>
          <VenueFilterBar
            states={states}
            defaultState={state}
            defaultCity={city}
            defaultType={type}
            defaultSearch={search}
          />
        </Suspense>

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
