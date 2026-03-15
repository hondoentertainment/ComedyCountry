"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type TonightEvent = {
  id: string;
  title: string | null;
  date: string;
  showtime: string | null;
  ticketUrl: string | null;
  venue: { id: string; name: string; city: string; state: string };
  comedians: Array<{ id: string; name: string; slug: string; headshotUrl: string | null }>;
  attendeeCount: number;
  ticketsAvailable: boolean;
};

type Props = {
  initialEvents: TonightEvent[];
};

export function HappeningTonightContent({ initialEvents }: Props) {
  const [events, setEvents] = useState<TonightEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!useLocation) return;

    setLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/happening-tonight?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&radiusMi=75`
          );
          if (!res.ok) throw new Error("Fetch failed");
          const data = await res.json();
          setEvents(data.events ?? []);
        } catch {
          setEvents([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location access denied. Show all events instead."
            : "Could not get your location."
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [useLocation]);

  const comedianNames = (e: TonightEvent) =>
    e.comedians.map((c) => c.name).join(", ");
  const displayTitle = (e: TonightEvent) =>
    e.title ?? comedianNames(e);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setUseLocation(true)}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            useLocation && !locationError
              ? "bg-brand-gold text-brand-dark"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {loading ? "Finding shows near you…" : "Near me"}
        </button>
        <button
          type="button"
          onClick={() => {
            setUseLocation(false);
            setEvents(initialEvents);
            setLocationError(null);
          }}
          className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium transition-colors"
        >
          All events
        </button>
        {locationError && (
          <span className="text-sm text-amber-400">{locationError}</span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="py-16 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
          <p className="text-zinc-400 font-medium mb-2">No shows tonight</p>
          <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
            {useLocation && !loading
              ? "No shows in your area. Try viewing all events."
              : "Check back later or browse upcoming events."}
          </p>
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Browse venues
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">
                    {displayTitle(event)}
                  </p>
                  <p className="text-zinc-400 text-sm mt-1">
                    {event.venue.name} &middot; {event.venue.city},{" "}
                    {event.venue.state}
                  </p>
                  {event.comedians.length > 0 &&
                    event.title &&
                    event.title !== comedianNames(event) && (
                      <p className="text-zinc-500 text-sm mt-1 truncate">
                        Featuring: {comedianNames(event)}
                      </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                  {event.showtime && (
                    <p className="text-brand-gold text-sm font-medium">
                      {event.showtime}
                    </p>
                  )}
                  {event.attendeeCount > 0 && (
                    <p className="text-zinc-500 text-xs mt-1">
                      {event.attendeeCount} going
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                {event.ticketsAvailable ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
                    Tickets available
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">
                    Sold out
                  </span>
                )}
                {event.comedians.length > 0 && (
                  <div className="flex -space-x-2">
                    {event.comedians.slice(0, 3).map((c) =>
                      c.headshotUrl ? (
                        <Image
                          key={c.id}
                          src={c.headshotUrl}
                          alt={c.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full border-2 border-brand-surface object-cover"
                        />
                      ) : (
                        <div
                          key={c.id}
                          className="w-6 h-6 rounded-full border-2 border-brand-surface bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold"
                        >
                          {c.name[0]}
                        </div>
                      )
                    )}
                    {event.comedians.length > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 border-brand-surface bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                        +{event.comedians.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
