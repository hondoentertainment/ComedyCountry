import type { VenueTrustSummary } from "@/lib/trust";
import { TrustBadges } from "@/components/TrustBadges";

export function VenueTrustPanel({
  summary,
  venueName,
}: {
  summary: VenueTrustSummary;
  venueName: string;
}) {
  return (
    <section className="rounded-card border border-zinc-800/80 bg-brand-surface p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Venue trust panel</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {venueName} as a bookable, discoverable room: accessibility, freshness, and source confidence in one read.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Trust score</p>
          <p className="mt-1 text-2xl font-bold text-brand-gold">{Math.round(summary.trustScore)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Accessibility</p>
          <p className="mt-2 text-xl font-semibold text-white">{Math.round(summary.accessibilityScore)}</p>
          <p className="mt-1 text-xs text-zinc-500">Accessibility discovery score</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Freshness</p>
          <p className="mt-2 text-xl font-semibold text-white">{Math.round(summary.freshness.score)}</p>
          <p className="mt-1 text-xs text-zinc-500 capitalize">{summary.freshness.status}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Source confidence</p>
          <p className="mt-2 text-xl font-semibold text-white">{Math.round(summary.sourceConfidence)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {summary.lastVerifiedAt
              ? `Last verified ${new Date(summary.lastVerifiedAt).toLocaleDateString()}`
              : "No explicit verification timestamp yet"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <TrustBadges badges={summary.badges} freshness={summary.freshness} />
      </div>
    </section>
  );
}

