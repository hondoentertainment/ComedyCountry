"use client";

import { useEffect, useState } from "react";

type Tab = "revenue" | "audience" | "content" | "milestones" | "financial";

interface RevenueData {
  attributions: Array<{
    id: string;
    sourceType: string;
    sourceId: string | null;
    revenueType: string;
    amount: number;
    attributedAt: string;
  }>;
  bySource: Record<string, Record<string, number>>;
}

interface AudienceData {
  totalFollowers: number;
  avgEngagement: number;
  platformBreakdown: Array<{
    platform: string;
    followerCount: number | null;
    engagementRate: number | null;
    lastSyncedAt: string;
  }>;
}

interface OverlapData {
  totalRecords: number;
  overlappingUsers: number;
  platformPairs: Record<string, number>;
}

interface ContentItem {
  id: string;
  contentId: string;
  title: string;
  platforms: string[];
  scheduledAt: string | null;
  distributedAt: string | null;
  performanceByPlatform: Record<string, { views?: number; likes?: number; shares?: number }> | null;
}

interface Milestone {
  id: string;
  milestone: string;
  achievedAt: string;
  metric: string;
  value: number;
  previousBest: number | null;
}

interface FinancialSummaryData {
  period: string;
  ticketRevenue: number;
  merchRevenue: number;
  tipRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  expenses: number | null;
  netIncome: number | null;
  taxEstimate: number | null;
}

