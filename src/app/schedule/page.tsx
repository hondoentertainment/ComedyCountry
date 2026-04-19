import Link from "next/link";
import Image from "next/image";
import { listEvents } from "@/lib/events";
import { getEventRatingStatsBatch } from "@/lib/event-reviews";
import { getVenueStates } from "@/lib/venues";
import { SHOW_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { FriendsGoingBadge } from "@/components/FriendsGoingBadge";
import { ClearScheduleFiltersLink } from "./ClearScheduleFiltersLink";

export const metadata = {
  title: "Schedule | Punchline Atlas",
  description: "National comedy calendar. Find upcoming shows by date, city, and state.",
};

type PageProps = {
  searchParams: Promise<{ from?: string; city?: string; state?: string; page?: string }>;
};

export const revalidate = 60;

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (count === 0) return <span className="text-zinc-500 text-xs">No reviews</span>;
  return (
    <span className="rating-badge">
      ★ {rating?.toFixed(1) ?? "—"} <span className="text-zinc-400">({count})</span>
    </span>
  );
}

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
  let dataUnavailable = false;

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
    dataUnavailable = true;
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatShortDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {dataUnavailable && (
          <div className="mb-6 p-4 rounded-card bg-amber-500/10 border border-amber-500/40 text-amber-200 text-center">
            Data temporarily unavailable. Please try again later.
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Schedule</h1>
            <p className="text-zinc-400 text-sm">
              {total} show{total !== 1 ? "s" : ""} from {formatShortDate(fromDate)} for the next 30 days
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/happening-tonight?nearby=1"
              className="px-3 py-1.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/30 hover:bg-brand-gold/15 transition-colors"
            >
              Find shows near me tonight
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            >
              Set location alerts
            </Link>
          </div>
        </div>

        {/* Yelp-style filter bar */}
        <form
          method="get"
          className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80"
        >
          <div>
            <label htmlFor="from" className="sr-only">From date</label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from ?? fromDate.toISOString().slice(0, 10)}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="city" className="sr-only">City</label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="City"
              defaultValue={city}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="state" className="sr-only">State</label>
            <select
              id="state"
              name="state"
              defaultValue={state ?? ""}
              className="px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Filter
          </button>
        </form>

        {/* Yelp-style event cards with rating prominence */}
        <div className="space-y-4">
          {events.map((event) => {
            const stats = ratingStats.get(event.id);
            const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
            const img = event.comedians[0]?.comedian?.headshotUrl;
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="card-interactive flex flex-col sm:flex-row gap-4 p-0 overflow-hidden group"
              >
                {/* Spotify-style imagery */}
                <div className="sm:w-40 sm:min-w-[160px] aspect-video sm:aspect-square bg-brand-charcoal relative overflow-hidden shrink-0">
                  {img ? (
                    <Image
                      src={img}
                      alt={`Event photo: ${title}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                      🎤
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-wrap items-center gap-2">
                    <StarRating
                      rating={stats?.avgRating ?? null}
                      count={stats?.count ?? 0}
                    />
                    <FriendsGoingBadge eventId={event.id} />
                  </div>
                </div>

                {/* Yelp-style dense info */}
                <div className="flex-1 min-w-0 p-4 sm:p-0 sm:py-4 sm:pr-4 flex flex-col sm:justify-center">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-white text-lg">{title}</h2>
                      <Link
                        href={`/venues/${event.venue.id}`}
                        className="text-brand-gold hover:underline text-sm"
                      >
                        {event.venue.name} — {event.venue.city}, {event.venue.state}
                      </Link>
                    </div>
                    {event.ticketUrl && (
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90 shrink-0"
                      >
                        Get tickets
                      </a>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-2">
                    {formatDate(event.date)}
                    {event.showtime && ` • ${event.showtime}`}
                    {formatEventPrice(event.priceMin, event.priceMax) && (
                      <> • {formatEventPrice(event.priceMin, event.priceMax)}</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300">
                      {SHOW_TYPE_LABELS[event.showType] ?? event.showType}
                    </span>
                    {event.comedians.slice(0, 3).map((ec) => (
                      <Link
                        key={ec.id}
                        href={`/comedians/${ec.comedian.slug}`}
                        className="text-xs text-zinc-500 hover:text-brand-gold"
                      >
                        {ec.comedian.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {events.length === 0 && (
          <div className="py-20 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 text-lg font-medium mb-2">No shows found</p>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              Try a different date range, city, or state. New shows are added regularly.
            </p>
            <ClearScheduleFiltersLink />
          </div>
        )}

        <Pagination
          total={total}
          currentPage={currentPage}
          basePath="/schedule"
          searchParams={{ from: from ?? fromDate.toISOString().slice(0, 10), city, state }}
        />
      </div>
    </div>
  );
}
