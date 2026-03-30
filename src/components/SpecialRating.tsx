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
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/specials/${specialId}/rate`);
      if (res.ok) {
        const data = await res.json();
        setAvgRating(data.avgRating);
        setCount(data.count);
        setUserRating(data.userRating);
        if (data.userComment) setComment(data.userComment);
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
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
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
    <div className="space-y-2">
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
      {session && userRating && !showComment && (
        <button
          type="button"
          onClick={() => setShowComment(true)}
          className="text-xs text-zinc-500 hover:text-zinc-400 underline"
        >
          {comment ? "Edit comment" : "Add a comment"}
        </button>
      )}
      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={500}
            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-xs placeholder-zinc-500 focus:border-brand-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              rate(userRating!);
              setShowComment(false);
            }}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-xs font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
