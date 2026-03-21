"use client";

import { useEffect, useState, useCallback } from "react";

type Props = {
  venueId: string;
};

export function CheckInButton({ venueId }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkins?venueId=${venueId}`);
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch (err) {
      console.error('CheckIn count fetch failed:', err);
    }
  }, [venueId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });

      if (res.status === 401) {
        setError("Sign in to check in");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to check in");
      }

      setCheckedIn(true);
      setCount((prev) => (prev !== null ? prev + 1 : 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleCheckIn}
        disabled={loading || checkedIn}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
          checkedIn
            ? "bg-green-900/50 text-green-400 cursor-default"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white"
        } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading
          ? "..."
          : checkedIn
            ? "Checked In"
            : "Check In"}
      </button>
      {count !== null && (
        <span className="text-sm text-zinc-500">
          {count} {count === 1 ? "person" : "people"} here now
        </span>
      )}
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
