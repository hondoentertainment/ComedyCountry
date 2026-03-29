"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export function SpecialRating({ specialId }: { specialId: string }) {
  const { data: session } = useSession();
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/specials/${specialId}/rate`);
      if (res.ok) {
        const data = await res.json();
        setAvgRating(data.avgRating);
        setCount(data.count);
        setUserRating(data.userRating);
      }
    } catch {
      // ignore
    }
  }, [specialId]);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  async function rate(rating: number) {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    setUserRating(rating);
    try {
      const res = await fetch(`/api/specials/${specialId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      await fetchRating();
    } catch {
      setError("Failed to save rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRating() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/specials/${specialId}/rate`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove rating");
      setUserRating(null);
      await fetchRating();
    } catch {
      setError("Failed to remove rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5" onMouseLeave={() => setHoveredStar(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!session || submitting}
            onClick={() => rate(star)}
            onMouseEnter={() => setHoveredStar(star)}
            className={`text-lg transition-colors disabled:cursor-default ${
              star <= (hoveredStar || userRating || 0)
                ? "text-brand-gold"
                : "text-zinc-700 hover:text-zinc-500"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      {avgRating !== null && count > 0 && (
        <span className="text-zinc-500 text-xs">
          {avgRating.toFixed(1)} ({count})
        </span>
      )}
      {userRating && (
        <>
          <span className="text-brand-gold text-xs">Your: {userRating}</span>
          <button
            type="button"
            onClick={removeRating}
            disabled={submitting}
            className="text-zinc-500 hover:text-zinc-400 text-xs underline disabled:opacity-50"
          >
            Clear
          </button>
        </>
      )}
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
