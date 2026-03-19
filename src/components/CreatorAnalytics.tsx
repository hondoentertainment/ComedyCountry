"use client";

import { useState, useEffect, useCallback } from "react";

type ViewTrend = { date: string; views: number };
type AudienceGrowthPoint = { date: string; followers: number; newFollowers: number };

type OverviewStats = {
  totalViews: number;
  totalFollowers: number;
  totalRevenue: number;
  engagementRate: number;
  viewsChange: number;
  followersChange: number;
  revenueChange: number;
  engagementChange: number;
  topClips: Array<{
    id: string;
    title: string | null;
    views: number;
    likes: number;
    shares: number;
  }>;
  topEvents: Array<{
    id: string;
    title: string | null;
    date: string;
    ticketsSold: number;
    revenue: number;
  }>;
};

type ContentPerformance = {
  id: string;
  title: string;
  type: string;
  views: number;
  engagementScore: number;
  publishedAt: string;
};

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-zinc-500 text-xs ml-1">--</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs ml-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number;
}) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline mt-1">
        <p className="text-white text-2xl font-bold">{value}</p>
        {change !== undefined && <ChangeIndicator value={change} />}
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
  labelKey,
  valueKey,
  maxBars = 14,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  maxBars?: number;
}) {
  const sliced = data.slice(-maxBars);
  const maxVal = Math.max(1, ...sliced.map((d) => Number(d[valueKey]) || 0));

  return (
    <div className="flex items-end gap-0.5 h-20">
      {sliced.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const height = (val / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full bg-brand-gold/80 rounded-t-sm transition-all duration-300 min-h-[2px]"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item[labelKey]}: ${val}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function CreatorAnalytics() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [viewTrends, setViewTrends] = useState<ViewTrend[]>([]);
  const [followerGrowth, setFollowerGrowth] = useState<AudienceGrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewPeriod, setViewPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, viewsRes] = await Promise.all([
        fetch("/api/creator/analytics"),
        fetch(`/api/creator/analytics/views?period=${viewPeriod}&days=30`),
      ]);

      if (!overviewRes.ok) {
        throw new Error("Failed to load analytics");
      }

      const overviewData = await overviewRes.json();
      setOverview(overviewData);

      if (viewsRes.ok) {
        const viewsData = await viewsRes.json();
        setViewTrends(viewsData.trends ?? []);
      }

      // Follower growth from the audience growth in the summary
      try {
        const summaryRes = await fetch("/api/creator-intelligence/audience");
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.audienceGrowth) {
            setFollowerGrowth(summaryData.audienceGrowth);
          }
        }
      } catch {
        // optional data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [viewPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-brand-surface border border-zinc-800 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-16 mb-2" />
              <div className="h-7 bg-zinc-800 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800 animate-pulse h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-red-800/50 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Views"
          value={formatNumber(overview.totalViews)}
          change={overview.viewsChange}
        />
        <StatCard
          label="Followers"
          value={formatNumber(overview.totalFollowers)}
          change={overview.followersChange}
        />
        <StatCard
          label="Revenue (30d)"
          value={`$${overview.totalRevenue.toFixed(2)}`}
          change={overview.revenueChange}
        />
        <StatCard
          label="Engagement Rate"
          value={`${overview.engagementRate}%`}
          change={overview.engagementChange}
        />
      </div>

      {/* View trends chart */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Views Over Time</h3>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setViewPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewPeriod === p
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {viewTrends.length > 0 ? (
          <MiniBarChart data={viewTrends} labelKey="date" valueKey="views" />
        ) : (
          <p className="text-zinc-500 text-sm text-center py-8">No view data available yet.</p>
        )}
        {viewTrends.length > 0 && (
          <div className="flex justify-between text-xs text-zinc-600 mt-2">
            <span>{viewTrends[0]?.date}</span>
            <span>{viewTrends[viewTrends.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Follower growth chart */}
      {followerGrowth.length > 0 && (
        <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
          <h3 className="text-white font-semibold mb-4">Follower Growth</h3>
          <MiniBarChart data={followerGrowth} labelKey="date" valueKey="newFollowers" />
          <div className="flex justify-between text-xs text-zinc-600 mt-2">
            <span>{followerGrowth[0]?.date}</span>
            <span>
              Total: {followerGrowth[followerGrowth.length - 1]?.followers ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* Content performance table */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Top Clips</h3>
        {overview.topClips.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">No clips yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="text-left py-2 pr-4">Title</th>
                  <th className="text-right py-2 px-3">Views</th>
                  <th className="text-right py-2 px-3">Likes</th>
                  <th className="text-right py-2 pl-3">Shares</th>
                </tr>
              </thead>
              <tbody>
                {overview.topClips.map((clip) => (
                  <tr key={clip.id} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 text-white truncate max-w-[200px]">
                      {clip.title || "Untitled"}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-300">{formatNumber(clip.views)}</td>
                    <td className="text-right py-2 px-3 text-zinc-300">{formatNumber(clip.likes)}</td>
                    <td className="text-right py-2 pl-3 text-zinc-300">{formatNumber(clip.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top events */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Recent Events</h3>
        {overview.topEvents.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">No event data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="text-left py-2 pr-4">Event</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Tickets</th>
                  <th className="text-right py-2 pl-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {overview.topEvents.map((event) => (
                  <tr key={event.id} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 text-white truncate max-w-[200px]">
                      {event.title || "Untitled Event"}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-300">{event.ticketsSold}</td>
                    <td className="text-right py-2 pl-3 text-brand-gold font-medium">
                      ${event.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
