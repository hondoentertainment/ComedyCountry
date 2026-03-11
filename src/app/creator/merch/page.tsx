"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  externalUrl: string | null;
  inStock: boolean;
}

export default function CreatorMerchPage() {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comedianId, setComedianId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const claimRes = await fetch("/api/comedian-claim");
        if (!claimRes.ok) { setLoading(false); return; }
        const claims = await claimRes.json();
        const approved = Array.isArray(claims)
          ? claims.find((c: { status: string }) => c.status === "APPROVED")
          : claims.status === "APPROVED" ? claims : null;
        if (!approved) { setLoading(false); return; }
        setComedianId(approved.comedianId);

        const res = await fetch(`/api/creator/merch?comedianId=${approved.comedianId}`);
        if (res.ok) setItems(await res.json());
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator/merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          price: parseFloat(price),
          imageUrl: imageUrl.trim() || undefined,
          externalUrl: externalUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setItems((prev) => [...prev, item]);
        setName(""); setDescription(""); setPrice(""); setImageUrl(""); setExternalUrl("");
        setShowForm(false);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this merch item?")) return;
    try {
      const res = await fetch(`/api/creator/merch/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
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
          <h1 className="text-2xl font-bold text-brand-gold">Merch</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          {showForm ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-lg bg-brand-surface border border-zinc-800 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Price ($) *</label>
              <input
                type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Image URL</label>
              <input
                value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">External Link (Shopify, etc.)</label>
            <input
              value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            />
          </div>
          <button
            type="submit" disabled={submitting}
            className="px-6 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Item"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">No merch items yet. Add your first item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <h3 className="text-white font-semibold">{item.name}</h3>
              {item.description && <p className="text-zinc-400 text-sm mt-1">{item.description}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-brand-gold font-bold">${Number(item.price).toFixed(2)}</span>
                <div className="flex gap-2">
                  {item.externalUrl && (
                    <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-zinc-300">
                      View &rarr;
                    </a>
                  )}
                  <button onClick={() => handleDelete(item.id)}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
