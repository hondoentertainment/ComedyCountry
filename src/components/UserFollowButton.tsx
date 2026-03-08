"use client";

import { useState, useCallback } from "react";

interface UserFollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  initialCount?: number;
}

export function UserFollowButton({ userId, initialFollowing = false, initialCount = 0 }: UserFollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setCount((c) => c + (data.following ? 1 : -1));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [userId]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        following
          ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/30 hover:bg-brand-gold/10"
          : "bg-brand-surface border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
      }`}
    >
      {following ? (
        <>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Follow
        </>
      )}
      {count > 0 && <span className="text-xs opacity-70">{count}</span>}
    </button>
  );
}
