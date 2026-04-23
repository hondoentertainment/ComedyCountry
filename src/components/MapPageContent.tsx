"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { VenueMap } from "@/components/VenueMap";
import { MapFilterBar } from "@/components/MapFilterBar";

type VenueWithCoords = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

type MapPageContentProps = {
  venues: VenueWithCoords[];
  states: string[];
  initialState: string;
  initialCity: string;
  initialSearch: string;
};

export function MapPageContent({
  venues,
  states,
  initialState,
  initialCity,
  initialSearch,
}: MapPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (state: string, city: string, search: string) => {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (city) params.set("city", city);
      if (search) params.set("q", search);
      const qs = params.toString();
      router.push(qs ? `/map?${qs}` : "/map", { scroll: false });
    },
    [router]
  );

  const validVenues = venues.filter(
    (v) => v.latitude != null && v.longitude != null
  );
  const visibleVenues = venues.slice(0, 12);
  const listHeading =
    initialCity || initialState || initialSearch
      ? "Matching venues"
      : "Featured venues on the map";

  return (
    <>
      <MapFilterBar
        states={states}
        state={initialState}
        city={initialCity}
        search={initialSearch}
        onFilterChange={handleFilterChange}
        venueCount={validVenues.length}
      />
      {validVenues.length === 0 && (
        <div className="mb-6 p-6 rounded-lg bg-brand-surface border border-zinc-700 text-center">
          <p className="font-medium text-zinc-300 mb-2">
            No venues with coordinates
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            {venues.length > 0
              ? "No venues match your filters. Clear filters to see all."
              : "There are no venues with location data to display on the map."}
          </p>
          {venues.length > 0 ? (
            <Link
              href="/map"
              className="inline-block px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/venues"
              className="text-sm text-brand-gold hover:underline font-medium"
            >
              Browse venues
            </Link>
          )}
        </div>
      )}
      {validVenues.length > 0 && <VenueMap venues={venues} />}

      {venues.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{listHeading}</h2>
              <p className="text-sm text-zinc-500">
                Keep browsing even if you skip cookies or prefer a list over the map.
              </p>
            </div>
            {venues.length > visibleVenues.length && (
              <Link
                href="/venues"
                className="text-sm font-medium text-brand-gold hover:text-brand-gold/80 transition-colors"
              >
                Browse all venues →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visibleVenues.map((venue) => (
              <div
                key={venue.id}
                className="rounded-xl border border-zinc-800 bg-brand-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/venues/${venue.id}`}
                      className="font-semibold text-white hover:text-brand-gold transition-colors"
                    >
                      {venue.name}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-400">
                      {venue.city}, {venue.state}
                    </p>
                    {venue.address && (
                      <p className="mt-1 text-sm text-zinc-500">{venue.address}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                    {venue.latitude != null && venue.longitude != null ? "Mapped" : "List only"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    View venue
                  </Link>
                  <Link
                    href={`/schedule?city=${encodeURIComponent(venue.city)}&state=${encodeURIComponent(venue.state)}`}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    See shows in {venue.city}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
