import type { FreshnessSnapshot } from "@/lib/freshness";

function getClasses(status: FreshnessSnapshot["status"]) {
  switch (status) {
    case "fresh":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "aging":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }
}

export function FreshnessBadge({
  freshness,
  compact = false,
}: {
  freshness: FreshnessSnapshot;
  compact?: boolean;
}) {
  const label =
    freshness.status === "fresh"
      ? "Fresh"
      : freshness.status === "aging"
        ? "Aging"
        : "Stale";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getClasses(freshness.status)}`}
      title={freshness.reasons.join(" · ")}
    >
      {label}
      {!compact && <span className="ml-1 opacity-80">{Math.round(freshness.score)}</span>}
    </span>
  );
}

