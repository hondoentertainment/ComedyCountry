"use client";

import { useState, useCallback } from "react";

interface SocialVerificationProps {
  comedianId: string;
  comedianName: string;
  socialLinks: Array<{ platform: string; url: string }>;
  website: string | null;
}

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", icon: "𝕏" },
  { id: "instagram", label: "Instagram", icon: "📷" },
  { id: "youtube", label: "YouTube", icon: "▶" },
  { id: "tiktok", label: "TikTok", icon: "♪" },
  { id: "facebook", label: "Facebook", icon: "f" },
];

export function SocialVerification({ comedianId, comedianName, socialLinks, website }: SocialVerificationProps) {
  const [step, setStep] = useState<"select" | "verify" | "done">("select");
  const [platform, setPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ autoApproved: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!platform || !profileUrl) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/comedian-claim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comedianId,
          socialProof: { platform, profileUrl, handle },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      setResult({ autoApproved: data.autoApproved, message: data.message });
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }, [comedianId, platform, profileUrl, handle]);

  if (step === "done" && result) {
    return (
      <div className={`p-6 rounded-lg border ${result.autoApproved ? "bg-green-500/5 border-green-500/30" : "bg-brand-gold/5 border-brand-gold/30"}`}>
        <h3 className="text-lg font-bold text-white mb-2">
          {result.autoApproved ? "✓ Verified!" : "Claim Submitted"}
        </h3>
        <p className="text-zinc-400 text-sm">{result.message}</p>
        {result.autoApproved && (
          <a href="/comedian-dashboard" className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm">
            Go to Dashboard
          </a>
        )}
      </div>
    );
  }

  if (step === "verify") {
    const matchingLink = socialLinks.find((l) => l.platform.toLowerCase() === platform);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Verify via {PLATFORMS.find((p) => p.id === platform)?.label}</h3>

        {matchingLink && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-300">
            We found a {platform} link on {comedianName}&apos;s profile. If your URL matches, verification may be automatic.
          </div>
        )}

        <div>
          <label className="block text-zinc-400 text-sm mb-1">Your {platform} profile URL</label>
          <input
            type="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder={`https://${platform}.com/yourhandle`}
            className="w-full p-3 rounded-lg bg-brand-surface border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1">Handle (optional)</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@yourhandle"
            className="w-full p-3 rounded-lg bg-brand-surface border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-brand-gold focus:outline-none"
          />
        </div>

        {website && (
          <p className="text-zinc-500 text-xs">
            Tip: Using an email matching <strong>{website}</strong> increases auto-verification chances.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => setStep("select")} className="px-4 py-2 rounded-lg bg-brand-surface border border-zinc-700 text-zinc-400 text-sm hover:text-white">
            Back
          </button>
          <button
            onClick={submit}
            disabled={loading || !profileUrl}
            className="px-6 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Submit Verification"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Verify Your Identity</h3>
      <p className="text-zinc-400 text-sm">
        Choose a platform to prove you&apos;re {comedianName}. If we can match your social profile, you&apos;ll be verified instantly.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => {
          const hasLink = socialLinks.some((l) => l.platform.toLowerCase() === p.id);
          return (
            <button
              key={p.id}
              onClick={() => { setPlatform(p.id); setStep("verify"); }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                hasLink
                  ? "bg-brand-gold/5 border-brand-gold/20 hover:border-brand-gold/40"
                  : "bg-brand-surface border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <span className="text-lg mr-2">{p.icon}</span>
              <span className="text-white text-sm font-medium">{p.label}</span>
              {hasLink && <span className="ml-1 text-xs text-brand-gold">Match found</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
