"use client";

import { useState } from "react";

export function JoinLeaveButton({
  clubId,
  initialMember,
}: {
  clubId: string;
  initialMember: boolean;
}) {
  const [isMember, setIsMember] = useState(initialMember);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fan-clubs/${clubId}`, {
        method: isMember ? "DELETE" : "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }

      setIsMember(!isMember);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
          isMember
            ? "bg-zinc-700 text-zinc-300 hover:bg-red-900 hover:text-red-300"
            : "bg-brand-gold text-brand-dark hover:bg-brand-gold/90"
        } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "..." : isMember ? "Leave" : "Join Club"}
      </button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
