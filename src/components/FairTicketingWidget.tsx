"use client";

import { useEffect, useState } from "react";

interface PriceBreakdown {
  ticketTypeName: string;
  basePrice: number;
  serviceFee: number;
  processingFee: number;
  totalPrice: number;
  feePercentage: number;
  showAllFees: boolean;
  antiScalpingEnabled: boolean;
}

interface WaitlistPosition {
  position: number;
  effectivePosition: number;
  status: string;
}

interface ResaleListing {
  id: string;
  maxPrice: number;
  ticket: {
    ticketType: {
      name: string;
    };
  };
}

export default function FairTicketingWidget({
  eventId,
  ticketTypeId,
}: {
  eventId: string;
  ticketTypeId?: string;
}) {
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(
    null
  );
  const [waitlistPos, setWaitlistPos] = useState<WaitlistPosition | null>(null);
  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const promises: Promise<void>[] = [];

        // Fetch price breakdown if ticketTypeId provided
        if (ticketTypeId) {
          promises.push(
            fetch(
              `/api/fair-ticketing/price?ticketTypeId=${ticketTypeId}&eventId=${eventId}`
            )
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data) setPriceBreakdown(data);
              })
          );
        }

        // Fetch waitlist position
        promises.push(
          fetch(`/api/fair-ticketing/waitlist?eventId=${eventId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data) setWaitlistPos(data);
            })
        );

        // Fetch resale listings
        promises.push(
          fetch(`/api/fair-ticketing/resale?eventId=${eventId}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setResaleListings(data))
        );

        await Promise.all(promises);
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [eventId, ticketTypeId]);

  if (loading) {
    return (
      <div className="rounded-lg bg-brand-surface border border-zinc-800/80 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-zinc-800 rounded w-1/3" />
          <div className="h-10 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-brand-surface border border-zinc-800/80 p-6 space-y-5">
      {/* Header with Anti-Scalping Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Fair Ticketing</h3>
        {priceBreakdown?.antiScalpingEnabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            Anti-Scalping Protected
          </span>
        )}
      </div>

      {/* Verified Ticket Badge */}
      {isVerified && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
            />
          </svg>
          <span className="text-sm font-medium text-blue-400">
            Verified Ticket Holder
          </span>
        </div>
      )}

      {/* Transparent Price Breakdown */}
      {priceBreakdown && priceBreakdown.showAllFees && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400">
            Transparent Price Breakdown
          </h4>
          <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">
                {priceBreakdown.ticketTypeName} (Base Price)
              </span>
              <span className="text-white">
                ${priceBreakdown.basePrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Service Fee</span>
              <span className="text-zinc-300">
                ${priceBreakdown.serviceFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Processing Fee</span>
              <span className="text-zinc-300">
                ${priceBreakdown.processingFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Total (No Hidden Fees)</span>
                <span className="text-brand-gold">
                  ${priceBreakdown.totalPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Fees are {priceBreakdown.feePercentage.toFixed(1)}% of base
                price
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Position */}
      {waitlistPos && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400">
            Waitlist Position
          </h4>
          <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-brand-gold">
                  #{waitlistPos.effectivePosition}
                </p>
                <p className="text-xs text-zinc-500">in line</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  waitlistPos.status === "OFFERED"
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/30"
                    : waitlistPos.status === "CLAIMED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {waitlistPos.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Resale Listings */}
      {resaleListings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400">
            Verified Resale Tickets
          </h4>
          <div className="space-y-2">
            {resaleListings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between rounded-lg bg-zinc-900/50 border border-zinc-800 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {listing.ticket.ticketType.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Controlled resale — max price enforced
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-brand-gold">
                    ${Number(listing.maxPrice).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">max price</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Hidden Fees Notice */}
      <p className="text-xs text-zinc-500 text-center border-t border-zinc-800 pt-3">
        All prices shown include all fees. No surprises at checkout.
      </p>
    </div>
  );
}
