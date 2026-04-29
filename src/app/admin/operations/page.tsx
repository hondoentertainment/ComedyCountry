import Link from "next/link";
import { getOpsReadinessSnapshot } from "@/lib/ops-readiness";

export const metadata = {
  title: "Operations | Admin",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminOperationsPage() {
  const snapshot = await getOpsReadinessSnapshot().catch(() => ({
    generatedAt: new Date(),
    totals: {
      targetCityVenues: 0,
      targetCityUpcomingEvents: 0,
      staleQueueSize: 0,
      averageCoverage: 0,
    },
    importGuardrails: {
      dryRunDefault: false,
      strictTargetCities: false,
      maxVenues: 0,
      maxEvents: 0,
      bulkImportApiKeyConfigured: false,
    },
    freshness: {
      cities: [],
      staleEvents: [],
      staleVenues: [],
      summary: { staleCount: 0, averageCoverage: 0, freshestCity: null },
    },
    eventGaps: [],
    venueGaps: [],
    recentImports: [],
  }));

  return (
    <div className="space-y-8 md:mt-0 mt-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Readiness</h1>
          <p className="text-sm text-zinc-400">
            Seed depth, import guardrails, target-city coverage, and the biggest data gaps still blocking trust.
          </p>
        </div>
        <p className="text-sm text-zinc-500">Snapshot: {formatDate(snapshot.generatedAt)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Target-city venues</p>
          <p className="mt-2 text-3xl font-bold text-white">{snapshot.totals.targetCityVenues}</p>
        </div>
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Upcoming target-city events</p>
          <p className="mt-2 text-3xl font-bold text-white">{snapshot.totals.targetCityUpcomingEvents}</p>
        </div>
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Average coverage</p>
          <p className="mt-2 text-3xl font-bold text-brand-gold">
            {Math.round(snapshot.totals.averageCoverage)}
          </p>
        </div>
        <div className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
          <p className="text-sm text-zinc-500">Open stale queue</p>
          <p className="mt-2 text-3xl font-bold text-brand-gold">
            {snapshot.totals.staleQueueSize}
          </p>
        </div>
      </div>

      <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Guardrails</h2>
            <p className="text-sm text-zinc-500">
              Current runtime limits for bulk imports and operator safety checks.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              snapshot.importGuardrails.bulkImportApiKeyConfigured
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {snapshot.importGuardrails.bulkImportApiKeyConfigured
              ? "API key configured"
              : "API key missing"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Dry run default</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {snapshot.importGuardrails.dryRunDefault ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Strict target cities</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {snapshot.importGuardrails.strictTargetCities ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Max venues</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {snapshot.importGuardrails.maxVenues}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Max events</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {snapshot.importGuardrails.maxEvents}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Target-City Coverage</h2>
            <p className="text-sm text-zinc-500">
              The five-city operating footprint the trusted comedy graph has to win first.
            </p>
          </div>
          <Link href="/admin/freshness" className="text-sm text-brand-gold hover:text-brand-gold/80">
            Open freshness dashboard
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          {snapshot.freshness.cities.map((city) => (
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
                  <span>Shows</span>
                  <span>{city.upcomingEventCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Accessible</span>
                  <span>{city.accessibleEventCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fair</span>
                  <span>{city.fairEventCount}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming Event Gaps</h2>
              <p className="text-sm text-zinc-500">
                Near-term shows that still need operator cleanup before fans can trust them.
              </p>
            </div>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
              {snapshot.eventGaps.length} surfaced
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.eventGaps.length === 0 ? (
              <p className="text-sm text-zinc-500">No urgent event gaps found in the next two weeks.</p>
            ) : (
              snapshot.eventGaps.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="block rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{event.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {event.venueName} · {event.city}, {event.state} · {formatDate(event.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
                      {event.issues.length} issues
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">{event.issues.join(" · ")}</p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Venue Data Gaps</h2>
              <p className="text-sm text-zinc-500">
                Room profiles that still need enough metadata to support booking and accessibility trust.
              </p>
            </div>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
              {snapshot.venueGaps.length} surfaced
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.venueGaps.length === 0 ? (
              <p className="text-sm text-zinc-500">No urgent venue metadata gaps found.</p>
            ) : (
              snapshot.venueGaps.map((venue) => (
                <Link
                  key={venue.id}
                  href={venue.href}
                  className="block rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{venue.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {venue.city}, {venue.state}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
                      {venue.issues.length} issues
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">{venue.issues.join(" · ")}</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent Imports</h2>
            <p className="text-sm text-zinc-500">
              Dry runs and committed imports captured through the existing analytics event stream.
            </p>
          </div>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
            {snapshot.recentImports.length} recent
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">When</th>
                <th className="pb-3 pr-4 font-medium">Mode</th>
                <th className="pb-3 pr-4 font-medium">Source</th>
                <th className="pb-3 pr-4 font-medium">Requested</th>
                <th className="pb-3 pr-4 font-medium">Writes</th>
                <th className="pb-3 pr-4 font-medium">Errors</th>
                <th className="pb-3 font-medium">Cities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {snapshot.recentImports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-zinc-500">
                    No import history captured yet.
                  </td>
                </tr>
              ) : (
                snapshot.recentImports.map((run) => (
                  <tr key={run.id}>
                    <td className="py-3 pr-4 text-zinc-300">{formatDate(run.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          run.action === "import_preview"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {run.action === "import_preview" ? "Dry run" : "Committed"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">{run.source}</td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {run.venuesRequested} venues / {run.eventsRequested} events
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {run.venueCreates + run.venueUpdates} venues / {run.eventCreates + run.eventUpdates} events
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {run.venueErrors + run.eventErrors}
                    </td>
                    <td className="py-3 text-zinc-400">
                      {run.targetCitiesTouched.length > 0 ? run.targetCitiesTouched.join(", ") : "None"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
