"use client";

import { useEffect, useState } from "react";

interface Podcast {
  id: string;
  title: string;
  platform: string;
  subscriberCount: number;
  synced: boolean;
}

interface ConversionStats {
  totalClicks: number;
  totalPurchases: number;
  totalRevenue: number;
  conversionRate: number;
}

interface TopEpisode {
  id: string;
  title: string;
  totalPurchases: number;
  totalRevenue: number;
}

interface RecordingSession {
  id: string;
  eventId: string;
  status: string;
  audioQuality: string;
  createdAt: string;
}

export default function PodcastPipelineCard({
  comedianId,
}: {
  comedianId: string;
}) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [topEpisodes, setTopEpisodes] = useState<TopEpisode[]>([]);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [podRes, statsRes, sessionsRes] = await Promise.all([
          fetch(`/api/podcast-pipeline/podcasts?comedianId=${comedianId}`),
          fetch(`/api/podcast-pipeline/ticket-links?comedianId=${comedianId}`),
          fetch(`/api/podcast-pipeline/live-recording?comedianId=${comedianId}`),
        ]);

        if (podRes.ok) setPodcasts(await podRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
        if (sessionsRes.ok) setSessions(await sessionsRes.json());
      } catch {
        // silent fail — card shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [comedianId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-700 rounded w-full mb-2" />
        <div className="h-4 bg-gray-700 rounded w-3/4" />
      </div>
    );
  }

  const platformColors: Record<string, string> = {
    APPLE: "bg-purple-900 text-purple-300",
    SPOTIFY: "bg-green-900 text-green-300",
    YOUTUBE: "bg-red-900 text-red-300",
    RSS: "bg-orange-900 text-orange-300",
  };

  const statusColors: Record<string, string> = {
    PLANNED: "bg-blue-900 text-blue-300",
    RECORDING: "bg-red-900 text-red-300",
    POST_PRODUCTION: "bg-yellow-900 text-yellow-300",
    PUBLISHED: "bg-green-900 text-green-300",
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Podcast-to-Live Pipeline
      </h3>

      {/* Linked Podcasts */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Linked Podcasts
        </h4>
        {podcasts.length === 0 ? (
          <p className="text-sm text-gray-500">No podcasts linked yet.</p>
        ) : (
          <div className="space-y-2">
            {podcasts.map((pod) => (
              <div
                key={pod.id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${platformColors[pod.platform] ?? "bg-gray-700 text-gray-300"}`}
                  >
                    {pod.platform}
                  </span>
                  <span className="text-sm text-white">{pod.title}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {pod.subscriberCount.toLocaleString()} subscribers
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      {stats && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Conversion Funnel
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {stats.totalClicks.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Clicks</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {stats.totalPurchases.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Purchases</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                ${stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Revenue</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Conversion rate: {(stats.conversionRate * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {/* Top Converting Episodes */}
      {topEpisodes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Top Converting Episodes
          </h4>
          <div className="space-y-1">
            {topEpisodes.map((ep, i) => (
              <div
                key={ep.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300">
                  {i + 1}. {ep.title}
                </span>
                <span className="text-green-400">
                  {ep.totalPurchases} sales (${ep.totalRevenue})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Recording Schedule */}
      {sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Live Recording Schedule
          </h4>
          <div className="space-y-2">
            {sessions.map((ses) => (
              <div
                key={ses.id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ses.status] ?? "bg-gray-700 text-gray-300"}`}
                  >
                    {ses.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {ses.audioQuality}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(ses.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
