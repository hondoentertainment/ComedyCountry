"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ContentItem {
  id: string;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  embedUrl: string | null;
  isGated: boolean;
  publishedAt: string;
}

export default function CreatorContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comedianId, setComedianId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [embedUrl, setEmbedUrl] = useState("");
  const [isGated, setIsGated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const claimRes = await fetch("/api/comedian-claim");
        if (!claimRes.ok) {
          setLoading(false);
          return;
        }
        const claims = await claimRes.json();
        const approved = Array.isArray(claims)
          ? claims.find((c: { status: string }) => c.status === "APPROVED")
          : claims.status === "APPROVED"
            ? claims
            : null;
        if (!approved) {
          setLoading(false);
          return;
        }
        const cId = approved.comedianId;
        setComedianId(cId);

        const contentRes = await fetch(`/api/creator/content?comedianId=${cId}`);
        if (contentRes.ok) {
          setItems(await contentRes.json());
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/creator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          mediaUrl: mediaUrl.trim() || undefined,
          mediaType: mediaType || undefined,
          embedUrl: embedUrl.trim() || undefined,
          isGated,
        }),
      });

      if (res.ok) {
        const item = await res.json();
        setItems((prev) => [item, ...prev]);
        setTitle("");
        setBody("");
        setMediaUrl("");
        setEmbedUrl("");
        setIsGated(false);
        setShowForm(false);
      }
    } catch {
      // ignore
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this content?")) return;
    try {
      const res = await fetch(`/api/creator/content/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
            &larr; Creator Hub
          </Link>
          <h1 className="text-2xl font-bold text-brand-gold">Exclusive Content</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          {showForm ? "Cancel" : "+ New Post"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-lg bg-brand-surface border border-zinc-800 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Media URL</label>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Embed URL (YouTube/TikTok)</label>
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              placeholder="https://youtube.com/embed/..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isGated}
              onChange={(e) => setIsGated(e.target.checked)}
              className="rounded border-zinc-700 bg-brand-dark text-brand-gold focus:ring-brand-gold"
            />
            Subscriber-only (gated content)
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Publishing..." : "Publish"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">No exclusive content yet. Create your first post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold">
                    {item.title}
                    {item.isGated && (
                      <span className="ml-2 text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded">
                        Gated
                      </span>
                    )}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
              {item.body && (
                <p className="text-zinc-300 text-sm mt-3 whitespace-pre-wrap">{item.body}</p>
              )}
              {item.mediaUrl && (
                <p className="text-zinc-500 text-xs mt-2">
                  Media: {item.mediaType} &mdash; {item.mediaUrl}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
