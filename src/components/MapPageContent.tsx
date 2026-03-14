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
    </>
  );
}
