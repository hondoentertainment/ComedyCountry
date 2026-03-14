"use client";

import { useState } from "react";

interface ScanResult {
  valid: boolean;
  error?: string;
  scannedAt?: string;
  ticket?: {
    id: string;
    status: string;
    purchasePrice: { toString(): string };
    ticketType: { name: string };
    event: {
      title: string | null;
      date: string;
      showtime: string | null;
      venue: { name: string } | null;
      comedians: Array<{ comedian: { name: string } }>;
    };
  };
}

export default function ScanTicketPage() {
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleScan() {
    if (!qrCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tickets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: qrCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ valid: false, error: data.error || "Scan failed" });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ valid: false, error: "Scan failed" });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setQrCode("");
    setResult(null);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-1">Scan Tickets</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Enter or scan a QR code to validate a ticket at the door.
        </p>

        {/* QR Code Input */}
        <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 mb-6">
          <label
            htmlFor="qrCode"
            className="block text-zinc-300 text-sm font-medium mb-2"
          >
            QR Code
          </label>
          <input
            id="qrCode"
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleScan();
            }}
            placeholder="Paste or type QR code value..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent font-mono text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleScan}
              disabled={loading || !qrCode.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Scanning..." : "Scan Ticket"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Scan Result */}
        {result && (
          <div
            className={`rounded-card border p-6 ${
              result.valid
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  result.valid
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {result.valid ? "\u2713" : "\u2717"}
              </div>
              <div>
                <h2
                  className={`text-lg font-bold ${
                    result.valid ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {result.valid ? "Valid Ticket" : "Invalid"}
                </h2>
                {result.error && (
                  <p className="text-red-300 text-sm">{result.error}</p>
                )}
              </div>
            </div>

            {result.ticket && (
              <div className="space-y-2 text-sm border-t border-zinc-700/50 pt-4">
                <p className="text-white font-medium">
                  {result.ticket.event.title ||
                    result.ticket.event.comedians
                      ?.map((ec) => ec.comedian.name)
                      .join(", ") ||
                    "Comedy Show"}
                </p>
                {result.ticket.event.venue && (
                  <p className="text-zinc-400">
                    {result.ticket.event.venue.name}
                  </p>
                )}
                <p className="text-zinc-400">
                  {new Date(result.ticket.event.date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                  {result.ticket.event.showtime
                    ? ` at ${result.ticket.event.showtime}`
                    : ""}
                </p>
                <p className="text-zinc-400">
                  {result.ticket.ticketType.name} &mdash; $
                  {result.ticket.purchasePrice.toString()}
                </p>
                {result.scannedAt && (
                  <p className="text-zinc-500 text-xs">
                    Previously scanned:{" "}
                    {new Date(result.scannedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
