"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
}

export default function ClaimPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&type=comedian&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.comedians || []);
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Sign in to claim your profile</h1>
        <Link href="/auth/signin" className="text-brand-gold hover:underline">Sign in</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/comedian-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comedianId: selected.id,
          proofUrl: proofUrl.trim() || null,
          proofNote: proofNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit claim");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-gold mb-4">Claim Submitted!</h1>
        <p className="text-zinc-400 mb-6">
          Your claim for <strong className="text-white">{selected?.name}</strong> has been submitted for review.
          You&apos;ll be notified once it&apos;s approved.
        </p>
        <button onClick={() => router.push("/comedian-dashboard")} className="text-brand-gold hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/comedian-dashboard" className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block">
        &larr; Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Claim Your Profile</h1>
      <p className="text-zinc-400 mb-8">
        Search for your comedian profile and submit proof of identity.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Search */}
        <div className="relative">
          <label htmlFor="comedian-search" className="block text-sm font-medium text-zinc-300 mb-1">Find your profile</label>
          <input
            id="comedian-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            placeholder="Search by name..."
            className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none"
          />
          {results.length > 0 && !selected && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-zinc-700 rounded-lg overflow-hidden z-10">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelected(c); setSearch(c.name); setResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
                    {c.headshotUrl ? (
                      <Image src={c.headshotUrl} alt={c.name} fill className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">{c.name.charAt(0)}</div>
                    )}
                  </div>
                  <span className="text-white text-sm">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30">
            <p className="text-brand-gold text-sm font-medium">
              Claiming: <strong>{selected.name}</strong>
            </p>
          </div>
        )}

        {/* Proof */}
        <div>
          <label htmlFor="proof-url" className="block text-sm font-medium text-zinc-300 mb-1">
            Proof URL (social media profile, website, etc.)
          </label>
          <input
            id="proof-url"
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="proof-note" className="block text-sm font-medium text-zinc-300 mb-1">
            Additional notes (optional)
          </label>
          <textarea
            id="proof-note"
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
            placeholder="Any additional info to verify your identity..."
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!selected || submitting}
          className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Claim"}
        </button>
      </form>
    </div>
  );
}
