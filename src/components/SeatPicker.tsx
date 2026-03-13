"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * Interactive Seat Picker Component
 * Visual drag-to-select seat map for comedy venue ticket purchases.
 * Renders the TableLayout JSON seats data as an interactive grid.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface Seat {
  row: number;
  col: number;
  type: "standard" | "premium" | "vip" | "accessible" | "blocked" | "stage";
  label?: string;
  price?: number;
  ticketTypeId?: string;
}

export interface SeatStatus {
  seatKey: string;
  status: "available" | "selected" | "sold" | "held" | "blocked";
}

export interface SeatPickerProps {
  layoutId: string;
  layoutName: string;
  rows: number;
  columns: number;
  seats: Seat[];
  soldSeats?: string[];
  heldSeats?: string[];
  maxSelectable?: number;
  onSelectionChange?: (selected: Seat[]) => void;
  onCheckout?: (selected: Seat[]) => void;
  showLegend?: boolean;
  showPrices?: boolean;
  currency?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function seatKey(row: number, col: number): string {
  return `${row}-${col}`;
}

const SEAT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  standard: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700" },
  premium: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-700" },
  vip: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700" },
  accessible: { bg: "bg-green-100", border: "border-green-400", text: "text-green-700" },
  blocked: { bg: "bg-gray-200", border: "border-gray-300", text: "text-gray-400" },
  stage: { bg: "bg-red-50", border: "border-red-300", text: "text-red-500" },
};

