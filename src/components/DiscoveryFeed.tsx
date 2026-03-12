"use client";

import { useState, useEffect, useCallback } from "react";

type BuzzLevel = "LOW" | "MEDIUM" | "HIGH" | "VIRAL";

type SocialProof = {
  friendsAttending: number;
  totalAttending: number;
  trendingScore: number;
  buzzLevel: BuzzLevel;
};

type FeedItem = {
  entityType: string;
  entityId: string;
  score: number;
  title: string;
  subtitle?: string;
  socialProof?: SocialProof;
  insight?: string;
  boostApplied?: boolean;
};

type FeedTab = "for-you" | "tonight" | "trending" | "friends";

const TABS: { key: FeedTab; label: string; endpoint: string }[] = [
  { key: "for-you", label: "For You", endpoint: "/api/discovery/for-you" },
  { key: "tonight", label: "Tonight", endpoint: "/api/discovery/tonight" },
  { key: "trending", label: "Trending", endpoint: "/api/discovery/trending-nearby" },
  { key: "friends", label: "Friends Going", endpoint: "/api/discovery/friends-going" },
];

const BUZZ_FLAMES: Record<BuzzLevel, string> = {
  LOW: "",
  MEDIUM: "Warming up",
  HIGH: "Hot",
  VIRAL: "On Fire",
};

const BUZZ_COLORS: Record<BuzzLevel, string> = {
  LOW: "text-gray-400",
  MEDIUM: "text-yellow-500",
  HIGH: "text-orange-500",
  VIRAL: "text-red-500",
};

export function DiscoveryFeed() {
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const fetchFeed = useCallback(async (tab: FeedTab) => {
    setLoading(true);
    try {
      const tabConfig = TABS.find((t) => t.key === tab)!;
      let url = tabConfig.endpoint;

      if (tab === "trending") {
        // Try to get user location
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          url += `?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
        } catch {
          // Default to Nashville
          url += "?lat=36.16&lng=-86.78";
        }
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch feed");

      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(activeTab);
  }, [activeTab, fetchFeed]);

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    setExpandedInsight(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-32"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Nothing here yet</p>
          <p className="text-sm mt-1">
            {activeTab === "friends"
              ? "Follow some comedy fans to see where they're going!"
              : "Check back soon for personalized recommendations."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.entityId}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                {/* Score Badge */}
                <div className="ml-3 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-400">
                    {Math.round(item.score)}% match
                  </span>
                </div>
              </div>

              {/* Social Proof Badge */}
              {item.socialProof && (
                <div className="flex items-center gap-3 mt-3">
                  {item.socialProof.friendsAttending > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {item.socialProof.friendsAttending} friend{item.socialProof.friendsAttending !== 1 ? "s" : ""} going
                    </span>
                  )}

                  {item.socialProof.totalAttending > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.socialProof.totalAttending} attending
                    </span>
                  )}

                  {/* Buzz Level Indicator */}
                  {item.socialProof.buzzLevel !== "LOW" && (
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${BUZZ_COLORS[item.socialProof.buzzLevel]}`}>
                      <BuzzFlames level={item.socialProof.buzzLevel} />
                      {BUZZ_FLAMES[item.socialProof.buzzLevel]}
                    </span>
                  )}
                </div>
              )}

              {/* Boost Indicator */}
              {item.boostApplied && (
                <span className="inline-flex items-center mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Featured
                </span>
              )}

              {/* Discovery Insight / Why This */}
              {item.insight && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      setExpandedInsight(
                        expandedInsight === item.entityId ? null : item.entityId,
                      )
                    }
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {expandedInsight === item.entityId ? "Hide" : "Why this?"}
                  </button>
                  {expandedInsight === item.entityId && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 rounded-lg p-2">
                      {item.insight}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buzz Flames SVG Component                                                 */
/* -------------------------------------------------------------------------- */

function BuzzFlames({ level }: { level: BuzzLevel }) {
  const count = level === "VIRAL" ? 3 : level === "HIGH" ? 2 : 1;

  return (
    <span className="inline-flex">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className="w-4 h-4 -ml-0.5 first:ml-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            clipRule="evenodd"
          />
        </svg>
      ))}
    </span>
  );
}
