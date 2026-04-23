"use client";

import { TicketButton } from "@/components/TicketButton";
import WaitlistButton from "@/components/WaitlistButton";

export function EventActionDock({
  eventId,
  ticketUrl,
  isSoldOut,
}: {
  eventId: string;
  ticketUrl: string | null;
  isSoldOut: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-brand-dark/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {isSoldOut ? (
          <div className="flex-1">
            <WaitlistButton eventId={eventId} />
          </div>
        ) : ticketUrl ? (
          <TicketButton
            eventId={eventId}
            ticketUrl={ticketUrl}
            className="flex-1 rounded-lg bg-brand-gold px-4 py-3 text-center text-sm font-semibold text-brand-dark hover:bg-brand-gold/90"
          >
            Get tickets
          </TicketButton>
        ) : (
          <a
            href="#event-plan"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white"
          >
            Plan your night
          </a>
        )}

        <a
          href="#event-actions"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200"
        >
          Save
        </a>
        <a
          href="#event-reviews"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200"
        >
          Reviews
        </a>
      </div>
    </div>
  );
}
