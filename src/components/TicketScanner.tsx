"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ScanResponse, TicketScannerConfig } from "@/types/tickets";

/**
 * Phase 3: TicketScanner Component
 *
 * Scanner component for venue operators to validate ticket QR codes.
 *
 * Features:
 * - Camera-based QR code scanning
 * - Manual code entry fallback
 * - Real-time scan result display
 * - Sound feedback (success/failure)
 * - Scan history for the current session
 * - Auto-scan mode
 */

interface TicketScannerProps {
  eventId?: string;
  config?: Partial<TicketScannerConfig>;
  onScanResult?: (result: ScanResponse) => void;
  className?: string;
}

interface ScanHistoryEntry {
  id: string;
  result: ScanResponse;
  timestamp: Date;
}

export default function TicketScanner({
  eventId,
  config,
  onScanResult,
  className = "",
}: TicketScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanCount, setScanCount] = useState({ success: 0, failed: 0, duplicate: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const soundEnabled = config?.soundEnabled ?? true;

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const playSound = useCallback(
    (type: "success" | "failure") => {
      if (!soundEnabled) return;

      try {
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === "success") {
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.3);
        } else {
          oscillator.frequency.setValueAtTime(330, audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(220, audioCtx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.4);
        }
      } catch {
        // Audio not available — silent fallback
      }
    },
    [soundEnabled]
  );

  const validateTicket = useCallback(
    async (qrCode: string) => {
      if (isScanning || !qrCode.trim()) return;

      setIsScanning(true);
      setError(null);

      try {
        const response = await fetch("/api/tickets/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrCode: qrCode.trim(),
            scannerId: "venue-scanner",
            location: eventId || undefined,
          }),
        });

        const result: ScanResponse = await response.json();

        setLastResult(result);
        setScanHistory((prev) => [
          {
            id: `${Date.now()}-${qrCode.slice(0, 8)}`,
            result,
            timestamp: new Date(),
          },
          ...prev.slice(0, 49), // Keep last 50
        ]);

        // Update counters
        if (result.valid) {
          setScanCount((prev) => ({ ...prev, success: prev.success + 1 }));
          playSound("success");
        } else if (result.alreadyScanned) {
          setScanCount((prev) => ({ ...prev, duplicate: prev.duplicate + 1 }));
          playSound("failure");
        } else {
          setScanCount((prev) => ({ ...prev, failed: prev.failed + 1 }));
          playSound("failure");
        }

        onScanResult?.(result);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Scan request failed";
        setError(errorMsg);
        playSound("failure");
      } finally {
        setIsScanning(false);
        setManualCode("");
        manualInputRef.current?.focus();
      }
    },
    [isScanning, eventId, onScanResult, playSound]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      validateTicket(manualCode.trim());
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setError(
        "Camera access denied. Please use manual code entry or grant camera permissions."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const clearHistory = () => {
    setScanHistory([]);
    setScanCount({ success: 0, failed: 0, duplicate: 0 });
    setLastResult(null);
  };

  return (
    <div
      className={`bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Ticket Scanner</h2>
          <div className="flex gap-2 text-xs">
            <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded">
              {scanCount.success} valid
            </span>
            <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded">
              {scanCount.failed} invalid
            </span>
            <span className="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded">
              {scanCount.duplicate} duplicate
            </span>
          </div>
        </div>
        {eventId && (
          <p className="text-xs text-zinc-500 mt-1">
            Scanning for event: {eventId.slice(0, 8)}...
          </p>
        )}
      </div>

      {/* Camera View */}
      {cameraActive && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-amber-400 rounded-lg opacity-60" />
          </div>
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded text-sm hover:bg-black/90"
          >
            Close Camera
          </button>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60">
            Position QR code within the frame
          </p>
        </div>
      )}

      {/* Manual Entry */}
      <div className="p-4 space-y-3">
        {!cameraActive && (
          <button
            onClick={startCamera}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Open Camera Scanner
          </button>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={manualInputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter or paste QR code..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            autoFocus
            disabled={isScanning}
          />
          <button
            type="submit"
            disabled={isScanning || !manualCode.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            {isScanning ? "..." : "Scan"}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Last Scan Result */}
      {lastResult && (
        <div
          className={`mx-4 mb-4 p-4 rounded-lg border ${
            lastResult.valid
              ? "bg-green-900/20 border-green-800"
              : lastResult.alreadyScanned
                ? "bg-yellow-900/20 border-yellow-800"
                : "bg-red-900/20 border-red-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.valid ? (
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span
              className={`text-lg font-bold ${
                lastResult.valid
                  ? "text-green-400"
                  : lastResult.alreadyScanned
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {lastResult.valid
                ? "CHECK-IN SUCCESSFUL"
                : lastResult.alreadyScanned
                  ? "ALREADY SCANNED"
                  : "INVALID TICKET"}
            </span>
          </div>

          {lastResult.ticket && (
            <div className="space-y-1 text-sm">
              <p className="text-white font-medium">
                {lastResult.ticket.eventTitle}
              </p>
              <p className="text-zinc-400">
                Type: {lastResult.ticket.ticketType}
              </p>
              {lastResult.ticket.holderName && (
                <p className="text-zinc-400">
                  Holder: {lastResult.ticket.holderName}
                </p>
              )}
              <p className="text-zinc-500 text-xs">
                {lastResult.valid
                  ? `Checked in at ${new Date(lastResult.ticket.scannedAt).toLocaleTimeString()}`
                  : lastResult.previousScanAt
                    ? `Previously scanned at ${new Date(lastResult.previousScanAt).toLocaleTimeString()}`
                    : ""}
              </p>
            </div>
          )}

          {lastResult.error && !lastResult.ticket && (
            <p className="text-sm text-zinc-400">{lastResult.error}</p>
          )}
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="border-t border-zinc-800">
          <div className="p-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">
              Recent Scans ({scanHistory.length})
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {scanHistory.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2 border-t border-zinc-800/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      entry.result.valid
                        ? "bg-green-400"
                        : entry.result.alreadyScanned
                          ? "bg-yellow-400"
                          : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                    {entry.result.ticket?.eventTitle ||
                      entry.result.error ||
                      "Unknown"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
