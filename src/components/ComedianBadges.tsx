import Link from "next/link";
import Image from "next/image";
import type { ComedianBadge } from "@/lib/badges";

type ComedianBadgesProps = {
  badges: ComedianBadge[];
  /** When true, show compact list. When false, show full cards with badge details */
  compact?: boolean;
};

function BadgePill({
  label,
  variant,
}: {
  label: string;
  variant: "firstTime" | "multiRound";
}) {
  const styles =
    variant === "firstTime"
      ? "bg-brand-gold/20 text-brand-gold border-brand-gold/40"
      : "bg-amber-600/20 text-amber-400 border-amber-500/40";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${styles}`}
      title={variant === "firstTime" ? "Seen once" : "Seen in multiple shows"}
    >
      {variant === "firstTime" ? (
        <span aria-hidden>★</span>
      ) : (
        <span aria-hidden>★★</span>
      )}
      {label}
    </span>
  );
}

export function ComedianBadges({ badges, compact = false }: ComedianBadgesProps) {
  if (badges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div key={b.comedianId} className="flex items-center gap-2">
            <BadgePill
              label={b.roundCount === 1 ? "First time" : `${b.roundCount} rounds`}
              variant={b.roundCount >= 2 ? "multiRound" : "firstTime"}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {badges.map((b) => (
        <li key={b.comedianId}>
          <Link
            href={`/comedians/${b.comedianSlug}`}
            className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            {b.headshotUrl ? (
              <Image
                src={b.headshotUrl}
                alt={`Headshot of ${b.comedianName}`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                {b.comedianName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-medium text-white truncate block">
                {b.comedianName}
              </span>
              <p className="text-sm text-zinc-500 mt-1">
                Seen {b.roundCount} time{b.roundCount !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {b.firstTime && (
                  <BadgePill label="First time" variant="firstTime" />
                )}
                {b.multiRound && (
                  <BadgePill label="Multiple rounds" variant="multiRound" />
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
