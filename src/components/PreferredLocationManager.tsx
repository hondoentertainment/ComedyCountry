"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  buildPreferredLocationHref,
  clearPreferredLocation,
  formatPreferredLocation,
  readPreferredLocation,
  savePreferredLocation,
} from "@/lib/preferred-location";

export function PreferredLocationManager() {
  const { toast } = useToast();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  useEffect(() => {
    const saved = readPreferredLocation();
    if (!saved) return;
    setCity(saved.city);
    setState(saved.state);
    setSavedLabel(formatPreferredLocation(saved));
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const nextCity = city.trim();
    const nextState = state.trim().toUpperCase();

    if (!nextCity || !nextState) {
      toast("Add both a city and state to save your home market.");
      return;
    }

    savePreferredLocation({ city: nextCity, state: nextState });
    setSavedLabel(`${nextCity}, ${nextState}`);
    toast("Home market saved for this device.");
  }

  function handleClear() {
    clearPreferredLocation();
    setSavedLabel(null);
    setCity("");
    setState("");
    toast("Home market cleared.");
  }

  const savedLocation =
    savedLabel && city.trim() && state.trim()
      ? { city: city.trim(), state: state.trim().toUpperCase() }
      : null;

  return (
    <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Home market</h3>
        <p className="text-zinc-400 text-sm">
          Save your go-to city so schedule, map, and discovery can get you to the right comedy scene faster on this device.
        </p>
      </div>

      {savedLabel && (
        <div className="mb-4 rounded-lg border border-brand-gold/20 bg-brand-gold/5 p-3">
          <p className="text-sm font-medium text-brand-gold">Saved home market</p>
          <p className="text-sm text-zinc-300 mt-1">{savedLabel}</p>
          {savedLocation && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link
                href={buildPreferredLocationHref("/schedule", savedLocation)}
                className="text-brand-gold hover:text-brand-gold/80 transition-colors"
              >
                Open schedule
              </Link>
              <Link
                href={buildPreferredLocationHref("/map", savedLocation)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Open venue map
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_auto] gap-3">
        <div>
          <label htmlFor="preferred-city" className="block text-sm text-zinc-400 mb-1">
            City
          </label>
          <input
            id="preferred-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Los Angeles"
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>
        <div>
          <label htmlFor="preferred-state" className="block text-sm text-zinc-400 mb-1">
            State
          </label>
          <input
            id="preferred-state"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            placeholder="CA"
            maxLength={2}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Save
          </button>
          {savedLabel && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
