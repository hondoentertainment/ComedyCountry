"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ClipPlayer, type ClipPlayerProps } from "@/components/ClipPlayer";

type FeedClip = Omit<ClipPlayerProps, "autoPlay" | "onEnded">;

type FeedFilter = "foryou" | "trending" | "latest";

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "foryou", label: "For You" },
  { key: "trending", label: "Trending" },
  { key: "latest", label: "Latest" },
];

export default function ClipFeedPage() {
  const [clips, setClips] = useState<FeedClip[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<FeedFilter>("foryou");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const clipRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchClips = useCallback(
    async (pageNum: number, replace = false) => {
      setLoading(true);
      try {
        const sortMap: Record<FeedFilter, string> = {
          foryou: "engagement",
          trending: "views",
          latest: "recent",
        };

        const params = new URLSearchParams({
          page: pageNum.toString(),
          pageSize: "10",
          sort: sortMap[filter],
        });

        const res = await fetch(`/api/clips?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        if (replace) {
          setClips(data.clips);
        } else {
          setClips((prev) => [...prev, ...data.clips]);
        }

        setHasMore(
          data.clips.length === data.pageSize &&
            data.total > pageNum * data.pageSize,
        );
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  // Initial fetch and on filter change
  useEffect(() => {
    setClips([]);
    setPage(1);
    setActiveIndex(0);
    setHasMore(true);
    fetchClips(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Snap scroll observer to determine which clip is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) {
              setActiveIndex(idx);

              // Pre-fetch when near end
              if (idx >= clips.length - 3 && hasMore && !loading) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchClips(nextPage);
              }
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6,
      },
    );

    clipRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [clips.length, hasMore, loading, page, fetchClips]);

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = clipRefs.current.get(idx);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < clips.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, clips.length, scrollToIndex]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  }, [activeIndex, scrollToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNext, handlePrev]);

  return (
    <div className="flex h-screen w-full flex-col bg-black">
      {/* Top nav bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <a
          href="/clips"
          className="text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </a>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-full bg-white/10 p-0.5 backdrop-blur-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-5" /> {/* Spacer for symmetry */}
      </div>

      {/* Vertical scroll container */}
      <div
        ref={containerRef}
        className="flex-1 snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {clips.map((clip, idx) => (
          <div
            key={clip.id}
            ref={(el) => {
              if (el) clipRefs.current.set(idx, el);
            }}
            data-index={idx}
            className="relative h-screen w-full snap-start snap-always"
          >
            <ClipPlayer
              {...clip}
              autoPlay={idx === activeIndex}
              onEnded={handleNext}
            />
          </div>
        ))}

        {/* Loading state */}
        {loading && clips.length === 0 && (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-gold" />
              <p className="text-sm text-white/50">Loading clips...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && clips.length === 0 && (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-white/70">No clips found</p>
              <p className="mt-1 text-sm text-white/40">
                Try a different feed or check back later.
              </p>
            </div>
          </div>
        )}

        {/* Loading more indicator */}
        {loading && clips.length > 0 && (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-brand-gold" />
          </div>
        )}
      </div>

      {/* Navigation arrows (desktop) */}
      <div className="absolute left-1/2 bottom-8 z-20 hidden -translate-x-1/2 gap-3 md:flex">
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
          aria-label="Previous clip"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={activeIndex >= clips.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
          aria-label="Next clip"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Clip counter */}
      {clips.length > 0 && (
        <div className="absolute right-3 top-14 z-20 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white/50 backdrop-blur-sm">
          {activeIndex + 1} / {clips.length}
        </div>
      )}
    </div>
  );
}
