"use client";

import { useEffect, useState } from "react";

type Tab = "performance" | "audience" | "revenue" | "benchmarks" | "industry";

interface PerformanceBit {
  bitTitle: string;
  avgLaughScore: number;
  performanceCount: number;
}

interface CityBreakdown {
  city: string;
  avgLaughScore: number;
  showCount: number;
  avgAudienceSize: number;
}

interface PerformanceReport {
  comedianId: string;
  totalPerformances: number;
  averageLaughScore: number;
  bestBits: PerformanceBit[];
  worstBits: PerformanceBit[];
  cityBreakdown: CityBreakdown[];
}

interface HeatmapLocation {
  city: string;
  state: string;
  fanCount: number;
  engagementScore: number;
}

interface HeatmapData {
  comedianId: string;
  totalFans: number;
  locations: HeatmapLocation[];
}

interface ForecastData {
  predictedSales: number;
  actualSales: number | null;
  confidenceScore: number;
  confidenceInterval: { low: number; high: number };
}

interface BenchmarkData {
  metric: string;
  value: number;
  period: string;
  percentileRank: number;
}

interface TrendData {
  category: string;
  metric: string;
  value: number;
  previousValue: number;
  changePercent: number;
  period: string;
}

interface AnalyticsDashboardProps {
  comedianId?: string;
  venueId?: string;
  eventId?: string;
}

