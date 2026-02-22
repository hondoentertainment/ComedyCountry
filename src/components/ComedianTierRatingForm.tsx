"use client";

import { useState, useEffect } from "react";

const TIERS = ["S", "A", "B", "C", "D", "F"] as const;

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30",
  A: "bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-600/30",
  B: "bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-600/30",
  C: "bg-zinc-500/20 text-zinc-300 border-zinc-500/50 hover:bg-zinc-500/30",
  D: "bg-orange-600/20 text-orange-400 border-orange-500/50 hover:bg-orange-600/30",
  F: "bg-red-600/20 text-red-400 border-red-500/50 hover:bg-red-600/30",
};

type ComedianTierRatingFormProps = {
  comedianId: string;
  comedianName: string;
  comedianSlug: string;
  initialTier?: string | null;
  signInUrl?: string;
  onSuccess?: () => void;
};

export function ComedianTierRatingForm({
  comedianId,
  comedianName,
  comedianSlug,
  initialTier,
  signInUrl = "/auth/signin",
  onSuccess,
}: ComedianTierRatingFormProps) {
  const [tier, setTier] = useState<string | null>(initialTier ?? null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTier(initialTier ?? null);
  }, [initialTier]);

  const handleSelect = async (selectedTier: string) => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch(`/api/comedians/${comedianId}/tier-rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (res.status === 401) {
        window.location.href = `${signInUrl}?callbackUrl=${encodeURIComponent(`/comedians/${comedianSlug}`)}`;
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setTier(selectedTier);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save rating. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch(`/api/comedians/${comedianId}/tier-rating`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        window.location.href = `${signInUrl}?callbackUrl=${encodeURIComponent(`/comedians/${comedianSlug}`)}`;
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove");
      }

      setTier(null);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove rating. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Rate {comedianName} by tier. S is the highest, F is the lowest.
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Select tier rating"
      >
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleSelect(t)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark ${
              tier === t
                ? TIER_COLORS[t] + " border-brand-gold"
                : TIER_COLORS[t]
            }`}
            aria-pressed={tier === t}
            aria-label={`Rate as ${t} tier`}
          >
            {t}
          </button>
        ))}
      </div>
      {tier && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading}
          className="text-sm text-zinc-500 hover:text-zinc-400 underline disabled:opacity-50"
        >
          Clear rating
        </button>
      )}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-400" role="status">
          Rating saved
        </p>
      )}
    </div>
  );
}
