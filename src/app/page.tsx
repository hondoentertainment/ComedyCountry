import Link from "next/link";
import { Suspense } from "react";
import { HomeSections } from "./HomeSections";

export const dynamic = "force-dynamic";

function HomeSectionsFallback() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      role="status"
      aria-label="Loading content"
      aria-busy
    >
      {/* Skeleton for Made for you / Upcoming / Explore — shown while session and data load */}
      <div className="mb-14">
        <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mb-14">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mb-14">
        <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[16/10] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="bg-gradient-to-b from-brand-charcoal/80 to-transparent">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            Find comedy. <span className="text-brand-gold">Anywhere.</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            Discover venues, track comedian tours, and see what&apos;s worth your night out.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/search"
              className="px-4 py-2.5 rounded-full bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
            >
              Search comedians, venues, and events
            </Link>
            <Link
              href="/schedule"
              className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
            >
              Browse schedule
            </Link>
            <Link
              href="/comedians"
              className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
            >
              Comedians
            </Link>
            <Link
              href="/venues"
              className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
            >
              Venues
            </Link>
            <Link
              href="/map"
              className="px-4 py-2.5 rounded-full bg-brand-surface border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-brand-surface-elevated font-medium transition-colors"
            >
              Map
            </Link>
          </div>
        </div>
      </div>

      <Suspense fallback={<HomeSectionsFallback />}>
        <HomeSections />
      </Suspense>
    </main>
  );
}
