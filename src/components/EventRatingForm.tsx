"use client";

import { useState } from "react";

type UserReview = {
  id: string;
  rating: number;
  comment: string | null;
};

type EventRatingFormProps = {
  eventId: string;
  initialReview?: UserReview | null;
  signInUrl?: string;
  onSuccess?: () => void;
};

function StarButton({
  value,
  filled,
  onSelect,
  onHover,
}: {
  value: number;
  filled: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onMouseEnter={onHover}
      type="button"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") e.preventDefault();
      }}
      className={`p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 focus:ring-offset-brand-dark rounded ${
        filled ? "text-brand-gold" : "text-zinc-500 hover:text-zinc-400"
      }`}
      aria-label={`Rate ${value} out of 5`}
    >
      <span className="text-xl">{filled ? "★" : "☆"}</span>
    </button>
  );
}

export function EventRatingForm({
  eventId,
  initialReview,
  signInUrl = "/auth/signin",
  onSuccess,
}: EventRatingFormProps) {
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 && !comment.trim()) return;

    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating >= 1 ? rating : undefined,
          comment: comment.trim() || undefined,
        }),
      });

      if (res.status === 401) {
        window.location.href = signInUrl;
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-zinc-400 mb-2">Your rating</p>
        <div
          className="flex gap-1"
          role="group"
          aria-label="Rate this show"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <StarButton
              key={v}
              value={v}
              filled={v <= displayRating}
              onSelect={() => {
                setRating(v);
                setError(null);
              }}
              onHover={() => setHoverRating(v)}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm text-zinc-400 mb-2">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setError(null);
          }}
          placeholder="Share your experience..."
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || (rating < 1 && !comment.trim())}
        className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Saving…" : success ? "Saved" : "Submit review"}
      </button>
    </form>
  );
}
