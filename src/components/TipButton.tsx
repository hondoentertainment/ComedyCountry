"use client";

import { useState } from "react";

interface TipButtonProps {
  comedianId: string;
  comedianName: string;
}

const giftTypes = [
  { id: "standing_ovation", label: "Standing Ovation", emoji: "👏", amount: 5 },
  { id: "encore", label: "Encore", emoji: "🎤", amount: 10 },
  { id: "spotlight", label: "Spotlight", emoji: "🔦", amount: 25 },
  { id: "headliner", label: "Headliner", emoji: "⭐", amount: 50 },
  { id: "comedy_legend", label: "Comedy Legend", emoji: "🏆", amount: 100 },
];

const quickAmounts = [1, 5, 10, 25];

export default function TipButton({ comedianId, comedianName }: TipButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [giftType, setGiftType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectGift(gift: typeof giftTypes[0]) {
    setGiftType(gift.id);
    setAmount(String(gift.amount));
    setCustomAmount("");
  }

  function selectQuickAmount(amt: number) {
    setAmount(String(amt));
    setCustomAmount("");
    setGiftType(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tipAmount = parseFloat(customAmount || amount);
    if (!tipAmount || tipAmount <= 0) {
      setError("Please select an amount");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/creator/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comedianId,
          amount: tipAmount,
          giftType: giftType || undefined,
          message: message.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setAmount("");
          setCustomAmount("");
          setGiftType(null);
          setMessage("");
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send tip. Please sign in.");
      }
    } catch {
      setError("Failed to send tip.");
    }
    setSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
      >
        <span>💰</span> Tip
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-brand-surface border border-zinc-800 p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-lg"
            >
              &times;
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Tip {comedianName}</h2>
            <p className="text-zinc-500 text-sm mb-5">Show your appreciation!</p>

            {success ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-brand-gold font-semibold">Tip sent! Thank you!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Gift types */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Send a gift</label>
                  <div className="grid grid-cols-3 gap-2">
                    {giftTypes.map((gift) => (
                      <button
                        key={gift.id}
                        type="button"
                        onClick={() => selectGift(gift)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          giftType === gift.id
                            ? "border-brand-gold bg-brand-gold/10"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        <span className="text-xl block">{gift.emoji}</span>
                        <span className="text-xs text-zinc-400 block mt-1">{gift.label}</span>
                        <span className="text-xs text-brand-gold font-semibold">${gift.amount}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick amounts */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Or pick an amount</label>
                  <div className="flex gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => selectQuickAmount(amt)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          amount === String(amt) && !giftType
                            ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                            : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Custom amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount("");
                        setGiftType(null);
                      }}
                      className="w-full pl-7 pr-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Message (optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    maxLength={280}
                    className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
                    placeholder="Great set tonight!"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || (!amount && !customAmount)}
                  className="w-full py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "Sending..."
                    : `Send $${parseFloat(customAmount || amount || "0").toFixed(2)} Tip`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
