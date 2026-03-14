"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface BookingRequest {
  id: string;
  venueId: string;
  date: string;
  showType: string | null;
  budget: number | null;
  message: string | null;
  status: string;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  ACCEPTED: "bg-green-500/20 text-green-400",
  DECLINED: "bg-red-500/20 text-red-400",
  NEGOTIATING: "bg-blue-500/20 text-blue-400",
  CONFIRMED: "bg-green-600/20 text-green-300",
  CANCELLED: "bg-zinc-500/20 text-zinc-400",
};

export default function CreatorBookingsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/creator/bookings?status=${filter}`
        : "/api/creator/bookings";
      const res = await fetch(url);
      if (res.ok) setBookings(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleRespond(id: string, status: string) {
    try {
      const res = await fetch(`/api/creator/bookings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, responseNote: responseNote.trim() || undefined }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
        setRespondingId(null);
        setResponseNote("");
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
        &larr; Creator Hub
      </Link>
      <h1 className="text-2xl font-bold text-brand-gold mb-6">Booking Requests</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["", "PENDING", "ACCEPTED", "DECLINED", "NEGOTIATING", "CONFIRMED"].map((s) => (
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

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">No booking requests{filter ? ` with status ${filter}` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {new Date(booking.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {booking.showType && (
                    <p className="text-zinc-400 text-sm">{booking.showType}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusColors[booking.status] ?? "bg-zinc-700 text-zinc-300"}`}>
                  {booking.status}
                </span>
              </div>

              {booking.budget && (
                <p className="text-zinc-300 text-sm mt-2">Budget: ${Number(booking.budget).toFixed(2)}</p>
              )}
              {booking.message && (
                <p className="text-zinc-400 text-sm mt-2">{booking.message}</p>
              )}
              {booking.responseNote && (
                <p className="text-zinc-500 text-sm mt-2 italic">Your response: {booking.responseNote}</p>
              )}
              <p className="text-zinc-600 text-xs mt-2">
                Received {new Date(booking.createdAt).toLocaleDateString()}
              </p>

              {booking.status === "PENDING" && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  {respondingId === booking.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Optional note..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(booking.id, "ACCEPTED")}
                          className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(booking.id, "NEGOTIATING")}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
                        >
                          Negotiate
                        </button>
                        <button
                          onClick={() => handleRespond(booking.id, "DECLINED")}
                          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => { setRespondingId(null); setResponseNote(""); }}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
