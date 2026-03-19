"use client";

import { useState, useEffect, useCallback } from "react";

type Booking = {
  id: string;
  venueId: string;
  comedianId: string;
  requesterId: string;
  date: string;
  showType: string | null;
  budget: number | null;
  message: string | null;
  status: string;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  comedian?: {
    id: string;
    name: string;
    slug: string;
    headshotUrl: string | null;
  };
};

type BookingManagerProps = {
  role: "comedian" | "venue";
  entityId: string;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  ACCEPTED: "bg-green-500/15 text-green-400 border-green-500/30",
  DECLINED: "bg-red-500/15 text-red-400 border-red-500/30",
  NEGOTIATING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CONFIRMED: "bg-green-600/15 text-green-300 border-green-600/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const STATUS_FILTERS = ["", "PENDING", "ACCEPTED", "DECLINED", "NEGOTIATING", "CONFIRMED", "CANCELLED"];

export default function BookingManager({ role, entityId }: BookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [counterBudget, setCounterBudget] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const paramKey = role === "comedian" ? "comedianId" : "venueId";
      const params = new URLSearchParams({ [paramKey]: entityId });
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/bookings?${params}`);
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [role, entityId, filter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleStatusChange(bookingId: string, status: string) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          responseNote: responseNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updated } : b)));
        setRespondingId(null);
        setResponseNote("");
      }
    } catch {
      // ignore
    }
    setProcessing(false);
  }

  async function handleNegotiate(bookingId: string) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "negotiate",
          budget: counterBudget ? parseFloat(counterBudget) : undefined,
          message: counterMessage.trim() || undefined,
          responseNote: responseNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updated } : b)));
        setRespondingId(null);
        setResponseNote("");
        setCounterBudget("");
        setCounterMessage("");
      }
    } catch {
      // ignore
    }
    setProcessing(false);
  }

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-400">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </span>
        {pendingCount > 0 && (
          <span className="text-yellow-400">
            {pendingCount} pending
          </span>
        )}
        {confirmedCount > 0 && (
          <span className="text-green-400">
            {confirmedCount} confirmed
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? "bg-brand-gold text-brand-dark"
                : "bg-brand-surface text-zinc-400 border border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-lg bg-brand-surface border border-zinc-800 animate-pulse h-24" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">
            No booking requests{filter ? ` with status "${filter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="p-5 rounded-lg bg-brand-surface border border-zinc-800"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  {booking.comedian && (
                    <p className="text-white font-medium">{booking.comedian.name}</p>
                  )}
                  <p className="text-zinc-400 text-sm">
                    {new Date(booking.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    STATUS_STYLES[booking.status] ?? "bg-zinc-700 text-zinc-300 border-zinc-600"
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1 text-sm">
                {booking.showType && (
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Type:</span> {booking.showType}
                  </p>
                )}
                {booking.budget && (
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Budget:</span> ${Number(booking.budget).toFixed(2)}
                  </p>
                )}
                {booking.message && (
                  <p className="text-zinc-400 mt-2">{booking.message}</p>
                )}
                {booking.responseNote && (
                  <p className="text-zinc-500 italic mt-2">
                    Response: {booking.responseNote}
                  </p>
                )}
              </div>

              <p className="text-zinc-600 text-xs mt-2">
                Created {new Date(booking.createdAt).toLocaleDateString()}
                {booking.respondedAt && ` | Responded ${new Date(booking.respondedAt).toLocaleDateString()}`}
              </p>

              {/* Actions */}
              {(booking.status === "PENDING" || booking.status === "NEGOTIATING") && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  {respondingId === booking.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Add a response note..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none resize-none"
                      />

                      {/* Counter-offer fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Counter Budget ($)</label>
                          <input
                            type="number"
                            value={counterBudget}
                            onChange={(e) => setCounterBudget(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-brand-dark border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Counter Message</label>
                          <input
                            value={counterMessage}
                            onChange={(e) => setCounterMessage(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-brand-dark border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
                            placeholder="Counter-offer details..."
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleStatusChange(booking.id, "ACCEPTED")}
                          disabled={processing}
                          className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleNegotiate(booking.id)}
                          disabled={processing}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                        >
                          Counter-offer
                        </button>
                        <button
                          onClick={() => handleStatusChange(booking.id, "DECLINED")}
                          disabled={processing}
                          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            setRespondingId(null);
                            setResponseNote("");
                            setCounterBudget("");
                            setCounterMessage("");
                          }}
                          className="px-4 py-1.5 text-zinc-500 text-sm hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingId(booking.id)}
                      className="text-sm text-brand-gold hover:underline"
                    >
                      Respond to this request
                    </button>
                  )}
                </div>
              )}

              {/* Confirm accepted booking */}
              {booking.status === "ACCEPTED" && role === "venue" && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => handleStatusChange(booking.id, "CONFIRMED")}
                    disabled={processing}
                    className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                  >
                    Confirm Booking
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
