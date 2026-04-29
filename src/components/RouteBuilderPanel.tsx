"use client";

import { useEffect, useState } from "react";

type RouteBuilderReport = {
  comedian: { id: string; name: string; genres: string[] };
  generatedAt: string;
  topRevenueSources: Array<{ source: string; total: number }>;
  podcastConversion: {
    totalClicks: number;
    totalPurchases: number;
    totalRevenue: number;
    conversionRate: number;
  };
  topEpisodes: Array<{ id: string; title: string; totalPurchases: number; totalRevenue: number }>;
  candidates: Array<{
    city: { slug: string; label: string; shortLabel: string };
    score: number;
    audienceStrength: number;
    podcastLift: number;
    sceneScore: number;
    averageTicketPrice: number;
    routeReason: string;
    recommendedVenues: Array<{
      id: string;
      name: string;
      type: string;
      capacity: number | null;
      upcomingShows: number;
      fairShows: number;
    }>;
  }>;
};

export function RouteBuilderPanel() {
  const [report, setReport] = useState<RouteBuilderReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creator/route-builder");
        if (!res.ok) throw new Error("Failed");
        setReport(await res.json());
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-zinc-800" />
          <div className="h-20 rounded bg-zinc-800" />
          <div className="h-20 rounded bg-zinc-800" />
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-6">
        <h2 className="text-lg font-semibold text-white">Route builder</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Route intelligence will appear here once your comedian profile and booking data are available.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Route builder / booking intelligence</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Prioritize the next room and city using scene depth, audience strength, and podcast-to-ticket signal.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Podcast clicks</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {report.podcastConversion.totalClicks.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ticket purchases</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {report.podcastConversion.totalPurchases.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Attributed revenue</p>
          <p className="mt-2 text-2xl font-bold text-brand-gold">
            ${report.podcastConversion.totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {report.candidates.slice(0, 3).map((candidate) => (
            <article
              key={candidate.city.slug}
              className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{candidate.city.label}</p>
                  <p className="mt-1 text-sm text-zinc-400">{candidate.routeReason}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Route score</p>
                  <p className="mt-1 text-xl font-bold text-brand-gold">{Math.round(candidate.score)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  Scene {Math.round(candidate.sceneScore)}
                </span>
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  Audience {Math.round(candidate.audienceStrength)}
                </span>
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                  Podcast {Math.round(candidate.podcastLift)}
                </span>
                {candidate.averageTicketPrice > 0 && (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                    Avg ticket ${candidate.averageTicketPrice.toFixed(0)}
                  </span>
                )}
              </div>

              {candidate.recommendedVenues.length > 0 && (
                <div className="mt-3 space-y-2">
                  {candidate.recommendedVenues.slice(0, 3).map((venue) => (
                    <div
                      key={venue.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{venue.name}</p>
                        <p className="text-xs text-zinc-500">
                          {venue.type} · {venue.upcomingShows} tracked shows
                        </p>
                      </div>
                      {venue.fairShows > 0 && (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                          {venue.fairShows} fair-ticketed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
            <h3 className="text-sm font-semibold text-white">Top revenue sources</h3>
            <div className="mt-3 space-y-2 text-sm">
              {report.topRevenueSources.length === 0 ? (
                <p className="text-zinc-500">No attributed revenue yet.</p>
              ) : (
                report.topRevenueSources.map((source) => (
                  <div key={source.source} className="flex items-center justify-between">
                    <span className="text-zinc-400">{source.source}</span>
                    <span className="font-medium text-white">${source.total.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
            <h3 className="text-sm font-semibold text-white">Top converting episodes</h3>
            <div className="mt-3 space-y-3 text-sm">
              {report.topEpisodes.length === 0 ? (
                <p className="text-zinc-500">No episode attribution yet.</p>
              ) : (
                report.topEpisodes.slice(0, 3).map((episode) => (
                  <div key={episode.id}>
                    <p className="font-medium text-white">{episode.title}</p>
                    <p className="mt-1 text-zinc-500">
                      {episode.totalPurchases} purchase{episode.totalPurchases === 1 ? "" : "s"} · $
                      {episode.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

