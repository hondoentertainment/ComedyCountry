"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

type Props = {
  eventId: string;
};

export function AttendanceButtons({ eventId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [going, setGoing] = useState(0);
  const [interested, setInterested] = useState(0);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/attendance`)
      .then((r) => r.json())
      .then((data) => {
        setGoing(data.going);
        setInterested(data.interested);
        setUserStatus(data.userStatus);
      })
      .catch((err) => {
        logger.error(
          "AttendanceButtons fetch failed",
          {},
          err instanceof Error ? err : undefined,
        );
      });
  }, [eventId]);

  async function handleClick(status: "going" | "interested") {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=/events/${eventId}`);
      return;
    }
    setLoading(true);
    setError(null);
    const prevGoing = going;
    const prevInterested = interested;
    const prevStatus = userStatus;
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update attendance");
      const data = await res.json();
      const wasStatus = userStatus;
      setUserStatus(data.userStatus);
      // Update counts based on server response
      if (data.userStatus === null) {
        if (wasStatus === "going") setGoing((g) => Math.max(0, g - 1));
        if (wasStatus === "interested")
          setInterested((i) => Math.max(0, i - 1));
      } else if (data.userStatus === "going") {
        setGoing((g) => g + 1);
        if (wasStatus === "interested")
          setInterested((i) => Math.max(0, i - 1));
      } else if (data.userStatus === "interested") {
        setInterested((i) => i + 1);
        if (wasStatus === "going") setGoing((g) => Math.max(0, g - 1));
      }
    } catch (err) {
      logger.error(
        "AttendanceButtons handleClick failed",
        {},
        err instanceof Error ? err : undefined,
      );
      setGoing(prevGoing);
      setInterested(prevInterested);
      setUserStatus(prevStatus);
      setError("Could not update attendance. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => handleClick("going")}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            userStatus === "going"
              ? "bg-brand-gold text-brand-dark"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          {userStatus === "going" ? "Going" : "I'm going"}
        </button>
        <button
          onClick={() => handleClick("interested")}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            userStatus === "interested"
              ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          Interested
        </button>
      </div>
      {(going > 0 || interested > 0) && (
        <p className="text-zinc-500 text-xs text-center">
          {going > 0 && (
            <>
              <span className="text-zinc-300 font-medium">{going}</span> going
            </>
          )}
          {going > 0 && interested > 0 && " · "}
          {interested > 0 && (
            <>
              <span className="text-zinc-300 font-medium">{interested}</span>{" "}
              interested
            </>
          )}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
