"use client";

import { useState } from "react";

export function ListActions({ listId, initialSaved }: { listId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave() {
    setLoading(true);
    setSaved(!saved);
    try {
      const res = await fetch(`/api/lists/${listId}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
      } else {
        setSaved(saved);
      }
    } catch {
      setSaved(saved);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        saved
          ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
          : "bg-brand-surface border border-zinc-700 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {saved ? "Saved" : "Save list"}
    </button>
  );
}
