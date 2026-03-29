"use client";

import { useState } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

type Props = {
  states: { state: string }[];
  defaultState?: string;
  defaultCity?: string;
  defaultType?: string;
  defaultSearch?: string;
  defaultSort?: string;
  defaultCapacityMin?: string;
  defaultCapacityMax?: string;
};

const SORT_OPTIONS = [
  { value: "", label: "Default (State, City)" },
  { value: "name", label: "Name (A-Z)" },
  { value: "popularity", label: "Most popular" },
  { value: "recently_added", label: "Recently added" },
  { value: "capacity_asc", label: "Capacity (low to high)" },
  { value: "capacity_desc", label: "Capacity (high to low)" },
  { value: "rating", label: "Highest rated" },
] as const;

const CAPACITY_RANGES = [
  { value: "", label: "Any capacity" },
  { value: "0-100", label: "Under 100" },
  { value: "100-300", label: "100 - 300" },
  { value: "300-500", label: "300 - 500" },
  { value: "500-", label: "500+" },
] as const;

export function VenueFilterBar({
  states,
  defaultState,
  defaultCity,
  defaultType,
  defaultSearch,
  defaultSort,
  defaultCapacityMin,
  defaultCapacityMax,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(
    !!(defaultSort || defaultCapacityMin || defaultCapacityMax),
  );

  // Derive capacity range from min/max
  const getCapacityRange = () => {
    if (!defaultCapacityMin && !defaultCapacityMax) return "";
    if (defaultCapacityMin === "0" && defaultCapacityMax === "100")
      return "0-100";
    if (defaultCapacityMin === "100" && defaultCapacityMax === "300")
      return "100-300";
    if (defaultCapacityMin === "300" && defaultCapacityMax === "500")
      return "300-500";
    if (defaultCapacityMin === "500" && !defaultCapacityMax) return "500-";
    return "";
  };

  const [capacityRange, setCapacityRange] = useState(getCapacityRange());

  const handleCapacityChange = (value: string) => {
    setCapacityRange(value);
  };

  const hasActiveFilters =
    defaultState ||
    defaultCity ||
    defaultType ||
    defaultSearch ||
    defaultSort ||
    defaultCapacityMin ||
    defaultCapacityMax;

  return (
    <form
      method="get"
      className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80 space-y-4"
    >
      {/* Primary search row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchAutocomplete
            type="venue"
            name="search"
            placeholder="Search venues..."
            defaultValue={defaultSearch}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="state" className="sr-only">
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue={defaultState ?? ""}
            className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
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
            defaultValue={defaultCity}
            className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 w-36"
          />
        </div>
        <div>
          <label htmlFor="type" className="sr-only">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={defaultType ?? ""}
            className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="">All types</option>
            {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          {showAdvanced ? "Hide" : "Show"} advanced filters
        </button>

        <div className="flex gap-2">
          {hasActiveFilters && (
            <a
              href="/venues"
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Clear all
            </a>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Advanced filters row */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 pt-3 border-t border-zinc-800/60">
          <div>
            <label htmlFor="sort" className="text-xs text-zinc-500 block mb-1">
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={defaultSort ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="capacity"
              className="text-xs text-zinc-500 block mb-1"
            >
              Capacity
            </label>
            <select
              id="capacity"
              value={capacityRange}
              onChange={(e) => handleCapacityChange(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-[140px]"
            >
              {CAPACITY_RANGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Hidden inputs for capacity min/max from selected range */}
            {capacityRange && (
              <>
                <input
                  type="hidden"
                  name="capacityMin"
                  value={capacityRange.split("-")[0] || ""}
                />
                <input
                  type="hidden"
                  name="capacityMax"
                  value={capacityRange.split("-")[1] || ""}
                />
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
