"use client";

import { SearchAutocomplete } from "./SearchAutocomplete";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

type Props = {
  states: { state: string }[];
  defaultState?: string;
  defaultCity?: string;
  defaultType?: string;
  defaultSearch?: string;
};

export function VenueFilterBar({
  states,
  defaultState,
  defaultCity,
  defaultType,
  defaultSearch,
}: Props) {
  return (
    <form
      method="get"
      className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80"
    >
      <SearchAutocomplete
        type="venue"
        name="search"
        placeholder="Search venues..."
        defaultValue={defaultSearch}
        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
      />
      <div>
        <label htmlFor="state" className="sr-only">State</label>
        <select
          id="state"
          name="state"
          defaultValue={defaultState ?? ""}
          className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s.state} value={s.state}>{s.state}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="city" className="sr-only">City</label>
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
        <label htmlFor="type" className="sr-only">Type</label>
        <select
          id="type"
          name="type"
          defaultValue={defaultType ?? ""}
          className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        >
          <option value="">All types</option>
          {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
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
