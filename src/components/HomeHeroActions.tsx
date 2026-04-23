"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPreferredLocationHref,
  formatPreferredLocation,
  readPreferredLocation,
  type PreferredLocation,
} from "@/lib/preferred-location";

const FEATURED_CITIES = [
  { label: "Los Angeles", href: "/schedule?city=Los%20Angeles&state=CA" },
  { label: "New York", href: "/schedule?city=New%20York&state=NY" },
  { label: "Chicago", href: "/schedule?city=Chicago&state=IL" },
  { label: "Austin", href: "/schedule?city=Austin&state=TX" },
];

export function HomeHeroActions() {
  const router = useRouter();
  const [preferredLocation, setPreferredLocation] = useState<PreferredLocation | null>(null);

  useEffect(() => {
    setPreferredLocation(readPreferredLocation());
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {preferredLocation && (
          <Link
            href={buildPreferredLocationHref("/schedule", preferredLocation)}
            className="px-4 py-2.5 rounded-full bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Open {formatPreferredLocation(preferredLocation)}
          </Link>
        )}
        <button
          type="button"
          onClick={() => router.push("/happening-tonight?nearby=1")}
          className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
        >
          Find shows near me
        </button>
        <Link
          href="/schedule"
          className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
        >
          Browse this week
        </Link>
        <Link
          href="/map"
          className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
        >
          Explore the venue map
        </Link>
        <Link
          href="/search"
          className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
        >
          Search comedians, venues, and events
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Popular scenes
        </span>
        {preferredLocation && (
          <Link
            href={buildPreferredLocationHref("/map", preferredLocation)}
            className="px-3 py-1.5 rounded-full border border-brand-gold/30 text-sm text-brand-gold hover:border-brand-gold/50 hover:bg-brand-gold/10 transition-colors"
          >
            Your scene
          </Link>
        )}
        {FEATURED_CITIES.map((city) => (
          <Link
            key={city.label}
            href={city.href}
            className="px-3 py-1.5 rounded-full border border-zinc-700/80 text-sm text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-colors"
          >
            {city.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
