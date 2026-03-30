"use client";

type RatingDistributionProps = {
  distribution: Record<number, number>;
  total: number;
};

export function RatingDistribution({
  distribution,
  total,
}: RatingDistributionProps) {
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400 w-4 text-right">{star}</span>
            <span className="text-brand-gold text-xs">★</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-zinc-500 text-xs w-8 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type TierDistributionProps = {
  distribution: Record<string, number>;
  total: number;
};

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500",
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-zinc-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const TIER_TEXT_COLORS: Record<string, string> = {
  S: "text-amber-400",
  A: "text-emerald-400",
  B: "text-blue-400",
  C: "text-zinc-300",
  D: "text-orange-400",
  F: "text-red-400",
};

export function TierDistribution({
  distribution,
  total,
}: TierDistributionProps) {
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      {["S", "A", "B", "C", "D", "F"].map((tier) => {
        const count = distribution[tier] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={tier} className="flex items-center gap-2 text-sm">
            <span
              className={`w-4 text-right font-semibold ${TIER_TEXT_COLORS[tier]}`}
            >
              {tier}
            </span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${TIER_COLORS[tier]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-zinc-500 text-xs w-8 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
