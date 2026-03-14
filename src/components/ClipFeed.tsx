"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ClipCard } from "./ClipCard";

type Clip = {
  id: string;
  title?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration: number;
  comedian?: { id: string; name: string; slug: string } | null;
  likeCount: number;
  shareCount: number;
  commentCount: number;
  eventId?: string | null;
};

type FeedTab = "foryou" | "trending" | "following" | "challenges";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "foryou", label: "For You" },
  { key: "trending", label: "Trending" },
  { key: "following", label: "Following" },
  { key: "challenges", label: "Challenges" },
];

export function ClipFeed() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const loadingRef = useRef(false);
  loadingRef.current = loading;

  const fetchClips = useCallback(
    async (pageNum: number, replace = false) => {
      if (loadingRef.current) return;
      setLoading(true);

      try {
        const sortMap: Record<FeedTab, string> = {
          foryou: "engagement",
          trending: "views",
          following: "recent",
          challenges: "recent",
        };

        const params = new URLSearchParams({
          page: pageNum.toString(),
          pageSize: "20",
          sort: sortMap[activeTab],
        });

        const res = await fetch(`/api/clips?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        if (replace) {
          setClips(data.clips);
        } else {
          setClips((prev) => [...prev, ...data.clips]);
        }

        setHasMore(data.clips.length === data.pageSize && data.total > pageNum * data.pageSize);
      } catch {
        // Silently handle fetch errors
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  // Reset and fetch on tab change
  useEffect(() => {
    setClips([]);
    setPage(1);
    setHasMore(true);
    fetchClips(1, true);
  }, [activeTab, fetchClips]);

  // Infinite scroll observer
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchClips(nextPage);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchClips]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-800 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-brand-gold text-brand-gold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Clip grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            id={clip.id}
            title={clip.title}
            videoUrl={clip.videoUrl}
            thumbnailUrl={clip.thumbnailUrl}
            duration={clip.duration}
            comedian={clip.comedian}
            likeCount={clip.likeCount}
            shareCount={clip.shareCount}
            commentCount={clip.commentCount}
            eventId={clip.eventId}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && clips.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-lg">No clips yet.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Be the first to share a comedy moment!
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-4" />
    </div>
  );
}
