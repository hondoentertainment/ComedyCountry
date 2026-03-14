"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

type MapFilterBarProps = {
  states: string[];
  state: string;
  city: string;
  search: string;
  onFilterChange: (state: string, city: string, search: string) => void;
  venueCount: number;
};

const CITY_DEBOUNCE_MS = 400;

export function MapFilterBar({
  states,
  state,
  city,
  search,
  onFilterChange,
  venueCount,
}: MapFilterBarProps) {
  const [cityInput, setCityInput] = useState(city);
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setCityInput(city);
  }, [city]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const handleStateChange = useCallback(
    (newState: string) => {
      onFilterChange(newState, "", search);
      setCityInput("");
    },
    [onFilterChange, search]
  );

  useEffect(() => {
    if (cityInput === city) return;
    const t = setTimeout(() => {
      onFilterChange(state, cityInput, search);
    }, CITY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cityInput, state, city, search, onFilterChange]);

  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => {
      onFilterChange(state, city, searchInput);
    }, CITY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, state, city, search, onFilterChange]);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex flex-wrap gap-3">
        <label htmlFor="map-state-filter" className="sr-only">
          Filter by state
        </label>
        <select
          id="map-state-filter"
          value={state}
          onChange={(e) => handleStateChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-[140px]"
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
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Filter by city…"
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          aria-label="Filter by city"
        />
        <label htmlFor="map-search-filter" className="sr-only">
          Search venues by name or location
        </label>
        <input
          id="map-search-filter"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search venues…"
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          aria-label="Search venues by name or location"
        />
      </div>
      {(state || city || search) && (
        <Link
          href="/map"
          className="text-sm text-zinc-400 hover:text-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 rounded px-1"
        >
          Clear filters
        </Link>
      )}
      <span className="text-sm text-zinc-500">
        {venueCount} venue{venueCount !== 1 ? "s" : ""} with coordinates
      </span>
    </div>
  );
}
