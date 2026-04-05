"use client";

import { useState } from "react";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  FAN_PRO: "Fan Pro",
  COMEDIAN_PRO: "Comedian Pro",
  COMEDIAN_PREMIUM: "Comedian Premium",
  VENUE_PRO: "Venue Pro",
  VENUE_PREMIUM: "Venue Premium",
};

const PLAN_PRICES: Record<string, string> = {
  FAN_PRO: "$4.99/mo",
  COMEDIAN_PRO: "$14.99/mo",
  COMEDIAN_PREMIUM: "$29.99/mo",
  VENUE_PRO: "$49.99/mo",
  VENUE_PREMIUM: "$99.99/mo",
};

export function SubscriptionManager({
  currentPlan,
  status,
  periodEnd,
  cancelAtPeriodEnd,
}: {
  currentPlan: string | null;
  status: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  if (!currentPlan || status !== "ACTIVE") {
    return (
      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Free Plan</p>
            <p className="text-zinc-500 text-sm mt-1">
              Upgrade for ad-free experience, analytics, and more.
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90 transition-colors shrink-0"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  const endDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-xs font-bold">
            {PLAN_LABELS[currentPlan] ?? currentPlan}
          </span>
          <span className="text-zinc-400 text-sm">
            {PLAN_PRICES[currentPlan] ?? ""}
          </span>
        </div>
        <span className="text-green-400 text-xs font-medium uppercase">
          Active
        </span>
      </div>

      {endDate && (
        <p className="text-zinc-500 text-sm">
          {cancelAtPeriodEnd ? (
            <>Cancels on {endDate}. You&apos;ll retain access until then.</>
          ) : (
            <>Next billing date: {endDate}</>
          )}
        </p>
      )}

      {cancelMessage && (
        <p className="text-sm text-amber-400 mt-3" role="status">
          {cancelMessage}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <Link
          href="/pricing"
          className="px-3 py-1.5 rounded-lg bg-brand-surface border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 text-sm font-medium transition-colors"
        >
          Change plan
        </Link>
        {!cancelAtPeriodEnd && (
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors"
            onClick={() => {
              // In production: call /api/subscriptions/cancel
              setCancelMessage(
                "Cancellation would be handled via Stripe in production.",
              );
              setTimeout(() => setCancelMessage(null), 5000);
            }}
          >
            Cancel subscription
          </button>
        )}
      </div>
    </div>
  );
}
