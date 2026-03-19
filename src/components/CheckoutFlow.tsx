"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  CheckoutStep,
  CheckoutState,
  CartItem,
  OrderConfirmation,
  PromoCodeValidation,
} from "@/types/tickets";
import TicketQRCode from "./TicketQRCode";

/**
 * Phase 3: Multi-Step Checkout Flow Component
 *
 * A complete checkout experience for purchasing tickets.
 *
 * Steps:
 * 1. Ticket Selection — Choose ticket types and quantities
 * 2. Details — Review order, apply promo codes
 * 3. Payment — Stripe Checkout redirect
 * 4. Confirmation — Order summary with QR codes
 *
 * Features:
 * - Cart management (add/remove ticket types)
 * - Promo code validation
 * - Fee transparency
 * - Responsive design
 * - Loading states and error handling
 */

interface TicketTypeOption {
  id: string;
  name: string;
  price: number;
  description: string | null;
  available: number;
  onSale: boolean;
}

interface CheckoutFlowProps {
  eventId: string;
  eventTitle: string;
  venueName: string;
  eventDate: string;
  showtime: string | null;
  ticketTypes: TicketTypeOption[];
  className?: string;
  onComplete?: (confirmation: OrderConfirmation) => void;
  onCancel?: () => void;
}

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: "tickets", label: "Tickets" },
  { key: "details", label: "Review" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
];

