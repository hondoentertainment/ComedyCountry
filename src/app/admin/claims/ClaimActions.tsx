"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClaimActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update claim");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 shrink-0 items-center">
      {error && (
        <span className="text-xs text-red-400" role="alert">{error}</span>
      )}
      <button
        type="button"
        onClick={() => handleAction("approve")}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => handleAction("reject")}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
