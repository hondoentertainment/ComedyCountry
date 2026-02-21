import Link from "next/link";
import { listEvents } from "@/lib/events";
import { SHOW_TYPE_LABELS } from "@/lib/constants";

type PageProps = {
  searchParams: Promise<{ from?: string; city?: string; state?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { from, city, state } = params;

  const fromDate = from ? new Date(from) : new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 30);

  let events: Awaited<ReturnType<typeof listEvents>>["events"] = [];
  let total = 0;

  try {
    const result = await listEvents({
    from: fromDate,
    to: toDate,
    city: city || undefined,
    state: state || undefined,
    take: 100,
  });
    events = result.events;
    total = result.total;
  } catch {
    // DB not configured
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatShortDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Schedule</h1>
        <p className="text-zinc-400 mb-8">
          National comedy calendar. Shows from{" "}
          {formatShortDate(fromDate)} for the next 30 days.
        </p>

        <form
          method="get"
          className="flex flex-wrap gap-4 mb-8 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
        >
          <div>
            <label htmlFor="from" className="sr-only">
              From date
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from ?? fromDate.toISOString().slice(0, 10)}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="city" className="sr-only">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="City"
              defaultValue={city}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="state" className="sr-only">
              State
            </label>
            <input
              id="state"
              name="state"
              type="text"
              placeholder="State (e.g. NY)"
              defaultValue={state}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

        <p className="text-zinc-500 text-sm mb-4">
          {total} show{total !== 1 ? "s" : ""} found
        </p>

        <ul className="space-y-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
            >
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {event.title ??
                      event.comedians.map((ec) => ec.comedian.name).join(", ")}
                  </p>
                  <Link
                    href={`/venues/${event.venue.id}`}
                    className="text-brand-gold hover:underline text-sm"
                  >
                    {event.venue.name} — {event.venue.city}, {event.venue.state}
                  </Link>
                  <p className="text-zinc-400 text-sm mt-1">
                    {formatDate(event.date)}
                    {event.showtime && ` • ${event.showtime}`}
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {SHOW_TYPE_LABELS[event.showType] ?? event.showType}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {event.comedians.slice(0, 3).map((ec) => (
                    <Link
                      key={ec.id}
                      href={`/comedians/${ec.comedian.slug}`}
                      className="text-sm text-zinc-400 hover:text-brand-gold"
                    >
                      {ec.comedian.name}
                    </Link>
                  ))}
                  {event.ticketUrl && (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 ml-2"
                    >
                      Tickets
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {events.length === 0 && (
          <p className="text-zinc-500 py-12 text-center">
            No shows found for this period. Try a different date or location.
          </p>
        )}
      </div>
    </main>
  );
}
