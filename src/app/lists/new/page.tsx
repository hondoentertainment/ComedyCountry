"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function NewListPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Sign in to create lists</h1>
        <Link href="/auth/signin" className="text-brand-gold hover:underline">Sign in</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, isPublic }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create list");
      }
      const list = await res.json();
      router.push(`/lists/${list.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/lists" className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block">
        &larr; All lists
      </Link>
      <h1 className="text-3xl font-bold text-brand-gold mb-8">Create a Comedy List</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My favorite comedians..."
            required
            className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this list about?"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? "bg-brand-gold" : "bg-zinc-700"}`}
            role="switch"
            aria-checked={isPublic}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm text-zinc-300">{isPublic ? "Public" : "Private"}</span>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating..." : "Create List"}
        </button>
      </form>
    </div>
  );
}
