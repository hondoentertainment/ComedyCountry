"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Thread = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  _count: { replies: number };
};

type Props = {
  entityType: string;
  entityId: string;
};

export function DiscussionSection({ entityType, entityId }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      const res = await fetch(
        `/api/discussions?entityType=${entityType}&entityId=${entityId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (res.status === 401) {
        setError("Please sign in to create a thread.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create thread");
      }

      setTitle("");
      setBody("");
      setShowForm(false);
      fetchThreads();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Discussion</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 transition-colors"
        >
          {showForm ? "Cancel" : "New Thread"}
        </button>
      </div>

      {/* New Thread Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-brand-surface border border-zinc-800 rounded-lg p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="What's on your mind?"
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-600 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold resize-y"
          />
          {error && (
            <p className="text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Posting..." : "Post Thread"}
          </button>
        </form>
      )}

      {/* Thread List */}
      {loading ? (
        <p className="text-zinc-600 text-sm">Loading discussions...</p>
      ) : threads.length > 0 ? (
        <div className="space-y-2">
          {threads.slice(0, 5).map((thread) => (
            <Link
              key={thread.id}
              href={`/discussions/${thread.id}`}
              className="block p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                {thread.isPinned && (
                  <span className="text-xs text-brand-gold font-medium">
                    PINNED
                  </span>
                )}
                <h3 className="text-sm font-medium text-white truncate">
                  {thread.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600">
                <span>{thread._count.replies} replies</span>
                <span>
                  {new Date(thread.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
          {threads.length > 5 && (
            <Link
              href={`/discussions?entityType=${entityType}&entityId=${entityId}`}
              className="block text-center text-sm text-brand-gold hover:underline py-2"
            >
              View all discussions
            </Link>
          )}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">
          No discussions yet. Start the conversation!
        </p>
      )}
    </div>
  );
}
