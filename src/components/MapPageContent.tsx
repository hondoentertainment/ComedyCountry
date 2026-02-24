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

  const handleFilterChange = useCallback(
    (filtered: Array<{ id: string; city: string; state: string }>) => {
      const ids = new Set(filtered.map((f) => f.id));
      setFilteredVenues(venues.filter((v) => ids.has(v.id)));
    },
    [venues]
  );

  return (
    <>
      <MapFilterBar
        venues={venues.map((v) => ({ id: v.id, city: v.city, state: v.state }))}
        onFilterChange={handleFilterChange}
      />
      <VenueMap venues={filteredVenues} />
    </>
  );
}
