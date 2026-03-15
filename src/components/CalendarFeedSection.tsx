"use client";

import { useState } from "react";

export function CalendarFeedSection() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setUrl(null);
    try {
      const res = await fetch("/api/calendar-feed/token", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUrl(data.url);
    } catch {
      setUrl("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!url || url === "error") return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-1">Calendar subscription</h3>
      <p className="text-zinc-400 text-sm mb-4">
        Subscribe to your RSVPs and tickets in Google Calendar, Apple Calendar, or Outlook.
      </p>

      {!url ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 disabled:opacity-70 transition-colors"
        >
          {loading ? "Generating…" : "Generate subscribe link"}
        </button>
      ) : url === "error" ? (
        <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-white font-medium hover:bg-zinc-600 transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-zinc-500 text-xs">
            Add this URL in Google Calendar (Settings → Add calendar → From URL), Apple Calendar
            (File → New Calendar Subscription), or Outlook.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="text-sm text-brand-gold hover:text-brand-gold/80"
          >
            Generate new link
          </button>
        </div>
      )}
    </div>
  );
}
