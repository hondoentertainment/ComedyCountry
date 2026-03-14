"use client";

import { useCallback, useState } from "react";
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
};

export function MapPageContent({ venues }: MapPageContentProps) {
  const [filteredVenues, setFilteredVenues] = useState(venues);
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");

  const handleFilterChange = useCallback(
    (filtered: Array<{ id: string; city: string; state: string }>) => {
      const ids = new Set(filtered.map((f) => f.id));
      setFilteredVenues(venues.filter((v) => ids.has(v.id)));
    },
    [venues]
  );

  const clearFilters = useCallback(() => {
    setFilterState("");
    setFilterCity("");
  }, []);

  return (
    <>
      <MapFilterBar
        venues={venues.map((v) => ({ id: v.id, city: v.city, state: v.state }))}
        onFilterChange={handleFilterChange}
        state={filterState}
        city={filterCity}
        onStateChange={setFilterState}
        onCityChange={setFilterCity}
      />
      {filteredVenues.length === 0 && venues.length > 0 && (
        <div className="mb-6 p-4 rounded-card bg-brand-surface border border-amber-500/40 text-center">
          <p className="text-zinc-300 mb-3">No venues match your filters. Clear filters to see all.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
      <VenueMap venues={filteredVenues} />
    </>
  );
}
