"use client";

import { SearchAutocomplete } from "./SearchAutocomplete";
import { TOURING_STATUS_LABELS } from "@/lib/constants";

type Props = {
  genres: string[];
  defaultStatus?: string;
  defaultGenre?: string;
  defaultSearch?: string;
};

export function ComedianFilterBar({
  genres,
  defaultStatus,
  defaultGenre,
  defaultSearch,
}: Props) {
  return (
    <form
      method="get"
      className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80"
    >
      <SearchAutocomplete
        type="comedian"
        name="search"
        placeholder="Search comedians..."
        defaultValue={defaultSearch}
        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
      />
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
      <button
        type="submit"
        className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
      >
        Filter
      </button>
    </form>
  );
}