interface ForecastData {
  forecast: Array<{ month: number; projected: number }>;
  trend: string;
  averageMonthlyRevenue: number;
  avgGrowthRate?: number;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "audience", label: "Audience" },
  { key: "content", label: "Content" },
  { key: "milestones", label: "Milestones" },
  { key: "financial", label: "Financial" },
];

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function CreatorIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");
  const [loading, setLoading] = useState(false);

  // Data states
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [audienceData, setAudienceData] = useState<AudienceData | null>(null);
  const [overlapData, setOverlapData] = useState<OverlapData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [financialSummaries, setFinancialSummaries] = useState<FinancialSummaryData[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    async function fetchData() {
      try {
        switch (activeTab) {
          case "revenue": {
            const res = await fetch("/api/creator-intelligence/revenue", {
              signal: controller.signal,
            });
            if (res.ok) setRevenueData(await res.json());
            break;
          }
          case "audience": {
            const [audRes, overRes] = await Promise.all([
              fetch("/api/creator-intelligence/audience", { signal: controller.signal }),
              fetch("/api/creator-intelligence/audience/overlap", { signal: controller.signal }),
            ]);
            if (audRes.ok) setAudienceData(await audRes.json());
            if (overRes.ok) setOverlapData(await overRes.json());
            break;
          }
          case "milestones": {
            const res = await fetch("/api/creator-intelligence/milestones", {
              signal: controller.signal,
            });
            if (res.ok) setMilestones(await res.json());
            break;
          }
          case "financial": {
            const [sumRes, foreRes] = await Promise.all([
              fetch("/api/creator-intelligence/financial", { signal: controller.signal }),
              fetch("/api/creator-intelligence/financial/forecast", { signal: controller.signal }),
            ]);
            if (sumRes.ok) {
              const data = await sumRes.json();
              setFinancialSummaries(Array.isArray(data) ? data : [data]);
            }
            if (foreRes.ok) setForecast(await foreRes.json());
            break;
          }
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-900 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-gold text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-20 rounded-xl bg-zinc-800" />
          <div className="h-20 rounded-xl bg-zinc-800" />
        </div>
      )}

      {/* Revenue Tab */}
      {!loading && activeTab === "revenue" && (
        <div className="space-y-4">
          {revenueData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total Attributions"
                  value={revenueData.attributions.length}
                />
                <StatCard
                  label="Total Revenue"
                  value={formatCurrency(
                    revenueData.attributions.reduce((s, a) => s + a.amount, 0),
                  )}
                />
                <StatCard
                  label="Revenue Sources"
                  value={Object.keys(revenueData.bySource).length}
                />
              </div>

              {/* Source breakdown */}
              {Object.keys(revenueData.bySource).length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-400">Revenue by Source</h3>
                  {Object.entries(revenueData.bySource).map(([source, types]) => (
                    <div
                      key={source}
                      className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                    >
                      <h4 className="font-medium text-white">{source}</h4>
                      <div className="mt-2 flex gap-4 text-sm text-zinc-400">
                        {Object.entries(types).map(([type, amount]) => (
                          <span key={type}>
                            {type}: {formatCurrency(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No revenue attributions yet. Start tracking which content drives revenue." />
              )}

              {/* Recent attributions table */}
              {revenueData.attributions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400">Recent Attributions</h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-900 text-zinc-400">
                        <tr>
                          <th className="px-4 py-2 text-left">Source</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.attributions.slice(0, 20).map((a) => (
                          <tr key={a.id} className="border-t border-zinc-800">
                            <td className="px-4 py-2 text-white">{a.sourceType}</td>
                            <td className="px-4 py-2 text-zinc-400">{a.revenueType}</td>
                            <td className="px-4 py-2 text-right text-white">
                              {formatCurrency(a.amount)}
                            </td>
                            <td className="px-4 py-2 text-zinc-500">
                              {new Date(a.attributedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No revenue data available." />
          )}
        </div>
      )}

      {/* Audience Tab */}
      {!loading && activeTab === "audience" && (
        <div className="space-y-4">
          {audienceData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total Followers"
                  value={formatNumber(audienceData.totalFollowers)}
                />
                <StatCard
                  label="Avg Engagement"
                  value={`${audienceData.avgEngagement.toFixed(1)}%`}
                />
                <StatCard
                  label="Platforms"
                  value={audienceData.platformBreakdown.length}
                />
              </div>

              {/* Platform breakdown */}
              {audienceData.platformBreakdown.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-400">Platform Breakdown</h3>
                  {audienceData.platformBreakdown.map((p) => (
                    <div
                      key={p.platform}
                      className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                    >
                      <div>
                        <h4 className="font-medium text-white">{p.platform}</h4>
                        <p className="mt-1 text-xs text-zinc-400">
                          {p.engagementRate != null
                            ? `${p.engagementRate.toFixed(1)}% engagement`
                            : "No engagement data"}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-white">
                        {p.followerCount != null ? formatNumber(p.followerCount) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No audience data synced yet." />
              )}

              {/* Overlap */}
              {overlapData && overlapData.overlappingUsers > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400">Audience Overlap</h3>
                  <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4">
                    <p className="text-white">
                      <span className="text-2xl font-bold text-brand-gold">
                        {overlapData.overlappingUsers}
                      </span>{" "}
                      users found across multiple platforms
                    </p>
                    {Object.entries(overlapData.platformPairs).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(overlapData.platformPairs).map(([pair, count]) => (
                          <span
                            key={pair}
                            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                          >
                            {pair}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No audience data available." />
          )}
        </div>
      )}

      {/* Content Tab */}
      {!loading && activeTab === "content" && (
        <ContentTab />
      )}

      {/* Milestones Tab */}
      {!loading && activeTab === "milestones" && (
        <div className="space-y-4">
          {milestones.length > 0 ? (
            <div className="space-y-3">
              <StatCard label="Total Milestones" value={milestones.length} />
              <div className="relative border-l-2 border-zinc-700 pl-6 space-y-6">
                {milestones.map((m) => (
                  <div key={m.id} className="relative">
                    <div className="absolute -left-[31px] h-4 w-4 rounded-full bg-brand-gold" />
                    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4">
                      <h4 className="font-medium text-white">{m.milestone}</h4>
                      <div className="mt-1 flex gap-4 text-xs text-zinc-400">
                        <span>Metric: {m.metric}</span>
                        <span>Value: {m.value.toLocaleString()}</span>
                        {m.previousBest != null && (
                          <span>Previous: {m.previousBest.toLocaleString()}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(m.achievedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No milestones recorded yet. Keep growing!" />
          )}
        </div>
      )}

      {/* Financial Tab */}
      {!loading && activeTab === "financial" && (
        <div className="space-y-4">
          {financialSummaries.length > 0 ? (
            <>
              {/* Latest summary */}
              {financialSummaries[0] && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Ticket Revenue"
                    value={formatCurrency(financialSummaries[0].ticketRevenue)}
                  />
                  <StatCard
                    label="Merch Revenue"
                    value={formatCurrency(financialSummaries[0].merchRevenue)}
                  />
                  <StatCard
                    label="Tips"
                    value={formatCurrency(financialSummaries[0].tipRevenue)}
                  />
                  <StatCard
                    label="Total Revenue"
                    value={formatCurrency(financialSummaries[0].totalRevenue)}
                  />
                </div>
              )}

              {/* Tax estimate */}
              {financialSummaries[0]?.taxEstimate != null && (
                <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-4">
                  <p className="text-sm text-amber-400">
                    Estimated tax liability:{" "}
                    <span className="font-semibold">
                      {formatCurrency(financialSummaries[0].taxEstimate)}
                    </span>
                  </p>
                </div>
              )}

              {/* Forecast */}
              {forecast && forecast.forecast.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400">Revenue Forecast</h3>
                  <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          forecast.trend === "growing"
                            ? "bg-green-900/40 text-green-400"
                            : forecast.trend === "declining"
                              ? "bg-red-900/40 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {forecast.trend}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Avg monthly: {formatCurrency(forecast.averageMonthlyRevenue)}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {forecast.forecast.map((f) => (
                        <div key={f.month} className="rounded-lg bg-zinc-800/50 p-3">
                          <p className="text-xs text-zinc-400">Month +{f.month}</p>
                          <p className="text-lg font-semibold text-white">
                            {formatCurrency(f.projected)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Period history */}
              {financialSummaries.length > 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400">Period History</h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-900 text-zinc-400">
                        <tr>
                          <th className="px-4 py-2 text-left">Period</th>
                          <th className="px-4 py-2 text-right">Tickets</th>
                          <th className="px-4 py-2 text-right">Merch</th>
                          <th className="px-4 py-2 text-right">Tips</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialSummaries.map((s) => (
                          <tr key={s.period} className="border-t border-zinc-800">
                            <td className="px-4 py-2 text-white">{s.period}</td>
                            <td className="px-4 py-2 text-right text-zinc-400">
                              {formatCurrency(s.ticketRevenue)}
                            </td>
                            <td className="px-4 py-2 text-right text-zinc-400">
                              {formatCurrency(s.merchRevenue)}
                            </td>
                            <td className="px-4 py-2 text-right text-zinc-400">
                              {formatCurrency(s.tipRevenue)}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-white">
                              {formatCurrency(s.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No financial summaries generated yet." />
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Content Tab (separate to manage its own state) ---- */

function ContentTab() {
  const [contentItems] = useState<ContentItem[]>([]);

  return (
    <div className="space-y-4">
      {contentItems.length > 0 ? (
        <div className="space-y-3">
          <StatCard label="Distributed Content" value={contentItems.length} />
          {contentItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(item.platforms as string[]).map((p: string) => (
                      <span
                        key={p}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                {item.distributedAt ? (
                  <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    distributed
                  </span>
                ) : item.scheduledAt ? (
                  <span className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                    scheduled
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                    draft
                  </span>
                )}
              </div>
              {item.performanceByPlatform && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {Object.entries(item.performanceByPlatform).map(([platform, perf]) => (
                    <div key={platform} className="rounded-lg bg-zinc-800/50 p-2">
                      <p className="text-xs text-zinc-400">{platform}</p>
                      <div className="flex gap-3 text-xs text-zinc-300 mt-1">
                        {perf.views != null && <span>{formatNumber(perf.views)} views</span>}
                        {perf.likes != null && <span>{formatNumber(perf.likes)} likes</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No content distributed yet. Schedule your first cross-platform post." />
      )}
    </div>
  );
}

/* ---- Shared sub-components ---- */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-12 text-center">
      <p className="text-zinc-500">{message}</p>
    </div>
  );
}
