"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  buildPreferredLocationHref,
  formatPreferredLocation,
  PreferredLocation,
  readPreferredLocation,
  savePreferredLocation,
} from "@/lib/preferred-location";

export function ScheduleLocationActions({
  currentCity,
  currentState,
}: {
  currentCity?: string;
  currentState?: string;
}) {
  const { toast } = useToast();
  const [savedLocation, setSavedLocation] = useState<PreferredLocation | null>(null);

  useEffect(() => {
    setSavedLocation(readPreferredLocation());
  }, []);

  const activeLocation = useMemo(() => {
    if (!currentCity?.trim() || !currentState?.trim()) return null;
    return {
      city: currentCity.trim(),
      state: currentState.trim().toUpperCase(),
    };
  }, [currentCity, currentState]);

  const currentMatchesSaved =
    activeLocation &&
    savedLocation &&
    activeLocation.city.toLowerCase() === savedLocation.city.toLowerCase() &&
    activeLocation.state.toLowerCase() === savedLocation.state.toLowerCase();

  function saveCurrentLocation() {
    if (!activeLocation) return;
    savePreferredLocation(activeLocation);
    setSavedLocation(activeLocation);
    toast(`Saved ${formatPreferredLocation(activeLocation)} as your home market.`);
  }

  if (!savedLocation && !activeLocation) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-brand-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Home market shortcuts</p>
          <p className="text-sm text-zinc-500 mt-1">
            Keep your most-used comedy city one tap away.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {savedLocation && !currentMatchesSaved && (
            <Link
              href={buildPreferredLocationHref("/schedule", savedLocation)}
              className="px-3 py-1.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/30 hover:bg-brand-gold/15 transition-colors"
            >
              Use {formatPreferredLocation(savedLocation)}
            </Link>
          )}
          {activeLocation && !currentMatchesSaved && (
            <button
              type="button"
              onClick={saveCurrentLocation}
              className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            >
              Save current filters as home market
            </button>
          )}
          {currentMatchesSaved && savedLocation && (
            <span className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300">
              Browsing {formatPreferredLocation(savedLocation)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
