"use client";

import { useCallback } from "react";

/**
 * Ticket button that tracks affiliate clicks before redirecting.
 * Replaces raw <a> tags for ticket URLs to enable revenue tracking.
 */
export function TicketButton({
  eventId,
  ticketUrl,
  className,
  children,
}: {
  eventId: string;
  ticketUrl: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/tickets/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketUrl, referrer: window.location.pathname }),
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url || ticketUrl, "_blank", "noopener,noreferrer");
      } else {
        window.open(ticketUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(ticketUrl, "_blank", "noopener,noreferrer");
    }
  }, [eventId, ticketUrl]);

  return (
    <a
      href={ticketUrl}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className || "px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90"}
    >
      {children || "Get tickets"}
    </a>
  );
}