const STATUS_OVERRIDES: Record<string, { bg: string; border: string; cursor: string }> = {
  selected: { bg: "bg-emerald-500", border: "border-emerald-600", cursor: "cursor-pointer" },
  sold: { bg: "bg-gray-300", border: "border-gray-400", cursor: "cursor-not-allowed" },
  held: { bg: "bg-orange-200", border: "border-orange-400", cursor: "cursor-not-allowed" },
  blocked: { bg: "bg-gray-200", border: "border-gray-300", cursor: "cursor-not-allowed" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SeatPicker({
  layoutName,
  rows,
  columns,
  seats,
  soldSeats = [],
  heldSeats = [],
  maxSelectable = 8,
  onSelectionChange,
  onCheckout,
  showLegend = true,
  showPrices = true,
  currency = "$",
}: SeatPickerProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Build lookup maps
  const seatMap = useMemo(() => {
    const map = new Map<string, Seat>();
    for (const seat of seats) {
      map.set(seatKey(seat.row, seat.col), seat);
    }
    return map;
  }, [seats]);

  const soldSet = useMemo(() => new Set(soldSeats), [soldSeats]);
  const heldSet = useMemo(() => new Set(heldSeats), [heldSeats]);

  const getSeatStatus = useCallback(
    (key: string, seat: Seat | undefined): SeatStatus["status"] => {
      if (!seat || seat.type === "blocked" || seat.type === "stage") return "blocked";
      if (soldSet.has(key)) return "sold";
      if (heldSet.has(key)) return "held";
      if (selectedKeys.has(key)) return "selected";
      return "available";
    },
    [soldSet, heldSet, selectedKeys]
  );

  const handleSeatClick = useCallback(
    (key: string) => {
      const seat = seatMap.get(key);
      const status = getSeatStatus(key, seat);

      if (status === "sold" || status === "held" || status === "blocked") return;

      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          if (next.size >= maxSelectable) return prev;
          next.add(key);
        }

        // Notify parent
        const selected = Array.from(next)
          .map((k) => seatMap.get(k))
          .filter((s): s is Seat => s !== undefined);
        onSelectionChange?.(selected);

        return next;
      });
    },
    [seatMap, getSeatStatus, maxSelectable, onSelectionChange]
  );

  const selectedSeats = useMemo(
    () =>
      Array.from(selectedKeys)
        .map((k) => seatMap.get(k))
        .filter((s): s is Seat => s !== undefined),
    [selectedKeys, seatMap]
  );

  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0),
    [selectedSeats]
  );

  // ── Render grid ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Stage indicator */}
      <div className="w-full max-w-lg">
        <div className="bg-gradient-to-r from-red-400 via-red-500 to-red-400 text-white text-center py-2 rounded-t-xl font-bold tracking-wider text-sm uppercase">
          Stage
        </div>
      </div>

      {/* Layout name */}
      <p className="text-sm text-gray-500 font-medium">{layoutName}</p>

      {/* Seat grid */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: columns }, (_, c) => {
            const key = seatKey(r, c);
            const seat = seatMap.get(key);
            const status = getSeatStatus(key, seat);

            if (!seat) {
              return <div key={key} className="w-10 h-10" />;
            }

            const typeStyle = SEAT_TYPE_COLORS[seat.type] || SEAT_TYPE_COLORS.standard;
            const statusStyle = STATUS_OVERRIDES[status];

            const bgClass = statusStyle?.bg ?? typeStyle.bg;
            const borderClass = statusStyle?.border ?? typeStyle.border;
            const cursorClass =
              statusStyle?.cursor ?? (status === "available" ? "cursor-pointer" : "");
            const textClass =
              status === "selected" ? "text-white" : typeStyle.text;

            return (
              <button
                key={key}
                onClick={() => handleSeatClick(key)}
                disabled={status === "sold" || status === "held" || status === "blocked"}
                className={`w-10 h-10 rounded-md border-2 flex flex-col items-center justify-center text-xs font-medium transition-all duration-150 hover:scale-105 ${bgClass} ${borderClass} ${cursorClass} ${textClass} disabled:opacity-50 disabled:hover:scale-100`}
                title={`${seat.label ?? `R${r + 1}C${c + 1}`} - ${seat.type}${seat.price ? ` ${currency}${seat.price}` : ""} (${status})`}
                aria-label={`Seat ${seat.label ?? `Row ${r + 1} Col ${c + 1}`}, ${seat.type}, ${status}`}
              >
                <span className="leading-none">
                  {seat.label ?? `${String.fromCharCode(65 + r)}${c + 1}`}
                </span>
                {showPrices && seat.price && status === "available" && (
                  <span className="text-[8px] opacity-70">
                    {currency}{seat.price}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <LegendItem color="bg-blue-100 border-blue-400" label="Standard" />
          <LegendItem color="bg-purple-100 border-purple-400" label="Premium" />
          <LegendItem color="bg-amber-100 border-amber-400" label="VIP" />
          <LegendItem color="bg-green-100 border-green-400" label="Accessible" />
          <LegendItem color="bg-emerald-500 border-emerald-600" label="Selected" />
          <LegendItem color="bg-gray-300 border-gray-400" label="Sold" />
          <LegendItem color="bg-orange-200 border-orange-400" label="Held" />
        </div>
      )}

      {/* Selection summary & checkout */}
      {selectedSeats.length > 0 && (
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">
              {selectedSeats.length} Seat{selectedSeats.length > 1 ? "s" : ""} Selected
            </h3>
            <span className="text-lg font-bold text-emerald-600">
              {currency}{totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedSeats.map((seat) => (
              <span
                key={seatKey(seat.row, seat.col)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"
              >
                {seat.label ?? `${String.fromCharCode(65 + seat.row)}${seat.col + 1}`}
                {seat.price && (
                  <span className="text-emerald-500">
                    {currency}{seat.price}
                  </span>
                )}
                <button
                  onClick={() => handleSeatClick(seatKey(seat.row, seat.col))}
                  className="ml-0.5 hover:text-red-500"
                  aria-label={`Remove seat ${seat.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedKeys(new Set());
                onSelectionChange?.([]);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={() => onCheckout?.(selectedSeats)}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Checkout {currency}{totalPrice.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Capacity info */}
      <p className="text-xs text-gray-400">
        Max {maxSelectable} seats per order
      </p>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 rounded border-2 ${color}`} />
      <span>{label}</span>
    </div>
  );
}
