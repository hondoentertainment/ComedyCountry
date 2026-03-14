"use client";

import { useEffect, useState } from "react";

interface TasteMatchBadgeProps {
  comedianId: string;
}

export function TasteMatchBadge({ comedianId }: TasteMatchBadgeProps) {
  const [matchPct, setMatchPct] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [stretchLabel, setStretchLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/taste-profile/match/${comedianId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.matchPct != null && data.matchPct > 0) {
          setMatchPct(data.matchPct);
          setSummary(typeof data.summary === "string" ? data.summary : null);
          setStretchLabel(typeof data.stretchLabel === "string" ? data.stretchLabel : null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [comedianId]);

  if (loading || matchPct === null) return null;

  const color =
    matchPct >= 80
      ? "bg-green-900/40 text-green-400"
      : matchPct >= 50
        ? "bg-brand-gold/20 text-brand-gold"
        : "bg-zinc-800 text-zinc-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
      title={summary ?? "How well this comedian matches your taste profile"}
    >
      {matchPct}% match
      {stretchLabel && <span className="opacity-80">· {stretchLabel}</span>}
    </span>
  );
}
