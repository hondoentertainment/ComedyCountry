"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminVenueActions({ venueId, venueName }: { venueId: string; venueName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete venue "${venueName}"? This will also delete all associated events and photos.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Failed to delete venue");
      }
    } catch {
      setError("Failed to delete venue");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-400" role="alert">{error}</span>
      )}
      <a
        href={`/admin/venues/${venueId}`}
        className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-colors"
      >
        Edit
      </a>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1 rounded-md bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
      >
        {deleting ? "..." : "Delete"}
      </button>
    </div>
  );
}
