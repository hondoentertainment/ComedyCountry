import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "City Report | Punchline Atlas",
};

type PageProps = {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ state?: string }>;
};

type Metrics = {
  totalShows: number;
  venueCount: number;
  avgTicketPrice: number;
  topComedians: Array<{ id: string; name: string; showCount: number }>;
};

export default async function CityReportPage({ params, searchParams }: PageProps) {
  const { city } = await params;
  const { state } = await searchParams;

  let reports: Array<{
    id: string;
    city: string;
    state: string;
    quarter: string;
    year: number;
    metrics: string;
    publishedAt: Date | null;
  }> = [];

  try {
    const where: Record<string, unknown> = {
      city: { equals: decodeURIComponent(city), mode: "insensitive" },
    };
    if (state) where.state = { equals: state, mode: "insensitive" };

    reports = await prisma.industryReport.findMany({
      where,
      orderBy: [{ year: "desc" }, { quarter: "desc" }],
    });
  } catch {
    // DB not configured
  }

  if (reports.length === 0) return notFound();

  const latest = reports[0];
  let metrics: Metrics = { totalShows: 0, venueCount: 0, avgTicketPrice: 0, topComedians: [] };
  try {
    metrics = JSON.parse(latest.metrics);
  } catch {
    // invalid metrics
  }

  const cityName = latest.city.charAt(0).toUpperCase() + latest.city.slice(1);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            {cityName}, {latest.state} &mdash; Comedy Scene Report
          </h1>
          <p className="text-zinc-400 text-sm">
            {latest.quarter} ({latest.year})
            {latest.publishedAt && (
              <> &middot; Published {new Date(latest.publishedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">{metrics.totalShows}</p>
            <p className="text-sm text-zinc-400 mt-1">Total Shows</p>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">{metrics.venueCount}</p>
            <p className="text-sm text-zinc-400 mt-1">Venues</p>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">
              ${metrics.avgTicketPrice.toFixed(2)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">Avg Ticket Price</p>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">
              {metrics.topComedians?.length ?? 0}
            </p>
            <p className="text-sm text-zinc-400 mt-1">Top Comedians Tracked</p>
          </div>
        </div>

        {/* Bar chart visualization (styled divs) */}
        {metrics.topComedians && metrics.topComedians.length > 0 && (
          <div className="p-6 rounded-xl bg-brand-surface border border-zinc-800/80 mb-10">
            <h2 className="text-lg font-semibold text-white mb-5">Top Comedians by Show Count</h2>
            <div className="space-y-3">
              {metrics.topComedians.map((comedian) => {
                const maxCount = metrics.topComedians[0]?.showCount || 1;
                const pct = Math.round((comedian.showCount / maxCount) * 100);
                return (
                  <div key={comedian.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{comedian.name}</span>
                      <span className="text-xs text-zinc-500">{comedian.showCount} shows</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-gold rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Historical reports */}
        {reports.length > 1 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Historical Reports</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reports.slice(1).map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-brand-surface border border-zinc-800/80"
                >
                  <p className="text-white font-medium">{r.quarter}</p>
                  <p className="text-sm text-zinc-400">{r.year}</p>
                  {r.publishedAt && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Published {new Date(r.publishedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
