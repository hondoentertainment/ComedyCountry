"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

/**
 * White-Label Embeddable Checkout Widget
 *
 * Can be embedded on venue websites via <script> tag or iframe.
 * Supports:
 * - Configurable branding (colors, logo)
 * - Ticket type selection
 * - Quantity picker
 * - Fee transparency
 * - Email capture
 * - Responsive design
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TicketOption {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  description?: string;
}

export interface CheckoutConfig {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  venueName: string;
  venueCity?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  showFeeBreakdown?: boolean;
  maxTicketsPerOrder?: number;
  apiBaseUrl?: string;
}

export interface OrderItem {
  ticketTypeId: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
}

interface FeeBreakdown {
  basePrice: number;
  serviceFee: number;
  processingFee: number;
  totalPrice: number;
  feePercentage: number;
}

type CheckoutStep = "select" | "details" | "confirm" | "success";

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICE_FEE_RATE = 0.1;
const PROCESSING_FEE_RATE = 0.029;
const PROCESSING_FEE_FLAT = 0.3;

function calculateFees(basePrice: number): FeeBreakdown {
  const serviceFee = Math.round(basePrice * SERVICE_FEE_RATE * 100) / 100;
  const processingFee =
    Math.round((basePrice * PROCESSING_FEE_RATE + PROCESSING_FEE_FLAT) * 100) / 100;
  const totalPrice =
    Math.round((basePrice + serviceFee + processingFee) * 100) / 100;
  const feePercentage =
    basePrice > 0
      ? Math.round(((totalPrice - basePrice) / basePrice) * 10000) / 100
      : 0;
  return { basePrice, serviceFee, processingFee, totalPrice, feePercentage };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EmbeddableCheckout({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  venueName,
  venueCity,
  primaryColor = "#059669",
  accentColor = "#065f46",
  logoUrl,
  showFeeBreakdown = true,
  maxTicketsPerOrder = 8,
  apiBaseUrl = "",
}: CheckoutConfig) {
  const [step, setStep] = useState<CheckoutStep>("select");
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Fetch ticket types
  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/events/${eventId}/tickets`
        );
        if (res.ok) {
          const data = await res.json();
          setTicketOptions(data.ticketTypes ?? data ?? []);
        } else {
          // Use placeholder data if API not available
          setTicketOptions([]);
        }
      } catch {
        setTicketOptions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [eventId, apiBaseUrl]);

  const updateQuantity = useCallback(
    (ticketTypeId: string, ticketName: string, unitPrice: number, delta: number) => {
      setOrderItems((prev) => {
        const existing = prev.find((i) => i.ticketTypeId === ticketTypeId);
        const totalQty = prev.reduce((s, i) => s + i.quantity, 0);

        if (existing) {
          const newQty = Math.max(0, existing.quantity + delta);
          if (newQty === 0) return prev.filter((i) => i.ticketTypeId !== ticketTypeId);
          if (totalQty + delta > maxTicketsPerOrder && delta > 0) return prev;
          return prev.map((i) =>
            i.ticketTypeId === ticketTypeId ? { ...i, quantity: newQty } : i
          );
        }

        if (delta <= 0) return prev;
        if (totalQty + delta > maxTicketsPerOrder) return prev;
        return [...prev, { ticketTypeId, ticketName, quantity: 1, unitPrice }];
      });
    },
    [maxTicketsPerOrder]
  );

  const subtotal = orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const fees = calculateFees(subtotal);
  const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = useCallback(async () => {
    if (!customerEmail || !customerName) {
      setError("Please enter your name and email");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/checkout/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items: orderItems,
          customerEmail,
          customerName,
          total: fees.totalPrice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderId(data.orderId ?? "confirmed");
        setStep("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Checkout failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [eventId, orderItems, customerEmail, customerName, fees.totalPrice, apiBaseUrl]);

  // ── Inline styles for white-label ────────────────────────────────────────

  const btnStyle = {
    backgroundColor: primaryColor,
    color: "#fff",
  };

  const btnHoverStyle = {
    backgroundColor: accentColor,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-3">
          {logoUrl && (
            <Image src={logoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          )}
          <div className="text-white">
            <h2 className="font-bold text-lg leading-tight">{eventTitle}</h2>
            <p className="text-sm opacity-90">
              {venueName}{venueCity ? ` · ${venueCity}` : ""}
            </p>
            <p className="text-xs opacity-75">
              {eventDate}{eventTime ? ` at ${eventTime}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Step: Select tickets */}
      {step === "select" && (
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Select Tickets</h3>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading tickets...</div>
          ) : ticketOptions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No tickets available</div>
          ) : (
            <div className="space-y-3">
              {ticketOptions.map((ticket) => {
                const available = ticket.capacity - ticket.sold;
                const qty =
                  orderItems.find((i) => i.ticketTypeId === ticket.id)?.quantity ?? 0;
                const soldOut = available <= 0;

                return (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      soldOut ? "bg-gray-50 opacity-60" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{ticket.name}</div>
                      {ticket.description && (
                        <div className="text-xs text-gray-500">{ticket.description}</div>
                      )}
                      <div className="text-sm font-bold" style={{ color: primaryColor }}>
                        ${ticket.price.toFixed(2)}
                      </div>
                      {available <= 10 && available > 0 && (
                        <div className="text-xs text-orange-500">Only {available} left</div>
                      )}
                    </div>

                    {soldOut ? (
                      <span className="text-xs text-red-500 font-medium">Sold Out</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(ticket.id, ticket.name, ticket.price, -1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          disabled={qty === 0}
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-medium">{qty}</span>
                        <button
                          onClick={() => updateQuantity(ticket.id, ticket.name, ticket.price, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                          style={btnStyle}
                          onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHoverStyle)}
                          onMouseOut={(e) => Object.assign(e.currentTarget.style, btnStyle)}
                          disabled={qty >= Math.min(available, maxTicketsPerOrder - totalQty + qty)}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalQty > 0 && (
            <div className="mt-4">
              {showFeeBreakdown && (
                <div className="text-sm text-gray-600 space-y-1 mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span>Subtotal ({totalQty} ticket{totalQty > 1 ? "s" : ""})</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Service fee</span>
                    <span>${fees.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Processing fee</span>
                    <span>${fees.processingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
                    <span>Total</span>
                    <span>${fees.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep("details")}
                className="w-full py-3 rounded-lg font-semibold text-white transition-colors"
                style={btnStyle}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, btnHoverStyle)}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, btnStyle)}
              >
                Continue · ${fees.totalPrice.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Customer details */}
      {step === "details" && (
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Your Details</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                placeholder="john@example.com"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep("select")}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!customerEmail || !customerName) {
                  setError("Please fill in all fields");
                  return;
                }
                setError(null);
                setStep("confirm");
              }}
              className="flex-1 py-2.5 rounded-lg font-semibold text-white"
              style={btnStyle}
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Confirm Order</h3>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2 text-sm">
            <div className="text-gray-600">
              <span className="font-medium text-gray-900">{customerName}</span>
              <br />
              {customerEmail}
            </div>
            <hr className="border-gray-200" />
            {orderItems.map((item) => (
              <div key={item.ticketTypeId} className="flex justify-between">
                <span>
                  {item.quantity}× {item.ticketName}
                </span>
                <span className="font-medium">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <hr className="border-gray-200" />
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>${fees.totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep("details")}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
              style={btnStyle}
            >
              {loading ? "Processing..." : `Pay $${fees.totalPrice.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Success */}
      {step === "success" && (
        <div className="p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: `${primaryColor}20` }}>
            <span role="img" aria-label="checkmark">✓</span>
          </div>
          <h3 className="font-bold text-xl text-gray-900 mb-2">Order Confirmed!</h3>
          <p className="text-gray-600 text-sm mb-1">
            Confirmation sent to <strong>{customerEmail}</strong>
          </p>
          {orderId && orderId !== "confirmed" && (
            <p className="text-xs text-gray-400 mb-4">Order #{orderId}</p>
          )}
          <p className="text-sm text-gray-500">
            {eventTitle} · {eventDate}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2 border-t border-gray-100 text-center">
        <span className="text-[10px] text-gray-400">
          Powered by ComedyCountry · Fair Ticketing
        </span>
      </div>
    </div>
  );
}
