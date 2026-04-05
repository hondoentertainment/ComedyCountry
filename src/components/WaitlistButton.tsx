"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

interface WaitlistButtonProps {
  eventId: string;
}

export default function WaitlistButton({ eventId }: WaitlistButtonProps) {
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/waitlist`)
      .then((r) => r.json())
      .then((data) => {
        setOnWaitlist(data.onWaitlist || false);
        setCount(data.count || 0);
      })
      .catch((err) => {
        logger.error(
          "Waitlist fetch failed",
          {},
          err instanceof Error ? err : undefined,
        );
      });
  }, [eventId]);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/waitlist`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update waitlist");
      const data = await res.json();
      setOnWaitlist(data.onWaitlist);
      setCount((c) => c + (data.onWaitlist ? 1 : -1));
    } catch (err) {
      logger.error(
        "Waitlist toggle failed",
        {},
        err instanceof Error ? err : undefined,
      );
      setError("Could not update waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        onWaitlist
          ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/30"
          : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
      }`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {onWaitlist ? "On Waitlist" : "Notify Me"}
      {count > 0 && <span className="text-zinc-500 text-xs">({count})</span>}
    </button>
  );
}
