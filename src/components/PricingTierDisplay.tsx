"use client";

import { useEffect, useState } from "react";

interface TierInfo {
  id: string;
  name: string;
  price: string;
  startsAt: string;
  endsAt: string | null;
  maxQuantity: number | null;
  sold: number;
  isActive: boolean;
  isSoldOut: boolean;
}

interface TicketTypePricing {
  ticketTypeId: string;
  ticketTypeName: string;
  basePrice: string;
  currentPrice: string;
  currentTierName: string | null;
  nextTier: {
    name: string;
    price: string;
    startsAt: string;
  } | null;
  savings: string | null;
  savingsComparedTo: string | null;
  savingsEndsAt: string | null;
  tiers: TierInfo[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(price: string | number): string {
  return `$${parseFloat(String(price)).toFixed(2)}`;
}

export default function PricingTierDisplay({
  eventId,
}: {
  eventId: string;
}) {
  const [pricingSummary, setPricingSummary] = useState<TicketTypePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch(`/api/events/${eventId}/pricing`);
        if (res.ok) {
          const data = await res.json();
          setPricingSummary(data);
        } else {
          setError("Failed to load pricing");
        }
      } catch {
        setError("Failed to load pricing");
      } finally {
        setLoading(false);
      }
    }
    fetchPricing();
  }, [eventId]);

  if (loading) {
    return (
      <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-zinc-800 rounded w-1/3" />
          <div className="h-10 bg-zinc-800 rounded" />
          <div className="h-10 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // Only show ticket types that have pricing tiers
  const withTiers = pricingSummary.filter((tt) => tt.tiers.length > 0);

  if (withTiers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Pricing Tiers</h3>

      <div className="space-y-6">
        {withTiers.map((tt) => (
          <div key={tt.ticketTypeId}>
            {withTiers.length > 1 && (
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                {tt.ticketTypeName}
              </h4>
            )}

            {/* Savings badge */}
            {tt.savings && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
                <span className="text-emerald-400 text-xs font-semibold">
                  Save {formatPrice(tt.savings)}
                </span>
                {tt.savingsEndsAt && (
                  <span className="text-emerald-400/70 text-xs">
                    — {tt.currentTierName ?? "Early bird"} ends{" "}
                    {formatDate(tt.savingsEndsAt)}
                  </span>
                )}
              </div>
            )}

            {/* Tier list */}
            <div className="space-y-2">
              {tt.tiers.map((tier) => {
                const isActive = tier.isActive;
                const isSoldOut = tier.isSoldOut;
                const isFuture = new Date(tier.startsAt) > new Date();

                return (
                  <div
                    key={tier.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isActive
                        ? "border-brand-gold bg-brand-gold/10"
                        : isSoldOut
                          ? "border-zinc-800 bg-zinc-900/50 opacity-50"
                          : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-brand-gold" />
                      )}
                      <div>
                        <span
                          className={`text-sm font-medium ${
                            isActive ? "text-white" : "text-zinc-400"
                          }`}
                        >
                          {tier.name}
                        </span>
                        {isActive && (
                          <span className="ml-2 text-xs text-brand-gold">
                            Current
                          </span>
                        )}
                        {isSoldOut && (
                          <span className="ml-2 text-xs text-red-400">
                            Sold Out
                          </span>
                        )}
                        {isFuture && !isSoldOut && (
                          <p className="text-zinc-500 text-xs mt-0.5">
                            Starts {formatDate(tier.startsAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? "text-brand-gold" : "text-zinc-400"
                      }`}
                    >
                      {formatPrice(tier.price)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Next tier warning */}
            {tt.nextTier && (
              <p className="text-zinc-500 text-xs mt-2">
                Price goes up to {formatPrice(tt.nextTier.price)} on{" "}
                {formatDate(tt.nextTier.startsAt)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
