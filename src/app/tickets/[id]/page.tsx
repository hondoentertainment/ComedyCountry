"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface TicketData {
  id: string;
  qrCode: string;
  status: string;
  purchasePrice: { toString(): string };
  scannedAt: string | null;
  transferredTo: string | null;
  giftMessage: string | null;
  createdAt: string;
  ticketType: {
    name: string;
    description: string | null;
  };
  event: {
    id: string;
    title: string | null;
    date: string;
    showtime: string | null;
    venue: {
      name: string;
      city: string;
      state: string;
      address: string | null;
    } | null;
    comedians: Array<{
      comedian: { name: string; slug: string };
    }>;
    refundPolicy: {
      refundDeadline: string;
      refundPercent: number;
      description: string | null;
    } | null;
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    VALID: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    USED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    REFUNDED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    TRANSFERRED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}
    >
      {status}
    </span>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [actionResult, setActionResult] = useState("");

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await fetch(`/api/tickets/${id}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load ticket");
          return;
        }
        setTicket(await res.json());
      } catch {
        setError("Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [id]);

  async function handleRefund() {
    if (!confirm("Are you sure you want to refund this ticket?")) return;
    setActionLoading(true);
    setActionResult("");
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionResult(data.error || "Refund failed");
      } else {
        setActionResult(
          `Refund processed (${data.refundPercent}% refund). Ticket is now refunded.`
        );
        setTicket((prev) => (prev ? { ...prev, status: "REFUNDED" } : prev));
      }
    } catch {
      setActionResult("Refund failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTransfer() {
    if (!recipientEmail) return;
    setActionLoading(true);
    setActionResult("");
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          recipientEmail,
          giftMessage: giftMessage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionResult(data.error || "Transfer failed");
      } else {
        setActionResult(`Ticket transferred to ${recipientEmail}`);
        setTicket((prev) =>
          prev ? { ...prev, status: "TRANSFERRED" } : prev
        );
        setShowTransfer(false);
      }
    } catch {
      setActionResult("Transfer failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Ticket not found"}</p>
          <Link href="/tickets" className="text-brand-gold hover:underline">
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(ticket.event.date);
  const isUpcoming = ticket.status === "VALID" && eventDate >= new Date();
  const canRefund =
    ticket.status === "VALID" &&
    ticket.event.refundPolicy &&
    new Date(ticket.event.refundPolicy.refundDeadline) > new Date();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/tickets"
          className="inline-flex items-center text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          &larr; Back to My Tickets
        </Link>

        {/* QR Code — scannable at venue */}
        <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-8 text-center mb-6">
          <div className="inline-flex flex-col items-center">
            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-2 mb-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrCode)}`}
                alt="Ticket QR code"
                width={180}
                height={180}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
            <p className="text-zinc-500 text-xs font-mono mb-2 truncate max-w-[200px]" title={ticket.qrCode}>
              {ticket.qrCode}
            </p>
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Event Info */}
        <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            {ticket.event.title ||
              ticket.event.comedians
                ?.map((ec) => ec.comedian.name)
                .join(", ") ||
              "Comedy Show"}
          </h1>

          {ticket.event.comedians?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ticket.event.comedians.map((ec) => (
                <Link
                  key={ec.comedian.slug}
                  href={`/comedians/${ec.comedian.slug}`}
                  className="text-brand-gold hover:underline text-sm"
                >
                  {ec.comedian.name}
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm">
            {ticket.event.venue && (
              <p className="text-zinc-300">
                {ticket.event.venue.name}
                {ticket.event.venue.address && (
                  <span className="text-zinc-500">
                    {" "}
                    &mdash; {ticket.event.venue.address},{" "}
                    {ticket.event.venue.city}, {ticket.event.venue.state}
                  </span>
                )}
              </p>
            )}
            <p className="text-zinc-400">
              {eventDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {ticket.event.showtime
                ? ` at ${ticket.event.showtime}`
                : ""}
            </p>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Ticket Details
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Type</dt>
              <dd className="text-zinc-200">{ticket.ticketType.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Price</dt>
              <dd className="text-zinc-200">
                ${ticket.purchasePrice.toString()}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Purchased</dt>
              <dd className="text-zinc-200">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd>
                <StatusBadge status={ticket.status} />
              </dd>
            </div>
            {ticket.scannedAt && (
              <div className="col-span-2">
                <dt className="text-zinc-500">Scanned At</dt>
                <dd className="text-zinc-200">
                  {new Date(ticket.scannedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {ticket.transferredTo && (
              <div className="col-span-2">
                <dt className="text-zinc-500">Transferred To</dt>
                <dd className="text-zinc-200">{ticket.transferredTo}</dd>
              </div>
            )}
            {ticket.giftMessage && (
              <div className="col-span-2">
                <dt className="text-zinc-500">Gift Message</dt>
                <dd className="text-zinc-200 italic">
                  &ldquo;{ticket.giftMessage}&rdquo;
                </dd>
              </div>
            )}
          </dl>

          {ticket.ticketType.description && (
            <p className="text-zinc-500 text-xs mt-3 border-t border-zinc-800 pt-3">
              {ticket.ticketType.description}
            </p>
          )}
        </div>

        {/* Refund Policy */}
        {ticket.event.refundPolicy && (
          <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">
              Refund Policy
            </h2>
            <p className="text-zinc-400 text-sm">
              Refunds available until{" "}
              {new Date(
                ticket.event.refundPolicy.refundDeadline
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              ({ticket.event.refundPolicy.refundPercent}% refund)
            </p>
            {ticket.event.refundPolicy.description && (
              <p className="text-zinc-500 text-xs mt-1">
                {ticket.event.refundPolicy.description}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {isUpcoming && (
          <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {canRefund && (
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Request Refund"}
                </button>
              )}
              <button
                onClick={() => setShowTransfer(!showTransfer)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Transfer Ticket
              </button>
            </div>

            {showTransfer && (
              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="recipientEmail"
                    className="block text-zinc-400 text-sm mb-1"
                  >
                    Recipient Email
                  </label>
                  <input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="giftMessage"
                    className="block text-zinc-400 text-sm mb-1"
                  >
                    Gift Message (optional)
                  </label>
                  <textarea
                    id="giftMessage"
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Enjoy the show!"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  onClick={handleTransfer}
                  disabled={actionLoading || !recipientEmail}
                  className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-medium text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Transferring..." : "Send Ticket"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Result */}
        {actionResult && (
          <div
            className={`rounded-card p-4 mb-6 text-sm ${
              actionResult.includes("failed")
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {actionResult}
          </div>
        )}
      </div>
    </div>
  );
}
