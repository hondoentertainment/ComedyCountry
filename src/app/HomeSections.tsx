import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { listVenues } from "@/lib/venues";
import { listEvents, getEventsForUser } from "@/lib/events";
import { getEventRatingStatsBatch } from "@/lib/event-reviews";
import { formatEventPrice } from "@/lib/format";
import { authOptions } from "@/lib/auth";
import { SHOW_TYPE_LABELS } from "@/lib/constants";

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (count === 0) return <span className="text-zinc-500 text-sm">No reviews yet</span>;
  return (
    <span className="rating-badge">
      ★ {rating?.toFixed(1) ?? "—"} <span className="text-zinc-400">({count})</span>
    </span>
  );
}

export async function HomeSections() {
  const session = await getServerSession(authOptions);
  let venues: Awaited<ReturnType<typeof listVenues>>["venues"] = [];
  let events: Awaited<ReturnType<typeof listEvents>>["events"] = [];
  let forYouEvents: Awaited<ReturnType<typeof getEventsForUser>>["events"] = [];
  let ratingStats = new Map<string, { count: number; avgRating: number | null }>();

  try {
    const [v, e, forYou] = await Promise.all([
      listVenues({ take: 6 }),
      listEvents({ take: 8 }),
      session?.user?.id ? getEventsForUser(session.user.id, 6) : Promise.resolve({ events: [], total: 0 }),
    ]);
    venues = v.venues;
    events = e.events;
    forYouEvents = forYou.events;
    if (events.length > 0 || forYouEvents.length > 0) {
      const allIds = [...events.map((x) => x.id), ...forYouEvents.map((x) => x.id)];
      ratingStats = await getEventRatingStatsBatch(Array.from(new Set(allIds)));
    }
  } catch {
    /* DB not configured */
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {session?.user && (
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">Made for you</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md">
            Shows from comedians and venues you follow.
          </p>
          {forYouEvents.length > 0 ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forYouEvents.map((e) => {
              const stats = ratingStats.get(e.id);
              const comedianNames = e.comedians.map((ec) => ec.comedian.name).join(", ");
              const img = e.comedians[0]?.comedian?.headshotUrl;
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="card-interactive overflow-hidden group block"
                >
                  <div className="aspect-[4/3] bg-brand-charcoal relative overflow-hidden">
                    {img ? (
                      <Image
                        src={img}
                        alt={comedianNames}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                        🎤
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2">
                      <StarRating rating={stats?.avgRating ?? null} count={stats?.count ?? 0} />
                      <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-zinc-300">
                        {SHOW_TYPE_LABELS[e.showType] ?? e.showType}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate">{e.title ?? comedianNames}</h3>
                    <p className="text-zinc-400 text-sm truncate">
                      {e.venue.name} — {e.venue.city}, {e.venue.state}
                    </p>
                    <p className="text-zinc-500 text-sm mt-1">
                      {formatDate(e.date)}
                      {formatEventPrice(e.priceMin, e.priceMax) &&
                        ` • ${formatEventPrice(e.priceMin, e.priceMax)}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link
            href="/following"
            className="inline-block mt-4 text-sm text-brand-gold hover:underline font-medium"
          >
            View all following →
          </Link>
          </>
          ) : (
            <div className="py-12 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
              <p className="text-zinc-400 font-medium mb-2">No personalized events yet</p>
              <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
                Follow comedians and venues to see shows tailored to you here.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/comedians"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
                >
                  Browse comedians
                </Link>
                <Link
                  href="/venues"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 font-medium hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors"
                >
                  Browse venues
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-14">
        <h2 className="text-2xl font-bold text-white mb-6">Upcoming shows</h2>
        <p className="text-zinc-400 text-sm mb-6">Top picks from the national calendar.</p>
        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((e) => {
              const stats = ratingStats.get(e.id);
              const comedianNames = e.comedians.map((ec) => ec.comedian.name).join(", ");
              const img = e.comedians[0]?.comedian?.headshotUrl;
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="card-interactive overflow-hidden group block"
                >
                  <div className="aspect-square bg-brand-charcoal relative overflow-hidden">
                    {img ? (
                      <Image
                        src={img}
                        alt={comedianNames}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-600">
                        🎤
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <StarRating rating={stats?.avgRating ?? null} count={stats?.count ?? 0} />
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {e.title ?? comedianNames}
                    </h3>
                    <p className="text-zinc-500 text-xs truncate">
                      {e.venue.name} • {formatDate(e.date)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-16 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 mb-1">No upcoming shows in our database yet.</p>
            <p className="text-zinc-500 text-sm mb-3">We&apos;re adding shows every day—check back soon!</p>
            <Link href="/schedule" className="inline-block text-brand-gold hover:underline font-medium">
              View schedule →
            </Link>
          </div>
        )}
        <Link href="/schedule" className="inline-block mt-4 text-sm text-brand-gold hover:underline font-medium">
          View full schedule →
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Explore venues</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Comedy clubs, theaters, and more across the country.
        </p>
        {venues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((v) => {
              const photo = v.photos?.[0];
              return (
                <Link
                  key={v.id}
                  href={`/venues/${v.id}`}
                  className="card-interactive overflow-hidden group block"
                >
                  <div className="aspect-[16/10] bg-brand-charcoal relative overflow-hidden">
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={photo.caption ?? v.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                        🏛️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-black/50 text-zinc-300 text-xs">
                        {(v.upcomingEventCount ?? 0)} upcoming show{(v.upcomingEventCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{v.name}</h3>
                    <p className="text-zinc-400 text-sm">
                      {v.city}, {v.state}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-16 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 mb-1">No venues in our database yet.</p>
            <p className="text-zinc-500 text-sm mb-3">We&apos;re growing our catalog—come back soon.</p>
            <Link href="/venues" className="inline-block text-brand-gold hover:underline font-medium">
              Browse venues →
            </Link>
          </div>
        )}
        <Link href="/venues" className="inline-block mt-4 text-sm text-brand-gold hover:underline font-medium">
          View all venues →
        </Link>
      </section>
    </div>
  );
}