export default function AnalyticsDashboard({
  comedianId,
  venueId,
  eventId,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("performance");
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        switch (activeTab) {
          case "performance":
            if (comedianId) {
              const res = await fetch(
                `/api/analytics/performance?comedianId=${comedianId}`
              );
              if (res.ok) setPerformance(await res.json());
            }
            break;
          case "audience":
            if (comedianId) {
              const res = await fetch(
                `/api/analytics/heatmap?comedianId=${comedianId}`
              );
              if (res.ok) setHeatmap(await res.json());
            }
            break;
          case "revenue":
            if (eventId) {
              const res = await fetch(
                `/api/analytics/forecast?eventId=${eventId}`
              );
              if (res.ok) setForecast(await res.json());
            }
            break;
          case "benchmarks":
            if (venueId) {
              const res = await fetch(
                `/api/analytics/benchmarks?venueId=${venueId}`
              );
              if (res.ok) setBenchmarks(await res.json());
            }
            break;
          case "industry":
            {
              const res = await fetch("/api/analytics/industry");
              if (res.ok) setTrends(await res.json());
            }
            break;
        }
      } catch {
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, comedianId, venueId, eventId]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "performance", label: "Performance" },
    { key: "audience", label: "Audience" },
    { key: "revenue", label: "Revenue" },
    { key: "benchmarks", label: "Benchmarks" },
    { key: "industry", label: "Industry" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg bg-brand-surface border border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-gold text-brand-dark"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="py-12 text-center text-zinc-500">
          Loading analytics...
        </div>
      )}
      {error && (
        <div className="py-4 px-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && !loading && performance && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
              <p className="text-2xl font-bold text-white">
                {performance.totalPerformances}
              </p>
              <p className="text-zinc-500 text-xs mt-1">Total Performances</p>
            </div>
            <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
              <p className="text-2xl font-bold text-brand-gold">
                {performance.averageLaughScore}
              </p>
              <p className="text-zinc-500 text-xs mt-1">Avg Laugh Score</p>
            </div>
            <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
              <p className="text-2xl font-bold text-white">
                {performance.cityBreakdown.length}
              </p>
              <p className="text-zinc-500 text-xs mt-1">Cities Performed</p>
            </div>
          </div>

          {/* Best Bits Table */}
          {performance.bestBits.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Top Bits by Laugh Score
              </h3>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-900/50">
                      <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                        Bit
                      </th>
                      <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                        Avg Score
                      </th>
                      <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                        Performances
                      </th>
                      <th className="px-4 py-2 text-zinc-400 font-medium">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.bestBits.map((bit, i) => (
                      <tr
                        key={bit.bitTitle}
                        className="border-t border-zinc-800"
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {bit.bitTitle}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              bit.avgLaughScore >= 80
                                ? "text-green-400"
                                : bit.avgLaughScore >= 60
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }`}
                          >
                            {bit.avgLaughScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400">
                          {bit.performanceCount}
                        </td>
                        <td className="px-4 py-3">
                          <SparklineBar
                            value={bit.avgLaughScore}
                            max={100}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* City Breakdown */}
          {performance.cityBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Performance by City
              </h3>
              <div className="space-y-2">
                {performance.cityBreakdown.map((city) => (
                  <div
                    key={city.city}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800"
                  >
                    <span className="text-white font-medium w-32 shrink-0">
                      {city.city}
                    </span>
                    <div className="flex-1">
                      <SparklineBar value={city.avgLaughScore} max={100} />
                    </div>
                    <span className="text-zinc-400 text-xs w-16 text-right">
                      Score: {city.avgLaughScore}
                    </span>
                    <span className="text-zinc-500 text-xs w-20 text-right">
                      {city.showCount} show{city.showCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === "audience" && !loading && heatmap && (
        <div className="space-y-6">
          <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
            <p className="text-3xl font-bold text-brand-gold">
              {heatmap.totalFans.toLocaleString()}
            </p>
            <p className="text-zinc-500 text-sm mt-1">Total Fans</p>
          </div>

          {heatmap.locations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Fan Density by Location
              </h3>
              <div className="space-y-2">
                {heatmap.locations.slice(0, 15).map((loc) => {
                  const maxFans = heatmap.locations[0]?.fanCount || 1;
                  const pct = Math.round((loc.fanCount / maxFans) * 100);
                  return (
                    <div
                      key={`${loc.city}-${loc.state}`}
                      className="flex items-center gap-3"
                    >
                      <span className="text-zinc-300 text-sm font-medium w-36 shrink-0">
                        {loc.city}, {loc.state}
                      </span>
                      <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-gold/60 to-brand-gold rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs w-16 text-right">
                        {loc.fanCount.toLocaleString()}
                      </span>
                      <span className="text-zinc-600 text-xs w-12 text-right">
                        {loc.engagementScore}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === "revenue" && !loading && (
        <div className="space-y-6">
          {forecast ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
                  <p className="text-2xl font-bold text-brand-gold">
                    {forecast.predictedSales}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">Predicted Sales</p>
                </div>
                <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
                  <p className="text-2xl font-bold text-white">
                    {forecast.actualSales !== null
                      ? forecast.actualSales
                      : "--"}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">Actual Sales</p>
                </div>
                <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {Math.round(forecast.confidenceScore * 100)}%
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">Confidence</p>
                </div>
                <div className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
                  <p className="text-lg font-bold text-zinc-300">
                    {forecast.confidenceInterval.low} -{" "}
                    {forecast.confidenceInterval.high}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Confidence Band
                  </p>
                </div>
              </div>

              {/* Forecast vs Actual Bar */}
              {forecast.actualSales !== null && (
                <div className="p-4 rounded-card bg-brand-surface border border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">
                    Forecast vs Actual
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>Predicted</span>
                        <span>{forecast.predictedSales}</span>
                      </div>
                      <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-gold/70 rounded-full"
                          style={{
                            width: `${Math.min((forecast.predictedSales / Math.max(forecast.predictedSales, forecast.actualSales!)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>Actual</span>
                        <span>{forecast.actualSales}</span>
                      </div>
                      <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500/70 rounded-full"
                          style={{
                            width: `${Math.min((forecast.actualSales! / Math.max(forecast.predictedSales, forecast.actualSales!)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-zinc-500">
              {eventId
                ? "No forecast data available for this event"
                : "Select an event to view revenue forecast"}
            </div>
          )}
        </div>
      )}

      {/* Benchmarks Tab */}
      {activeTab === "benchmarks" && !loading && (
        <div className="space-y-4">
          {benchmarks.length > 0 ? (
            benchmarks.map((b) => (
              <div
                key={`${b.metric}-${b.period}`}
                className="p-4 rounded-card bg-brand-surface border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium text-sm">
                    {formatMetricName(b.metric)}
                  </h4>
                  <span className="text-xs text-zinc-500">{b.period}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-white">
                    {b.value.toFixed(1)}
                  </span>
                  <div className="flex-1">
                    <PercentileBar percentile={b.percentileRank} />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      b.percentileRank >= 75
                        ? "text-green-400"
                        : b.percentileRank >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    P{Math.round(b.percentileRank)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-zinc-500">
              {venueId
                ? "No benchmark data available"
                : "Select a venue to view benchmarks"}
            </div>
          )}
        </div>
      )}

      {/* Industry Tab */}
      {activeTab === "industry" && !loading && (
        <div className="space-y-3">
          {trends.length > 0 ? (
            trends.map((t) => (
              <div
                key={`${t.category}-${t.metric}`}
                className="p-4 rounded-card bg-brand-surface border border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      {t.category}
                    </p>
                    <p className="text-white font-medium mt-0.5">
                      {formatMetricName(t.metric)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {t.value.toLocaleString()}
                    </p>
                    <p
                      className={`text-sm font-medium flex items-center gap-1 justify-end ${
                        t.changePercent > 0
                          ? "text-green-400"
                          : t.changePercent < 0
                            ? "text-red-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {t.changePercent > 0 ? (
                        <span>&#9650;</span>
                      ) : t.changePercent < 0 ? (
                        <span>&#9660;</span>
                      ) : (
                        <span>&#8212;</span>
                      )}
                      {Math.abs(t.changePercent)}%
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-zinc-500">
              No industry trend data available
            </div>
          )}
        </div>
      )}

      {/* Empty state when no ID provided for tabs that need one */}
      {activeTab === "performance" && !comedianId && !loading && (
        <div className="py-12 text-center text-zinc-500">
          Select a comedian to view performance analytics
        </div>
      )}
      {activeTab === "audience" && !comedianId && !loading && (
        <div className="py-12 text-center text-zinc-500">
          Select a comedian to view audience data
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SparklineBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 80
            ? "bg-green-500"
            : pct >= 60
              ? "bg-yellow-500"
              : "bg-red-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PercentileBar({ percentile }: { percentile: number }) {
  return (
    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          percentile >= 75
            ? "bg-green-500"
            : percentile >= 50
              ? "bg-yellow-500"
              : "bg-red-500"
        }`}
        style={{ width: `${percentile}%` }}
      />
    </div>
  );
}

function formatMetricName(metric: string): string {
  return metric
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
