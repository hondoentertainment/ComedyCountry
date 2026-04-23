"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildPreferredLocationHref,
  formatPreferredLocation,
  readPreferredLocation,
  type PreferredLocation,
} from "@/lib/preferred-location";

export function HomeMarketSpotlight() {
  const [location, setLocation] = useState<PreferredLocation | null>(null);

  useEffect(() => {
    setLocation(readPreferredLocation());
  }, []);

  if (!location) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-brand-surface/80 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Make the app feel local</p>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Save your home market once and we will keep schedule, map, and search pointed at the
              scene you care about most.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-gold/90 transition-colors"
          >
            Set home market
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-brand-surface/80 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Your home scene
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {formatPreferredLocation(location)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Jump straight into what is on this week, what is happening tonight, and which rooms are
            worth checking in your city.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={buildPreferredLocationHref("/schedule", location)}
            className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4 hover:border-zinc-700 transition-colors"
          >
            <p className="font-medium text-white">This week</p>
            <p className="mt-1 text-xs text-zinc-500">Open the full {location.city} schedule.</p>
          </Link>
          <Link
            href={buildPreferredLocationHref("/map", location)}
            className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4 hover:border-zinc-700 transition-colors"
          >
            <p className="font-medium text-white">Venue map</p>
            <p className="mt-1 text-xs text-zinc-500">See the rooms shaping your scene.</p>
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4 hover:border-zinc-700 transition-colors"
          >
            <p className="font-medium text-white">Alerts and digests</p>
            <p className="mt-1 text-xs text-zinc-500">Keep new-show updates flowing back in.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
