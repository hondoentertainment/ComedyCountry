"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string | null;
    profileName: string | null;
    image: string | null;
  };
};

type Stats = {
  count: number;
  avgRating: number | null;
};

type EventReviewsProps = {
  eventId: string;
  initialStats?: Stats | null;
  refreshTrigger?: number; // Increment to refetch
};

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= full
              ? "text-brand-gold"
              : i === full + 1 && hasHalf
                ? "text-brand-gold opacity-70"
                : "text-zinc-600"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function EventReviews({ eventId, initialStats, refreshTrigger = 0 }: EventReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(initialStats ?? null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef(0);
  const pages = Math.ceil(total / 10) || 1;

  const fetchReviews = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/reviews?page=${p}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        reviews: Review[];
        total: number;
        count: number;
        avgRating: number | null;
      };
      setReviews(data.reviews);
      setTotal(data.total);
      setStats({ count: data.count, avgRating: data.avgRating });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const shouldReset = refreshTrigger > lastRefreshRef.current;
    if (shouldReset) {
      lastRefreshRef.current = refreshTrigger;
      setPage(1);
      fetchReviews(1);
    } else {
      fetchReviews(page);
    }
  }, [eventId, page, refreshTrigger, fetchReviews]);

  const displayName = (r: Review) =>
    r.user.profileName ?? r.user.name ?? "Anonymous";

  return (
    <div className="space-y-6">
      {stats && stats.count > 0 && (
        <div className="flex items-center gap-3 text-zinc-400">
          <Stars rating={stats.avgRating ?? 0} />
          <span className="text-sm">
            {stats.avgRating?.toFixed(1)} ({stats.count} review{stats.count !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      <ul className="space-y-4">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
          >
            <div className="flex items-start gap-3">
              {r.user.image ? (
                <Image
                  src={r.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full shrink-0 bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                  {displayName(r).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{displayName(r)}</span>
                  <Stars rating={r.rating} />
                  <span className="text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-zinc-300 text-sm whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {loading && (
        <p className="text-zinc-500 text-sm">Loading reviews…</p>
      )}

      {!loading && reviews.length === 0 && (
        <p className="text-zinc-500 text-sm">No reviews yet. Be the first to rate this show!</p>
      )}

      {pages > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
