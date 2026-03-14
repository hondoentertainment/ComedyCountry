"use client";

import { useState } from "react";

export function ReplyForm({ threadId }: { threadId: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/discussions/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to post reply");
      }

      setBody("");
      setSuccess(true);
      // Refresh to show new reply
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Post a Reply</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write your reply..."
        className="w-full rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-600 px-4 py-3 focus:outline-none focus:border-brand-gold transition-colors resize-y"
      />
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green-400 text-sm">Reply posted!</p>
      )}
      <button
        type="submit"
        disabled={loading || !body.trim()}
        className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Posting..." : "Reply"}
      </button>
    </form>
  );
}
