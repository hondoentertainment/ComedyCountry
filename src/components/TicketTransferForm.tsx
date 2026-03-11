"use client";

import { useState } from "react";

interface TicketTransferFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

export default function TicketTransferForm({
  ticketId,
  onSuccess,
}: TicketTransferFormProps) {
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/tickets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          toEmail: toEmail.trim(),
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Transfer failed");
        return;
      }

      setSuccess("Ticket transfer initiated! The recipient will receive a link to accept.");
      setToEmail("");
      setMessage("");
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="transfer-email"
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          Recipient Email
        </label>
        <input
          id="transfer-email"
          type="email"
          required
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="friend@example.com"
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="transfer-message"
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          Gift Message{" "}
          <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="transfer-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enjoy the show!"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !toEmail.trim()}
        className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Transfer Ticket"}
      </button>

      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-emerald-400 text-sm" role="status">
          {success}
        </p>
      )}
    </form>
  );
}
