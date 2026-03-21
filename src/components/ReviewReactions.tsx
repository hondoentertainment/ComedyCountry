"use client";

import { useState, useEffect } from "react";

interface ReviewReactionsProps {
  reviewType: "event_review" | "venue_review";
  reviewId: string;
}

export default function ReviewReactions({ reviewType, reviewId }: ReviewReactionsProps) {
  const [helpful, setHelpful] = useState(0);
  const [funny, setFunny] = useState(0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reviews/reactions?reviewType=${reviewType}&reviewId=${reviewId}`)
      .then((r) => r.json())
      .then((data) => {
        setHelpful(data.helpful || 0);
        setFunny(data.funny || 0);
        setUserReaction(data.userReaction || null);
      })
      .catch((err) => {
        console.error('ReviewReactions fetch failed:', err);
      });
  }, [reviewType, reviewId]);

  async function react(reactionType: string) {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/reviews/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewType, reviewId, reactionType }),
      });
      const data = await res.json();

      if (data.action === "removed") {
        setUserReaction(null);
        if (reactionType === "helpful") setHelpful((h) => Math.max(0, h - 1));
        else setFunny((f) => Math.max(0, f - 1));
      } else if (data.action === "added") {
        // If switching from other reaction, decrement old
        if (userReaction === "helpful") setHelpful((h) => Math.max(0, h - 1));
        if (userReaction === "funny") setFunny((f) => Math.max(0, f - 1));
        setUserReaction(reactionType);
        if (reactionType === "helpful") setHelpful((h) => h + 1);
        else setFunny((f) => f + 1);
      } else if (data.action === "updated") {
        if (userReaction === "helpful") setHelpful((h) => Math.max(0, h - 1));
        if (userReaction === "funny") setFunny((f) => Math.max(0, f - 1));
        setUserReaction(reactionType);
        if (reactionType === "helpful") setHelpful((h) => h + 1);
        else setFunny((f) => f + 1);
      }
    } catch (err) {
      console.error('ReviewReactions react failed:', err);
      setError('Could not save reaction. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
    {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => react("helpful")}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
          userReaction === "helpful"
            ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
            : "bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
        Helpful{helpful > 0 && ` (${helpful})`}
      </button>
      <button
        onClick={() => react("funny")}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
          userReaction === "funny"
            ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
            : "bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Funny{funny > 0 && ` (${funny})`}
      </button>
    </div>
    </div>
  );
}
