import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Industry Analytics | Punchline Atlas",
  description: "City-level comedy scene reports, trends, and market data.",
};

export default async function IndustryPage() {
  let reports: Array<{
    id: string;
    city: string;
    state: string;
    quarter: string;
    year: number;
    publishedAt: Date | null;
  }> = [];

  try {
    reports = await prisma.industryReport.findMany({
      select: { id: true, city: true, state: true, quarter: true, year: true, publishedAt: true },
      orderBy: [{ year: "desc" }, { quarter: "desc" }],
      take: 50,
    });
  } catch {
    // DB not configured
  }

  // Group reports by city
  const cityMap = new Map<string, typeof reports>();
  for (const r of reports) {
    const key = `${r.city}, ${r.state}`;
    if (!cityMap.has(key)) cityMap.set(key, []);
    cityMap.get(key)!.push(r);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Industry Analytics</h1>
          <p className="text-zinc-400 text-sm">
            City-level comedy scene reports, trends, and market insights.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No industry reports available yet.</p>
            <p className="text-sm mt-1">Reports are generated quarterly for active comedy markets.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(cityMap.entries()).map(([cityLabel, cityReports]) => {
              const latest = cityReports[0];
              return (
                <Link
                  key={cityLabel}
                  href={`/industry/${encodeURIComponent(latest.city.toLowerCase())}?state=${encodeURIComponent(latest.state)}`}
                  className="block p-5 rounded-xl bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/40 transition group"
                >
                  <h2 className="text-lg font-semibold text-white group-hover:text-brand-gold transition">
                    {cityLabel}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {cityReports.length} report{cityReports.length !== 1 ? "s" : ""} available
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Latest: {latest.quarter} ({latest.year})
                  </p>
                  <div className="mt-3 text-sm font-medium text-brand-gold group-hover:underline">
                    View Reports &rarr;
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
