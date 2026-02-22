import Link from "next/link";
import { listEvents } from "@/lib/events";
import { getEventRatingStatsBatch } from "@/lib/event-reviews";
import { getVenueStates } from "@/lib/venues";
import { SHOW_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { Pagination } from "@/components/Pagination";

export const metadata = {
  title: "Schedule | Punchline Atlas",
  description: "National comedy calendar. Find upcoming shows by date, city, and state.",
};

type PageProps = {
  searchParams: Promise<{ from?: string; city?: string; state?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { from, city, state, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const fromDate = from ? new Date(from) : new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 30);

  let events: Awaited<ReturnType<typeof listEvents>>["events"] = [];
  let total = 0;
  let states: { state: string }[] = [];

  let ratingStats = new Map<string, { count: number; avgRating: number | null }>();

  try {
    const [result, venueStates] = await Promise.all([
      listEvents({
        from: fromDate,
        to: toDate,
        city: city || undefined,
        state: state || undefined,
        take: PAGE_SIZE,
        skip,
      }),
      getVenueStates(),
    ]);
    events = result.events;
    total = result.total;
    states = venueStates;
    if (events.length > 0) {
      ratingStats = await getEventRatingStatsBatch(events.map((e) => e.id));
    }
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
            <select
              id="state"
              name="state"
              defaultValue={state ?? ""}
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
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
          {events.map((event) => {
            const stats = ratingStats.get(event.id);
            return (
            <li
              key={event.id}
              className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
            >
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-medium text-white hover:text-brand-gold block"
                  >
                    {event.title ??
                      event.comedians.map((ec) => ec.comedian.name).join(", ")}
                  </Link>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-xs text-zinc-500 hover:text-brand-gold block mt-0.5"
                  >
                    {stats && stats.count > 0 ? (
                      <>★ {stats.avgRating?.toFixed(1)} ({stats.count} reviews)</>
                    ) : (
                      "Rate this show"
                    )}
                  </Link>
                  <Link
                    href={`/venues/${event.venue.id}`}
                    className="text-brand-gold hover:underline text-sm"
                  >
                    {event.venue.name} — {event.venue.city}, {event.venue.state}
                  </Link>
                  <p className="text-zinc-400 text-sm mt-1">
                    {formatDate(event.date)}
                    {event.showtime && ` • ${event.showtime}`}
                    {formatEventPrice(event.priceMin, event.priceMax) && (
                      <> • {formatEventPrice(event.priceMin, event.priceMax)}</>
                    )}
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
          );
          })}
        </ul>

        {events.length === 0 && (
          <div className="py-16 px-6 rounded-lg bg-brand-charcoal/30 border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 text-lg font-medium mb-2">
              No shows found
            </p>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              Try a different date range, city, or state. New shows are added regularly.
            </p>
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
            >
              Clear filters
            </Link>
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/schedule"
          searchParams={{ from: from ?? fromDate.toISOString().slice(0, 10), city, state }}
        />
      </div>
    </main>
  );
}
