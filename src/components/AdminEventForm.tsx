"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SHOW_TYPE_LABELS } from "@/lib/constants";

type EventData = {
  id: string;
  venueId: string;
  date: string;
  showtime: string | null;
  ticketUrl: string | null;
  priceMin: number | string | null;
  priceMax: number | string | null;
  showType: string;
  title: string | null;
  comedians: Array<{ comedian: { id: string; name: string } }>;
};

type VenueOption = { id: string; name: string; city: string; state: string };
type ComedianOption = { id: string; name: string };

export function AdminEventForm({ event }: { event?: EventData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [allComedians, setAllComedians] = useState<ComedianOption[]>([]);
  const [selectedComedians, setSelectedComedians] = useState<string[]>(
    event?.comedians.map(ec => ec.comedian.id) ?? []
  );
  const [comedianSearch, setComedianSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/venues?page=1")
      .then(r => r.json())
      .then(d => setVenues(d.venues ?? []))
      .catch(() => {});
    fetch("/api/admin/comedians?page=1")
      .then(r => r.json())
      .then(d => setAllComedians(d.comedians?.map((c: ComedianOption) => ({ id: c.id, name: c.name })) ?? []))
      .catch(() => {});
  }, []);

  function addComedian(id: string) {
    if (!selectedComedians.includes(id)) {
      setSelectedComedians(prev => [...prev, id]);
    }
    setComedianSearch("");
  }

  function removeComedian(id: string) {
    setSelectedComedians(prev => prev.filter(c => c !== id));
  }

  const filteredComedians = comedianSearch.length >= 2
    ? allComedians.filter(c =>
        c.name.toLowerCase().includes(comedianSearch.toLowerCase()) &&
        !selectedComedians.includes(c.id)
      ).slice(0, 10)
    : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      venueId: form.get("venueId"),
      date: form.get("date"),
      showtime: form.get("showtime"),
      ticketUrl: form.get("ticketUrl"),
      priceMin: form.get("priceMin"),
      priceMax: form.get("priceMax"),
      showType: form.get("showType"),
      title: form.get("title"),
      comedianIds: selectedComedians,
    };

    try {
      const url = event ? `/api/admin/events/${event.id}` : "/api/admin/events";
      const method = event ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save event");
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const dateVal = event?.date ? new Date(event.date).toISOString().split("T")[0] : "";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">
            Title (optional)
          </label>
          <input
            id="title"
            name="title"
            defaultValue={event?.title ?? ""}
            placeholder="Leave blank to auto-generate from comedian names"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="venueId" className="block text-sm font-medium text-zinc-300 mb-1">
            Venue *
          </label>
          <select
            id="venueId"
            name="venueId"
            required
            defaultValue={event?.venueId ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="">Select venue...</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city}, {v.state})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-zinc-300 mb-1">
            Date *
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={dateVal}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="showtime" className="block text-sm font-medium text-zinc-300 mb-1">
            Showtime
          </label>
          <input
            id="showtime"
            name="showtime"
            defaultValue={event?.showtime ?? ""}
            placeholder="e.g., 8:00 PM"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="showType" className="block text-sm font-medium text-zinc-300 mb-1">
            Show Type
          </label>
          <select
            id="showType"
            name="showType"
            defaultValue={event?.showType ?? "HEADLINE"}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            {Object.entries(SHOW_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticketUrl" className="block text-sm font-medium text-zinc-300 mb-1">
            Ticket URL
          </label>
          <input
            id="ticketUrl"
            name="ticketUrl"
            type="url"
            defaultValue={event?.ticketUrl ?? ""}
            placeholder="https://"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="priceMin" className="block text-sm font-medium text-zinc-300 mb-1">
            Price Min ($)
          </label>
          <input
            id="priceMin"
            name="priceMin"
            type="number"
            step="0.01"
            defaultValue={event?.priceMin != null ? Number(event.priceMin) : ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="priceMax" className="block text-sm font-medium text-zinc-300 mb-1">
            Price Max ($)
          </label>
          <input
            id="priceMax"
            name="priceMax"
            type="number"
            step="0.01"
            defaultValue={event?.priceMax != null ? Number(event.priceMax) : ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-300 mb-2">Comedians</p>
        <div className="space-y-2">
          {selectedComedians.map((id, i) => {
            const comedian = allComedians.find(c => c.id === id) ||
              event?.comedians.find(ec => ec.comedian.id === id)?.comedian;
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700">
                <span className="text-xs text-zinc-500 w-16">{i === 0 ? "Headline" : "Feature"}</span>
                <span className="text-white text-sm flex-1">{comedian?.name ?? id}</span>
                <button
                  type="button"
                  onClick={() => removeComedian(id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          <div className="relative">
            <input
              type="text"
              value={comedianSearch}
              onChange={e => setComedianSearch(e.target.value)}
              placeholder="Search to add comedian..."
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
            {filteredComedians.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                {filteredComedians.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addComedian(c.id)}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : event ? "Update Event" : "Create Event"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/events")}
          className="px-6 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
