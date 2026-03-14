"use client";

import { useState } from "react";
import { useToast } from "./Toast";

type FollowButtonProps = {
  type: "comedian" | "venue";
  id: string;
  initialFollowing: boolean;
  signInUrl?: string;
};

export function FollowButton({
  type,
  id,
  initialFollowing,
  signInUrl = "/auth/signin",
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    const previousFollowing = following;
    setFollowing((prev) => !prev);
    setLoading(true);
    try {
      const res = await fetch(`/api/follow/${type}/${id}`, {
        method: "POST",
      });

      if (res.status === 401) {
        setFollowing(previousFollowing);
        const callback = encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname : "/"
        );
        window.location.href = `${signInUrl}?callbackUrl=${callback}`;
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update follow");
      }

      const data = (await res.json()) as { following: boolean };
      setFollowing(data.following);
      toast(data.following ? `Following ${type}!` : `Unfollowed ${type}.`);
    } catch (err) {
      setFollowing(previousFollowing);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        aria-label={following ? "Following (click to unfollow)" : "Follow"}
        className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
          following
            ? "bg-brand-gold text-brand-dark hover:bg-brand-gold/90"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white"
        } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "…" : following ? "Following" : "Follow"}
      </button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
