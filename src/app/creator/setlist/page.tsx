"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SetlistEntry {
  id: string;
  bitName: string;
  eventId: string | null;
  durationMin: number | null;
  notes: string | null;
  crowdRating: number | null;
  performedAt: string;
}

export default function CreatorSetlistPage() {
  const [entries, setEntries] = useState<SetlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [bitName, setBitName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  const [crowdRating, setCrowdRating] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creator/setlist");
        if (res.ok) setEntries(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!bitName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator/setlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bitName: bitName.trim(),
          durationMin: durationMin ? parseFloat(durationMin) : undefined,
          notes: notes.trim() || undefined,
          crowdRating: crowdRating ? parseInt(crowdRating) : undefined,
        }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        setBitName(""); setDurationMin(""); setNotes(""); setCrowdRating("");
        setShowForm(false);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  const ratingStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <span className="text-brand-gold">
        {"★".repeat(rating)}
        <span className="text-zinc-700">{"★".repeat(5 - rating)}</span>
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
            &larr; Creator Hub
          </Link>
          <h1 className="text-2xl font-bold text-brand-gold">Setlist Tracker</h1>
          <p className="text-zinc-500 text-sm mt-1">Private log of your bits and performances</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          {showForm ? "Cancel" : "+ Log Bit"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-lg bg-brand-surface border border-zinc-800 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Bit Name *</label>
            <input
              value={bitName} onChange={(e) => setBitName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              placeholder="e.g. Airport Security"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Duration (minutes)</label>
              <input
                type="number" step="0.5" min="0.5" value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Crowd Rating (1-5)</label>
              <select
                value={crowdRating} onChange={(e) => setCrowdRating(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              >
                <option value="">No rating</option>
                <option value="1">1 - Bombed</option>
                <option value="2">2 - Weak</option>
                <option value="3">3 - Okay</option>
                <option value="4">4 - Strong</option>
                <option value="5">5 - Killed it</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              placeholder="What worked, what didn't..."
            />
          </div>
          <button
            type="submit" disabled={submitting}
            className="px-6 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Log Entry"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">No setlist entries yet. Start logging your bits!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4 rounded-lg bg-brand-surface border border-zinc-800 flex items-start justify-between">
              <div>
                <h3 className="text-white font-semibold">{entry.bitName}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                  {entry.durationMin && <span>{entry.durationMin} min</span>}
                  {entry.crowdRating && ratingStars(entry.crowdRating)}
                </div>
                {entry.notes && <p className="text-zinc-500 text-sm mt-2">{entry.notes}</p>}
              </div>
              <span className="text-zinc-600 text-xs whitespace-nowrap ml-4">
                {new Date(entry.performedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
