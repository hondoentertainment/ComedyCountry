"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { QRCodeData } from "@/types/tickets";

/**
 * Phase 3: TicketQRCode Component
 *
 * Renders a QR code for a purchased ticket using Canvas API.
 * Generates a visual QR code from the ticket's unique qrCode string.
 *
 * Features:
 * - Pure Canvas-based QR rendering (no external library)
 * - Ticket details display
 * - Download functionality
 * - Responsive sizing
 * - Dark theme to match Punchline Atlas brand
 */

interface TicketQRCodeProps {
  ticketData: QRCodeData;
  size?: number;
  showDetails?: boolean;
  className?: string;
}

export default function TicketQRCode({
  ticketData,
  size = 200,
  showDetails = true,
  className = "",
}: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrRendered, setQrRendered] = useState(false);

  // Generate a simple QR-like pattern from the qrCode string
  // (In production, use a proper QR library like `qrcode`)
  const renderQRCode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const moduleCount = 25; // Grid size
    const moduleSize = size / moduleCount;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Generate deterministic pattern from qrCode
    const data = ticketData.qrCode;
    const modules: boolean[][] = Array.from({ length: moduleCount }, () =>
      Array(moduleCount).fill(false)
    );

    // Finder patterns (top-left, top-right, bottom-left)
    const drawFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          modules[startRow + r][startCol + c] = isOuter || isInner;
        }
      }
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(0, moduleCount - 7);
    drawFinderPattern(moduleCount - 7, 0);

    // Timing patterns
    for (let i = 8; i < moduleCount - 8; i++) {
      modules[6][i] = i % 2 === 0;
      modules[i][6] = i % 2 === 0;
    }

    // Data modules — hash the qrCode to fill the grid
    let hashIdx = 0;
    const hashStr = simpleHash(data);
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        // Skip finder patterns and timing
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= moduleCount - 8) ||
          (r >= moduleCount - 8 && c < 8) ||
          r === 6 ||
          c === 6
        ) {
          continue;
        }
        const charCode = hashStr.charCodeAt(hashIdx % hashStr.length);
        modules[r][c] = (charCode + r * 3 + c * 7) % 3 !== 0;
        hashIdx++;
      }
    }

    // Draw modules
    ctx.fillStyle = "#000000";
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (modules[r][c]) {
          ctx.fillRect(
            Math.round(c * moduleSize),
            Math.round(r * moduleSize),
            Math.ceil(moduleSize),
            Math.ceil(moduleSize)
          );
        }
      }
    }

    setQrRendered(true);
  }, [ticketData.qrCode, size]);

  useEffect(() => {
    renderQRCode();
  }, [renderQRCode]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `ticket-${ticketData.ticketId.slice(0, 8)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const formattedDate = ticketData.eventDate
    ? new Date(ticketData.eventDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* QR Code */}
      <div className="flex justify-center p-6 bg-white">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded"
          aria-label={`QR code for ticket ${ticketData.ticketId}`}
        />
      </div>

      {/* Ticket Details */}
      {showDetails && (
        <div className="p-4 space-y-2">
          <h3 className="text-lg font-bold text-white truncate">
            {ticketData.eventTitle}
          </h3>
          <p className="text-sm text-zinc-400">{ticketData.venueName}</p>

          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">{formattedDate}</span>
            {ticketData.showtime && (
              <span className="text-amber-400 font-medium">
                {ticketData.showtime}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              {ticketData.ticketType}
            </span>
            {ticketData.holderName && (
              <span className="text-xs text-zinc-400">
                {ticketData.holderName}
              </span>
            )}
          </div>

          <p className="text-[10px] text-zinc-600 font-mono break-all pt-1">
            {ticketData.qrCode}
          </p>
        </div>
      )}

      {/* Actions */}
      {qrRendered && (
        <div className="px-4 pb-4">
          <button
            onClick={handleDownload}
            className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            Download QR Code
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Simple hash function for deterministic QR-like pattern generation.
 * NOT cryptographically secure — used only for visual rendering.
 */
function simpleHash(str: string): string {
  let hash = 0;
  const chars: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
    chars.push(Math.abs(hash));
  }
  // Extend to ensure enough data
  while (chars.length < 200) {
    hash = ((hash << 5) - hash + chars[chars.length - 1]) | 0;
    chars.push(Math.abs(hash));
  }
  return chars.map((c) => String.fromCharCode(48 + (c % 74))).join("");
}
