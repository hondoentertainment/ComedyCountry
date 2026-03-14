"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TicketTypeInfo {
  id: string;
  name: string;
  price: string;
  capacity: number;
  sold: number;
  available: number;
  onSale: boolean;
  description: string | null;
  saleStart: string | null;
  saleEnd: string | null;
}

export default function TicketPurchaseWidget({
  eventId,
}: {
  eventId: string;
}) {
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await fetch(`/api/events/${eventId}/ticket-types`);
        if (res.ok) {
          const data = await res.json();
          setTicketTypes(data);
          // Auto-select first available type
          const firstAvailable = data.find(
            (tt: TicketTypeInfo) => tt.onSale && tt.available > 0
          );
          if (firstAvailable) {
            setSelectedType(firstAvailable.id);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, [eventId]);

  async function handlePurchase() {
    if (!selectedType) return;
    setPurchasing(true);
    setError("");
    setSuccess("");

    try {
      // Purchase tickets one at a time (sequential for capacity tracking)
      for (let i = 0; i < quantity; i++) {
        const res = await fetch("/api/tickets/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, ticketTypeId: selectedType }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (i > 0) {
            setSuccess(
              `${i} ticket${i > 1 ? "s" : ""} purchased. ${data.error || "Failed to purchase remaining tickets."}`
            );
          } else {
            setError(data.error || "Purchase failed");
          }
          return;
        }
      }

      setSuccess(
        `${quantity} ticket${quantity > 1 ? "s" : ""} purchased! Check your tickets page.`
      );
      // Refresh ticket types to update availability
      const res = await fetch(`/api/events/${eventId}/ticket-types`);
      if (res.ok) {
        setTicketTypes(await res.json());
      }
    } catch {
      setError("Purchase failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

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

  if (ticketTypes.length === 0) {
    return null;
  }

  const selected = ticketTypes.find((tt) => tt.id === selectedType);

  return (
    <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Get Tickets</h3>

      {/* Ticket Type Selection */}
      <div className="space-y-2 mb-4">
        {ticketTypes.map((tt) => {
          const soldOut = tt.available <= 0;
          const notOnSale = !tt.onSale;
          const disabled = soldOut || notOnSale;

          return (
            <button
              key={tt.id}
              onClick={() => {
                if (!disabled) {
                  setSelectedType(tt.id);
                  setQuantity(1);
                }
              }}
              disabled={disabled}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedType === tt.id
                  ? "border-brand-gold bg-brand-gold/10"
                  : disabled
                    ? "border-zinc-800 bg-zinc-900/50 opacity-50 cursor-not-allowed"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium text-sm">
                    {tt.name}
                  </span>
                  {tt.description && (
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {tt.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-brand-gold font-semibold text-sm">
                    ${tt.price}
                  </span>
                  <p className="text-zinc-500 text-xs">
                    {soldOut
                      ? "Sold Out"
                      : notOnSale
                        ? "Not On Sale"
                        : `${tt.available} left`}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quantity */}
      {selected && selected.onSale && selected.available > 0 && (
        <div className="mb-4">
          <label
            htmlFor="quantity"
            className="block text-zinc-400 text-sm mb-1"
          >
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors flex items-center justify-center"
            >
              -
            </button>
            <span className="text-white font-medium w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() =>
                setQuantity(Math.min(selected.available, 10, quantity + 1))
              }
              className="w-9 h-9 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors flex items-center justify-center"
            >
              +
            </button>
            <span className="text-zinc-500 text-sm ml-2">
              ${(parseFloat(selected.price) * quantity).toFixed(2)} total
            </span>
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!selectedType || purchasing || !selected?.onSale || (selected?.available ?? 0) <= 0}
        className="w-full py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {purchasing
          ? "Processing..."
          : `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""}`}
      </button>

      {/* Error / Success */}
      {error && (
        <p className="text-red-400 text-sm mt-3">{error}</p>
      )}
      {success && (
        <div className="mt-3">
          <p className="text-emerald-400 text-sm">{success}</p>
          <button
            onClick={() => router.push("/tickets")}
            className="text-brand-gold hover:underline text-sm mt-1"
          >
            View My Tickets
          </button>
        </div>
      )}
    </div>
  );
}
