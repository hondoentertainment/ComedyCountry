"use client";

import { useState, useEffect } from "react";

interface BookingRequestFormProps {
  comedianId?: string;
  venueId?: string;
  onSuccess?: (booking: BookingResult) => void;
  onCancel?: () => void;
}

type BookingResult = {
  id: string;
  venueId: string;
  comedianId: string;
  date: string;
  showType: string | null;
  budget: number | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type AvailabilityDay = {
  date: string;
  status: "available" | "booked" | "pending";
};

export default function BookingRequestForm({
  comedianId,
  venueId,
  onSuccess,
  onCancel,
}: BookingRequestFormProps) {
  const [formComedianId, setFormComedianId] = useState(comedianId ?? "");
  const [formVenueId, setFormVenueId] = useState(venueId ?? "");
  const [date, setDate] = useState("");
  const [showType, setShowType] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Load comedian availability when date month changes
  useEffect(() => {
    if (!formComedianId || !date) return;

    async function checkAvailability() {
      setLoadingAvailability(true);
      try {
        const [year, month] = date.split("-");
        const res = await fetch(
          `/api/bookings/availability?comedianId=${formComedianId}&month=${month}&year=${year}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch {
        // ignore
      }
      setLoadingAvailability(false);
    }
    checkAvailability();
  }, [formComedianId, date]);

  const selectedDateStatus = availability.find((a) => a.date === date)?.status;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comedianId: formComedianId,
          venueId: formVenueId,
          date,
          showType: showType || undefined,
          budget: budget ? parseFloat(budget) : undefined,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create booking request");
      }

      const booking = await res.json();
      setSuccess(true);
      onSuccess?.(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit booking request");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-green-800/50 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-semibold mb-1">Booking Request Sent</h3>
        <p className="text-zinc-400 text-sm">
          Your booking request has been submitted. You will be notified when the comedian responds.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-800/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!comedianId && (
        <div>
          <label htmlFor="booking-comedian" className="block text-sm text-zinc-400 mb-1">
            Comedian ID *
          </label>
          <input
            id="booking-comedian"
            value={formComedianId}
            onChange={(e) => setFormComedianId(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            placeholder="Enter comedian ID"
          />
        </div>
      )}

      {!venueId && (
        <div>
          <label htmlFor="booking-venue" className="block text-sm text-zinc-400 mb-1">
            Venue ID *
          </label>
          <input
            id="booking-venue"
            value={formVenueId}
            onChange={(e) => setFormVenueId(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            placeholder="Enter venue ID"
          />
        </div>
      )}

      <div>
        <label htmlFor="booking-date" className="block text-sm text-zinc-400 mb-1">
          Date *
        </label>
        <input
          id="booking-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
        />
        {loadingAvailability && (
          <p className="text-zinc-500 text-xs mt-1">Checking availability...</p>
        )}
        {selectedDateStatus === "booked" && (
          <p className="text-red-400 text-xs mt-1">
            This date is already booked. The comedian may still be available for a different time slot.
          </p>
        )}
        {selectedDateStatus === "pending" && (
          <p className="text-yellow-400 text-xs mt-1">
            There is a pending request for this date.
          </p>
        )}
        {selectedDateStatus === "available" && (
          <p className="text-green-400 text-xs mt-1">This date is available.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="booking-showtype" className="block text-sm text-zinc-400 mb-1">
            Show Type
          </label>
          <select
            id="booking-showtype"
            value={showType}
            onChange={(e) => setShowType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
          >
            <option value="">Select type...</option>
            <option value="headline">Headline</option>
            <option value="feature">Feature</option>
            <option value="host">Host / MC</option>
            <option value="open_mic">Open Mic</option>
            <option value="festival">Festival Set</option>
            <option value="corporate">Corporate Event</option>
            <option value="private">Private Event</option>
          </select>
        </div>
        <div>
          <label htmlFor="booking-budget" className="block text-sm text-zinc-400 mb-1">
            Budget ($)
          </label>
          <input
            id="booking-budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label htmlFor="booking-message" className="block text-sm text-zinc-400 mb-1">
          Message
        </label>
        <textarea
          id="booking-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none resize-none"
          placeholder="Tell the comedian about the show, venue, expected audience..."
        />
        <p className="text-zinc-600 text-xs mt-0.5 text-right">{message.length}/2000</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !formComedianId || !formVenueId || !date}
          className="flex-1 px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Send Booking Request"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
