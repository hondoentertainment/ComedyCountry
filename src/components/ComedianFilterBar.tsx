"use client";

import { useState } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { TOURING_STATUS_LABELS } from "@/lib/constants";

type Props = {
  genres: string[];
  defaultStatus?: string;
  defaultGenre?: string;
  defaultSearch?: string;
  defaultSort?: string;
};

const SORT_OPTIONS = [
  { value: "", label: "Default (A-Z)" },
  { value: "popularity", label: "Most popular" },
  { value: "recently_added", label: "Recently added" },
  { value: "most_shows", label: "Most shows" },
] as const;

export function ComedianFilterBar({
  genres,
  defaultStatus,
  defaultGenre,
  defaultSearch,
  defaultSort,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(!!defaultSort);
  const hasActiveFilters = defaultStatus || defaultGenre || defaultSearch || defaultSort;

  return (
    <form
      method="get"
      className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80 space-y-4"
    >
      {/* Primary search row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchAutocomplete
            type="comedian"
            name="search"
            placeholder="Search comedians..."
            defaultValue={defaultSearch}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="status" className="sr-only">Touring status</label>
          <select
            id="status"
            name="status"
            defaultValue={defaultStatus ?? ""}
            className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="">All statuses</option>
            {Object.entries(TOURING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="genre" className="sr-only">Genre</label>
          <select
            id="genre"
            name="genre"
            defaultValue={defaultGenre ?? ""}
            className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-[140px]"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced toggle + actions */}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {showAdvanced ? "Hide" : "Show"} advanced filters
        </button>

        <div className="flex gap-2">
          {hasActiveFilters && (
            <a
              href="/comedians"
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
            <label htmlFor="sort" className="text-xs text-zinc-500 block mb-1">Sort by</label>
            <select
              id="sort"
              name="sort"
              defaultValue={defaultSort ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </form>
  );
}
