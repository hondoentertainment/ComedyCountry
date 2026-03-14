"use client";

import { useEffect, useMemo } from "react";

type VenueForFilter = {
  id: string;
  city: string;
  state: string;
};

type MapFilterBarProps = {
  venues: VenueForFilter[];
  onFilterChange: (filtered: VenueForFilter[]) => void;
  state: string;
  city: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
};

export function MapFilterBar({
  venues,
  onFilterChange,
  state,
  city,
  onStateChange,
  onCityChange,
}: MapFilterBarProps) {

  const states = useMemo(() => {
    const stateSet = new Set<string>();
    for (const v of venues) {
      if (v.state) stateSet.add(v.state);
    }
    return Array.from(stateSet).sort();
  }, [venues]);

  const filtered = useMemo(() => {
    return venues.filter((v) => {
      if (state && v.state !== state) return false;
      if (city && !v.city.toLowerCase().includes(city.toLowerCase()))
        return false;
      return true;
    });
  }, [venues, state, city]);

  useEffect(() => {
    onFilterChange(filtered);
  }, [filtered, onFilterChange]);

  if (venues.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex flex-wrap gap-3">
        <label htmlFor="map-state-filter" className="sr-only">
          Filter by state
        </label>
        <select
          id="map-state-filter"
          value={state}
          onChange={(e) => {
            onStateChange(e.target.value);
            onCityChange("");
          }}
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          aria-label="Filter by state"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label htmlFor="map-city-filter" className="sr-only">
          Filter by city
        </label>
        <input
          id="map-city-filter"
          type="text"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Filter by city…"
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          aria-label="Filter by city"
        />
      </div>
      {(state || city) && (
        <button
          type="button"
          onClick={() => {
            onStateChange("");
            onCityChange("");
          }}
          className="text-sm text-zinc-400 hover:text-brand-gold"
        >
          Clear filters
        </button>
      )}
      <span className="text-sm text-zinc-500">
        {filtered.length} venue{filtered.length !== 1 ? "s" : ""} shown
      </span>
    </div>
  );
}
