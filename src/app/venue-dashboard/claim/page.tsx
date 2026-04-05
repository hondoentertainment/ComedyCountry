"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { logger } from "@/lib/logger";

interface VenueOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

export default function VenueClaimPage() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [businessUrl, setBusinessUrl] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Search venues
  useEffect(() => {
    if (query.length < 2) {
      setVenues([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&type=venues&limit=5`)
        .then((r) => r.json())
        .then((data) => setVenues(data.venues || []))
        .catch((err) => {
          logger.error(
            "VenueClaim search failed",
            {},
            err instanceof Error ? err : undefined,
          );
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleAutoVerify() {
    if (!selectedVenue || !businessUrl) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/venue-claim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: selectedVenue.id, businessUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message: data.message || "Claim submitted!",
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Verification failed.",
        });
      }
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualClaim() {
    if (!selectedVenue) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/venue-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenue.id,
          proofUrl: proofUrl || null,
          proofNote: proofNote || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: "Claim submitted for review!" });
      } else {
        setResult({ success: false, message: data.error || "Claim failed." });
      }
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-brand-gold mb-4">
          Claim Your Venue
        </h1>
        <p className="text-zinc-400 mb-6">
          Sign in to claim your venue and access the management dashboard.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/venue-dashboard/claim"
          className="px-6 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-gold mb-2">
        Claim Your Venue
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Verify ownership of your venue to unlock analytics, event management,
        and promotion tools.
      </p>

      {result && (
        <div
          className={`p-4 rounded-lg mb-6 border ${result.success ? "bg-green-900/20 border-green-700 text-green-400" : "bg-red-900/20 border-red-700 text-red-400"}`}
        >
          <p className="text-sm">{result.message}</p>
          {result.success && (
            <Link
              href="/venue-dashboard"
              className="text-brand-gold text-sm mt-2 inline-block hover:underline"
            >
              Go to Dashboard &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Search for venue */}
      <div className="mb-6">
        <label className="block text-zinc-300 text-sm font-medium mb-2">
          Find your venue
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedVenue(null);
          }}
          placeholder="Search venues by name..."
          className="w-full px-4 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-white placeholder-zinc-500 text-sm"
        />
        {venues.length > 0 && !selectedVenue && (
          <div className="mt-1 rounded-lg bg-brand-surface border border-zinc-700 divide-y divide-zinc-800">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v);
                  setQuery(v.name);
                  setVenues([]);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                <p className="text-white text-sm">{v.name}</p>
                <p className="text-zinc-500 text-xs">
                  {v.city}, {v.state}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedVenue && (
        <>
          <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800 mb-6">
            <p className="text-white font-medium">{selectedVenue.name}</p>
            <p className="text-zinc-500 text-sm">
              {selectedVenue.city}, {selectedVenue.state}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("auto")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "auto" ? "bg-brand-gold text-brand-dark" : "bg-brand-surface border border-zinc-800 text-zinc-400"}`}
            >
              Quick Verify
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "manual" ? "bg-brand-gold text-brand-dark" : "bg-brand-surface border border-zinc-800 text-zinc-400"}`}
            >
              Manual Claim
            </button>
          </div>

          {mode === "auto" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Business website or social media URL
                </label>
                <input
                  type="url"
                  value={businessUrl}
                  onChange={(e) => setBusinessUrl(e.target.value)}
                  placeholder="https://yourvenuewebsite.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-white placeholder-zinc-500 text-sm"
                />
                <p className="text-zinc-600 text-xs mt-1">
                  We&apos;ll verify by matching your email domain or social link
                  to the venue.
                </p>
              </div>
              <button
                onClick={handleAutoVerify}
                disabled={!businessUrl || submitting}
                className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify Now"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Proof URL (optional)
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-white placeholder-zinc-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Additional notes
                </label>
                <textarea
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="How can we verify you own/manage this venue?"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-white placeholder-zinc-500 text-sm resize-none"
                />
              </div>
              <button
                onClick={handleManualClaim}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
