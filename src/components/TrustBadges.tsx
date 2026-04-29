import type { TrustBadge } from "@/lib/trust";
import type { FreshnessSnapshot } from "@/lib/freshness";
import { FreshnessBadge } from "@/components/FreshnessBadge";

function getToneClasses(tone: TrustBadge["tone"]) {
  switch (tone) {
    case "emerald":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "blue":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "amber":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }
}

export function TrustBadges({
  badges,
  freshness,
  limit = 4,
}: {
  badges: TrustBadge[];
  freshness?: FreshnessSnapshot;
  limit?: number;
}) {
  const visibleBadges = badges
    .filter((badge) => badge.key !== "freshness")
    .slice(0, limit);

  return (
    <div className="flex flex-wrap gap-2">
      {freshness && <FreshnessBadge freshness={freshness} compact />}
      {visibleBadges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getToneClasses(badge.tone)}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

