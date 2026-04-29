import Link from "next/link";
import { getFreshnessDashboardData } from "@/lib/freshness";

export const metadata = {
  title: "Freshness | Admin",
};

export default async function AdminFreshnessPage() {
  const { cities, staleEvents, staleVenues, summary } = await getFreshnessDashboardData().catch(() => ({
    cities: [],
    staleEvents: [],
    staleVenues: [],
    summary: { staleCount: 0, averageCoverage: 0, freshestCity: null },
  }));

  return (
    <div className="md:mt-0 mt-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Freshness</h1>
          <p className="text-sm text-zinc-400">
            Target-city coverage, stale queues, and whether the comedy graph still deserves trust.
          </p>
        </div>
        {summary.freshestCity && (
          <p className="text-sm text-zinc-500">
            Best-covered city: <span className="text-brand-gold">{summary.freshestCity.city.shortLabel}</span>
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Average city coverage</p>
          <p className="mt-2 text-3xl font-bold text-brand-gold">{Math.round(summary.averageCoverage)}</p>
        </div>
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Stale queue size</p>
          <p className="mt-2 text-3xl font-bold text-white">{summary.staleCount}</p>
        </div>
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Target cities tracked</p>
          <p className="mt-2 text-3xl font-bold text-white">{cities.length}</p>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Five-city coverage</h2>
          <p className="text-sm text-zinc-500">NYC, LA, Chicago, Austin, Philly</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          {cities.map((city) => (
            <article key={city.city.slug} className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
              <p className="text-sm font-semibold text-white">{city.city.shortLabel}</p>
              <p className="mt-2 text-3xl font-bold text-brand-gold">{Math.round(city.coverageScore)}</p>
              <p className="text-xs text-zinc-500">Coverage score</p>
              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Venues</span>
                  <span>{city.venueCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Upcoming shows</span>
                  <span>{city.upcomingEventCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Accessible</span>
                  <span>{city.accessibleEventCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fair-ticketed</span>
                  <span>{city.fairEventCount}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <h2 className="text-lg font-semibold text-white">Stale events</h2>
          <div className="mt-4 space-y-3">
            {staleEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">No stale events in the current target-city queue.</p>
            ) : (
              staleEvents.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                      {Math.round(item.freshness.score)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">{item.freshness.reasons.slice(0, 2).join(" · ")}</p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <h2 className="text-lg font-semibold text-white">Stale venues</h2>
          <div className="mt-4 space-y-3">
            {staleVenues.length === 0 ? (
              <p className="text-sm text-zinc-500">No stale venues in the current target-city queue.</p>
            ) : (
              staleVenues.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                      {Math.round(item.freshness.score)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">{item.freshness.reasons.slice(0, 2).join(" · ")}</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

