import Link from "next/link";
import Image from "next/image";
import { getHappeningTonight } from "@/lib/taste-profile";

export const metadata = {
  title: "Happening Tonight | Punchline Atlas",
  description: "Live comedy shows happening today and tonight near you.",
};

export const dynamic = "force-dynamic";

export default async function HappeningTonightPage() {
  let events: Awaited<ReturnType<typeof getHappeningTonight>> = [];

  try {
    events = await getHappeningTonight();
  } catch {
    // DB not configured
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">
          Happening Tonight
        </h1>
        <p className="text-zinc-400 mb-8">
          Live comedy shows today and tonight.
        </p>

        {events.length === 0 ? (
          <div className="py-16 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 font-medium mb-2">
              No shows tonight
            </p>
            <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
              Check back later or browse upcoming events.
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
            {events.map((event) => {
              const comedianNames = event.comedians
                .map((c) => c.name)
                .join(", ");
              const displayTitle = event.title ?? comedianNames;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">
                        {displayTitle}
                      </p>
                      <p className="text-zinc-400 text-sm mt-1">
                        {event.venue.name} &middot; {event.venue.city},{" "}
                        {event.venue.state}
                      </p>
                      {event.comedians.length > 0 &&
                        event.title &&
                        event.title !== comedianNames && (
                          <p className="text-zinc-500 text-sm mt-1 truncate">
                            Featuring: {comedianNames}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
