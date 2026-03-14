"use client";

import { useState } from "react";
import { useToast } from "./Toast";

type UserReview = {
  id: string;
  rating: number;
  comment: string | null;
};

type ExperienceFieldKey =
  | "setQuality"
  | "crowdFit"
  | "roomVibe"
  | "pacing"
  | "valueForPrice"
  | "openerStrength";

type ExperienceState = Record<ExperienceFieldKey, number | ""> & {
  wouldRecommend: boolean;
};

const EXPERIENCE_FIELDS: Array<{ key: ExperienceFieldKey; label: string }> = [
  { key: "setQuality", label: "Set quality" },
  { key: "crowdFit", label: "Crowd fit" },
  { key: "roomVibe", label: "Room vibe" },
  { key: "pacing", label: "Pacing" },
  { key: "valueForPrice", label: "Value" },
  { key: "openerStrength", label: "Opener strength" },
];

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
  const { toast } = useToast();
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [experience, setExperience] = useState<ExperienceState>({
    setQuality: "",
    crowdFit: "",
    roomVibe: "",
    pacing: "",
    valueForPrice: "",
    openerStrength: "",
    wouldRecommend: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasExperience = EXPERIENCE_FIELDS.some(
      ({ key }) => typeof experience[key] === "number",
    );
    if (rating < 1 && !comment.trim() && !hasExperience) return;

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
          experience: {
            ...Object.fromEntries(
              EXPERIENCE_FIELDS.map(({ key }) => [
                key,
                typeof experience[key] === "number" ? experience[key] : undefined,
              ]),
            ),
            wouldRecommend: hasExperience ? experience.wouldRecommend : undefined,
          },
        }),
      });

      if (res.status === 401) {
        const hasCallback = signInUrl.includes("callbackUrl=");
        const path =
          typeof window !== "undefined" && window.location?.pathname
            ? window.location.pathname
            : `/events/${eventId}`;
        const url = hasCallback
          ? signInUrl
          : `${signInUrl}?callbackUrl=${encodeURIComponent(path)}`;
        window.location.href = url;
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSuccess(true);
      toast("Review saved! Thanks for sharing.");
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
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <label htmlFor="comment" className="text-sm text-zinc-400">
            Comment (optional)
          </label>
          <span
            className="text-xs text-zinc-500 tabular-nums"
            aria-live="polite"
            aria-label={`${comment.length} of 2000 characters`}
          >
            {comment.length}/2000
          </span>
        </div>
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

      <div>
        <p className="text-sm text-zinc-400 mb-3">Verified crowd take</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPERIENCE_FIELDS.map(({ key, label }) => (
            <label key={key} className="text-sm">
              <span className="block text-zinc-400 mb-1">{label}</span>
              <select
                value={experience[key]}
                onChange={(e) =>
                  setExperience((current) => ({
                    ...current,
                    [key]: e.target.value ? Number(e.target.value) : "",
                  }))
                }
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              >
                <option value="">Skip</option>
                <option value="1">1 - Weak</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 - Excellent</option>
              </select>
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={experience.wouldRecommend}
            onChange={(e) =>
              setExperience((current) => ({
                ...current,
                wouldRecommend: e.target.checked,
              }))
            }
            className="rounded border-zinc-600 bg-zinc-900 text-brand-gold focus:ring-brand-gold"
          />
          I would recommend this show to a friend
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          loading ||
          (rating < 1 &&
            !comment.trim() &&
            !EXPERIENCE_FIELDS.some(({ key }) => typeof experience[key] === "number"))
        }
        className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
          success
            ? "bg-emerald-600/80 text-white"
            : "bg-brand-gold text-brand-dark hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {loading ? "Saving…" : success ? "✓ Saved" : "Submit review"}
      </button>
    </form>
  );
}