export default function CheckoutFlow({
  eventId,
  eventTitle,
  venueName,
  eventDate,
  showtime,
  ticketTypes,
  className = "",
  onComplete,
  onCancel,
}: CheckoutFlowProps) {
  const [state, setState] = useState<CheckoutState>({
    step: "tickets",
    eventId,
    cart: {
      items: [],
      subtotal: 0,
      serviceFee: 0,
      processingFee: 0,
      tax: 0,
      discount: 0,
      promoCode: null,
      total: 0,
    },
    customerEmail: "",
    customerName: "",
    promoCode: null,
    promoValidation: null,
    isProcessing: false,
    error: null,
    confirmation: null,
  });

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Recalculate totals when cart items change
  useEffect(() => {
    const subtotal = state.cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const discount = state.promoValidation?.valid
      ? state.promoValidation.discountAmount
      : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceFee = Math.round(discountedSubtotal * 0.1 * 100) / 100;
    const processingFee =
      Math.round((discountedSubtotal * 0.029 + 0.3) * 100) / 100;
    const tax = 0; // Calculated server-side
    const total =
      Math.round(
        (discountedSubtotal + serviceFee + processingFee + tax) * 100
      ) / 100;

    setState((prev) => ({
      ...prev,
      cart: {
        ...prev.cart,
        subtotal,
        serviceFee,
        processingFee,
        tax,
        discount,
        total,
      },
    }));
  }, [state.cart.items, state.promoValidation]);

  const updateQuantity = useCallback(
    (ticketTypeId: string, delta: number) => {
      setState((prev) => {
        const ticketType = ticketTypes.find((tt) => tt.id === ticketTypeId);
        if (!ticketType) return prev;

        const existingIndex = prev.cart.items.findIndex(
          (item) => item.ticketTypeId === ticketTypeId
        );

        let newItems: CartItem[];

        if (existingIndex >= 0) {
          newItems = [...prev.cart.items];
          const newQty = Math.max(
            0,
            Math.min(
              newItems[existingIndex].quantity + delta,
              ticketType.available
            )
          );

          if (newQty === 0) {
            newItems.splice(existingIndex, 1);
          } else {
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newQty,
              totalPrice:
                Math.round(ticketType.price * newQty * 100) / 100,
            };
          }
        } else if (delta > 0) {
          const qty = Math.min(delta, ticketType.available);
          newItems = [
            ...prev.cart.items,
            {
              ticketTypeId,
              ticketTypeName: ticketType.name,
              eventId,
              quantity: qty,
              unitPrice: ticketType.price,
              totalPrice: Math.round(ticketType.price * qty * 100) / 100,
            },
          ];
        } else {
          newItems = prev.cart.items;
        }

        return {
          ...prev,
          cart: { ...prev.cart, items: newItems },
          error: null,
        };
      });
    },
    [eventId, ticketTypes]
  );

  const getItemQuantity = (ticketTypeId: string): number => {
    return (
      state.cart.items.find((item) => item.ticketTypeId === ticketTypeId)
        ?.quantity ?? 0
    );
  };

  const totalTickets = state.cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const applyPromoCode = async () => {
    if (!promoInput.trim()) return;

    setPromoLoading(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
      // Validate promo code via the checkout session endpoint
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items: state.cart.items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
          })),
          promoCode: promoInput.toUpperCase(),
          // Dry run — just validate
          dryRun: true,
        }),
      });

      if (res.ok) {
        const validation: PromoCodeValidation = {
          valid: true,
          code: promoInput.toUpperCase(),
          discountType: "percentage",
          discountValue: 0,
          discountAmount: 0,
        };

        setState((prev) => ({
          ...prev,
          promoCode: promoInput.toUpperCase(),
          promoValidation: validation,
        }));
      } else {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          promoValidation: {
            valid: false,
            code: promoInput.toUpperCase(),
            discountType: "percentage",
            discountValue: 0,
            discountAmount: 0,
            error: data.error || "Invalid promo code",
          },
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Failed to validate promo code",
      }));
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setPromoInput("");
    setState((prev) => ({
      ...prev,
      promoCode: null,
      promoValidation: null,
    }));
  };

  const proceedToPayment = async () => {
    if (state.cart.items.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "Please add at least one ticket to your cart",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items: state.cart.items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
          })),
          promoCode: state.promoCode || undefined,
          successUrl: `${window.location.origin}/tickets?checkout=success`,
          cancelUrl: `${window.location.origin}/events/${eventId}?checkout=cancelled`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: data.error || "Checkout failed",
        }));
        return;
      }

      // If Stripe URL is returned, redirect
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Direct confirmation (no Stripe)
      if (data.orderId) {
        const confirmation: OrderConfirmation = data;
        setState((prev) => ({
          ...prev,
          step: "confirmation",
          isProcessing: false,
          confirmation,
        }));
        onComplete?.(confirmation);
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred",
      }));
    }
  };

  const goToStep = (step: CheckoutStep) => {
    setState((prev) => ({ ...prev, step, error: null }));
  };

  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden ${className}`}
    >
      {/* Progress Steps */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const stepIdx = STEPS.findIndex((s) => s.key === state.step);
            const isActive = step.key === state.step;
            const isCompleted = idx < stepIdx;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center gap-2 ${
                    isActive
                      ? "text-amber-400"
                      : isCompleted
                        ? "text-green-400"
                        : "text-zinc-600"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? "bg-amber-600 text-black"
                        : isCompleted
                          ? "bg-green-600 text-black"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {isCompleted ? "\u2713" : idx + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      isCompleted ? "bg-green-600" : "bg-zinc-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Info */}
      <div className="p-4 bg-zinc-800/30 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white">{eventTitle}</h2>
        <p className="text-sm text-zinc-400">
          {venueName} &middot; {formattedDate}
          {showtime && ` &middot; ${showtime}`}
        </p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {state.error}
        </div>
      )}

      {/* Step Content */}
      <div className="p-4">
        {/* ── Step 1: Ticket Selection ──────────────────────── */}
        {state.step === "tickets" && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-white">
              Select Tickets
            </h3>

            {ticketTypes.map((tt) => {
              const qty = getItemQuantity(tt.id);
              const soldOut = tt.available <= 0;

              return (
                <div
                  key={tt.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    soldOut
                      ? "bg-zinc-800/30 border-zinc-800 opacity-60"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{tt.name}</h4>
                      {soldOut && (
                        <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
                          Sold Out
                        </span>
                      )}
                    </div>
                    {tt.description && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {tt.description}
                      </p>
                    )}
                    <p className="text-amber-400 font-bold mt-1">
                      ${tt.price.toFixed(2)}
                    </p>
                    {!soldOut && (
                      <p className="text-xs text-zinc-500">
                        {tt.available} available
                      </p>
                    )}
                  </div>

                  {!soldOut && tt.onSale && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => updateQuantity(tt.id, -1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-white flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-white font-bold w-6 text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(tt.id, 1)}
                        disabled={qty >= tt.available}
                        className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-black flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {!tt.onSale && !soldOut && (
                    <span className="text-xs text-zinc-500 ml-4">
                      Not on sale
                    </span>
                  )}
                </div>
              );
            })}

            {/* Cart Summary */}
            {totalTickets > 0 && (
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>
                    {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                  </span>
                  <span className="text-white font-bold">
                    ${state.cart.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => goToStep("details")}
                disabled={totalTickets === 0}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Promo ──────────────────────── */}
        {state.step === "details" && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-white">
              Review Order
            </h3>

            {/* Line items */}
            <div className="space-y-2">
              {state.cart.items.map((item) => (
                <div
                  key={item.ticketTypeId}
                  className="flex justify-between text-sm"
                >
                  <span className="text-zinc-300">
                    {item.quantity}x {item.ticketTypeName}
                  </span>
                  <span className="text-white">
                    ${item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo Code */}
            <div className="border-t border-zinc-800 pt-4">
              <label className="text-sm text-zinc-400 mb-2 block">
                Promo Code
              </label>
              {state.promoValidation?.valid ? (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-800 rounded-lg p-3">
                  <div>
                    <span className="text-green-400 font-medium text-sm">
                      {state.promoCode}
                    </span>
                    <span className="text-green-400/60 text-xs ml-2">
                      -${state.promoValidation.discountAmount.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) =>
                      setPromoInput(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    onClick={applyPromoCode}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {state.promoValidation && !state.promoValidation.valid && (
                <p className="text-red-400 text-xs mt-1">
                  {state.promoValidation.error}
                </p>
              )}
            </div>

            {/* Fee Breakdown */}
            <div className="border-t border-zinc-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span>${state.cart.subtotal.toFixed(2)}</span>
              </div>
              {state.cart.discount > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount</span>
                  <span>-${state.cart.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Service Fee</span>
                <span>${state.cart.serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Processing Fee</span>
                <span>${state.cart.processingFee.toFixed(2)}</span>
              </div>
              {state.cart.tax > 0 && (
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Tax</span>
                  <span>${state.cart.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white border-t border-zinc-800 pt-2">
                <span>Total</span>
                <span>${state.cart.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-zinc-600">
                All fees shown upfront. No hidden charges.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => goToStep("tickets")}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={proceedToPayment}
                disabled={state.isProcessing}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-lg transition-colors"
              >
                {state.isProcessing ? "Processing..." : "Checkout"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment (redirect state) ──────────── */}
        {state.step === "payment" && (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-medium">
              Redirecting to payment...
            </p>
            <p className="text-sm text-zinc-500">
              You&apos;ll be redirected to our secure payment partner.
            </p>
          </div>
        )}

        {/* ── Step 4: Confirmation ─────────────────────── */}
        {state.step === "confirmation" && state.confirmation && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">
                Order Confirmed!
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Order #{state.confirmation.orderId.slice(0, 8)}
              </p>
            </div>

            {/* Tickets with QR codes */}
            <div className="space-y-4">
              {state.confirmation.tickets.map((ticket) => (
                <TicketQRCode
                  key={ticket.id}
                  ticketData={{
                    ticketId: ticket.id,
                    qrCode: ticket.qrCode,
                    eventId,
                    eventTitle: ticket.eventTitle,
                    venueName: ticket.venueName,
                    eventDate: ticket.eventDate.toString(),
                    showtime: ticket.showtime,
                    ticketType: ticket.ticketTypeName,
                    holderName: null,
                  }}
                  size={180}
                />
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${state.confirmation.subtotal.toFixed(2)}</span>
              </div>
              {state.confirmation.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>
                    Discount
                    {state.confirmation.promoCode
                      ? ` (${state.confirmation.promoCode})`
                      : ""}
                  </span>
                  <span>-${state.confirmation.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>Fees</span>
                <span>
                  $
                  {(
                    state.confirmation.serviceFee +
                    state.confirmation.processingFee
                  ).toFixed(2)}
                </span>
              </div>
              {state.confirmation.tax > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Tax</span>
                  <span>${state.confirmation.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white border-t border-zinc-700 pt-2">
                <span>Total Charged</span>
                <span>${state.confirmation.total.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              A confirmation email has been sent to{" "}
              {state.confirmation.customerEmail}
            </p>

            <button
              onClick={() => (window.location.href = "/tickets")}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg transition-colors"
            >
              View My Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
