"use client";

import { useState, useEffect } from "react";

type AudienceData = {
  cities: Array<{ city: string; state: string; count: number; percentage: number }>;
  ageRanges: Array<{ range: string; count: number; percentage: number }>;
  comedyPreferences: Array<{ genre: string; count: number; percentage: number }>;
  platforms: Array<{ platform: string; followers: number; engagementRate: number }>;
};

function BarRow({
  label,
  value,
  maxValue,
  suffix = "",
}: {
  label: string;
  value: number;
  maxValue: number;
  suffix?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-400 text-xs">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-gold rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  followers,
  engagementRate,
}: {
  platform: string;
  followers: number;
  engagementRate: number;
}) {
  const platformIcons: Record<string, string> = {
    TIKTOK: "TikTok",
    INSTAGRAM: "Instagram",
    YOUTUBE: "YouTube",
    PODCAST: "Podcast",
    TICKET_BUYER: "Ticket Buyers",
    MERCH_BUYER: "Merch Buyers",
  };

  return (
    <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
      <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">
        {platformIcons[platform] ?? platform}
      </p>
      <p className="text-white text-lg font-bold">
        {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}
      </p>
      <p className="text-zinc-500 text-xs mt-0.5">
        {engagementRate > 0 ? `${(engagementRate * 100).toFixed(1)}% engagement` : "No engagement data"}
      </p>
    </div>
  );
}

export default function CreatorAudienceInsights({ comedianId }: { comedianId?: string }) {
  const [data, setData] = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudience() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/creator/analytics/audience");
        if (!res.ok) throw new Error("Failed to load audience data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audience insights");
      } finally {
        setLoading(false);
      }
    }
    fetchAudience();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg bg-brand-surface border border-zinc-800 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-red-800/50 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const maxCityCount = Math.max(1, ...data.cities.map((c) => c.count));
  const maxAgeCount = Math.max(1, ...data.ageRanges.map((a) => a.count));

  return (
    <div className="space-y-6">
      {/* City distribution */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Top Cities</h3>
        {data.cities.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">No location data available yet.</p>
        ) : (
          <div className="space-y-3">
            {data.cities.map((city) => (
              <BarRow
                key={`${city.city}-${city.state}`}
                label={`${city.city}, ${city.state}`}
                value={city.count}
                maxValue={maxCityCount}
                suffix={` (${city.percentage}%)`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Age ranges */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Age Distribution</h3>
        {data.ageRanges.every((a) => a.count === 0) ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Age demographics will populate as your audience grows.
          </p>
        ) : (
          <div className="space-y-3">
            {data.ageRanges.map((range) => (
              <BarRow
                key={range.range}
                label={range.range}
                value={range.count}
                maxValue={maxAgeCount}
                suffix={` (${range.percentage}%)`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comedy preferences */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Comedy Preferences</h3>
        {data.comedyPreferences.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            No comedy preference data yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.comedyPreferences.map((pref) => (
              <div
                key={pref.genre}
                className="px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20"
              >
                <span className="text-brand-gold text-sm font-medium capitalize">
                  {pref.genre}
                </span>
                <span className="text-zinc-500 text-xs ml-1.5">{pref.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform breakdown */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-white font-semibold mb-4">Platform Audience</h3>
        {data.platforms.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Connect your social platforms to see audience data across channels.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.platforms.map((p) => (
              <PlatformCard
                key={p.platform}
                platform={p.platform}
                followers={p.followers}
                engagementRate={p.engagementRate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
