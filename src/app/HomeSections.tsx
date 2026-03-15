import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { listVenues } from "@/lib/venues";
import { listEvents, getEventsForUser } from "@/lib/events";
import { getEventRatingStatsBatch } from "@/lib/event-reviews";
import { formatEventPrice } from "@/lib/format";
import { authOptions } from "@/lib/auth";
import { SHOW_TYPE_LABELS } from "@/lib/constants";
import { PromotedContent } from "@/components/PromotedContent";
import { FriendsGoingBadge } from "@/components/FriendsGoingBadge";
import { getTasteProfile, getHappeningTonight } from "@/lib/taste-profile";

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (count === 0) return <span className="text-zinc-500 text-sm">No reviews yet</span>;
  return (
    <span className="rating-badge">
      ★ {rating?.toFixed(1) ?? "—"} <span className="text-zinc-400">({count})</span>
    </span>
  );
}

const DISCOVER_LINKS = [
  { href: "/trending", label: "Trending", icon: "🔥", description: "What's hot right now" },
  { href: "/comedians", label: "Comedians", icon: "🎤", description: "Browse 1,800+ comedians" },
  { href: "/venues", label: "Venues", icon: "🏛️", description: "Clubs & theaters nationwide" },
  { href: "/open-mics", label: "Open Mics", icon: "🎙️", description: "Find your local open mic" },
  { href: "/festivals", label: "Festivals", icon: "🎪", description: "Comedy festivals coast to coast" },
  { href: "/specials", label: "Specials", icon: "📺", description: "Rate and discover specials" },
];

const FEATURED_SCENES = [
  { city: "new-york", label: "New York", state: "NY" },
  { city: "los-angeles", label: "Los Angeles", state: "CA" },
  { city: "chicago", label: "Chicago", state: "IL" },
  { city: "austin", label: "Austin", state: "TX" },
  { city: "nashville", label: "Nashville", state: "TN" },
  { city: "atlanta", label: "Atlanta", state: "GA" },
  { city: "seattle", label: "Seattle", state: "WA" },
  { city: "minneapolis", label: "Minneapolis", state: "MN" },
];

export async function HomeSections() {
  const session = await getServerSession(authOptions);
  let venues: Awaited<ReturnType<typeof listVenues>>["venues"] = [];
  let events: Awaited<ReturnType<typeof listEvents>>["events"] = [];
  let forYouEvents: Awaited<ReturnType<typeof getEventsForUser>>["events"] = [];
  let tasteProfile: Awaited<ReturnType<typeof getTasteProfile>> = null;
  let ratingStats = new Map<string, { count: number; avgRating: number | null }>();
  let dataUnavailable = false;
  let dbAvailable = false;
  let tonightEvents: Awaited<ReturnType<typeof getHappeningTonight>> = [];

  try {
    const [profile, venueResult, eventResult, forYouResult, tonight] = await Promise.all([
      session?.user?.id ? getTasteProfile(session.user.id) : Promise.resolve(null),
      listVenues({ take: 6 }),
      listEvents({ take: 8 }),
      session?.user?.id
        ? getEventsForUser(session.user.id, 6)
        : Promise.resolve({ events: [], total: 0 }),
      getHappeningTonight(),
    ]);
    tasteProfile = profile;
    venues = venueResult.venues;
    events = eventResult.events;
    forYouEvents = forYouResult.events;
    tonightEvents = tonight;
    dbAvailable = true;
    if (events.length > 0 || forYouEvents.length > 0) {
      const allIds = [...events.map((x) => x.id), ...forYouEvents.map((x) => x.id)];
      ratingStats = await getEventRatingStatsBatch(Array.from(new Set(allIds)));
    }
  } catch {
    dataUnavailable = true;
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {dataUnavailable && (
        <div className="mb-6 p-4 rounded-card bg-amber-500/10 border border-amber-500/40 text-amber-200 text-center">
          Data temporarily unavailable. Please try again later.
        </div>
      )}

      {/* Happening Tonight — prominent */}
      {tonightEvents.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Happening tonight</h2>
            <Link
              href="/happening-tonight"
              className="text-sm font-medium text-brand-gold hover:text-brand-gold/80 transition-colors"
            >
              See all →
            </Link>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            Live comedy shows today and tonight.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tonightEvents.slice(0, 6).map((event) => {
              const comedianNames = event.comedians.map((c) => c.name).join(", ");
              const displayTitle = event.title ?? comedianNames;
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="card-interactive p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 flex gap-3"
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl">
                    🎤
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white truncate">{displayTitle}</h3>
                    <p className="text-zinc-400 text-sm truncate">
                      {event.venue.name} · {event.venue.city}, {event.venue.state}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {event.showtime && (
                        <span className="text-xs text-brand-gold font-medium">{event.showtime}</span>
                      )}
                      <FriendsGoingBadge eventId={event.id} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Discover section — always visible */}
      <section className="mb-14">
        <h2 className="text-2xl font-bold text-white mb-2">Discover</h2>
        <p className="text-zinc-400 text-sm mb-6">Explore everything comedy has to offer.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DISCOVER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card-interactive p-4 text-center group block"
            >
              <span className="text-3xl block mb-2">{item.icon}</span>
              <h3 className="font-semibold text-white text-sm">{item.label}</h3>
              <p className="text-zinc-500 text-xs mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Made for you — signed-in users only */}
      {session?.user && (
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">Made for you</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md">
            Shows from comedians and venues you follow.
          </p>
          {tasteProfile?.topAttributes?.length ? (
            <div className="mb-6 p-4 rounded-card bg-brand-surface border border-zinc-800">
              <p className="text-white font-medium mb-1">Your comedy DNA</p>
              <p className="text-zinc-400 text-sm mb-3">{tasteProfile.profileSummary}</p>
              <div className="flex flex-wrap gap-2">
                {tasteProfile.topAttributes.slice(0, 4).map((attribute) => (
                  <span
                    key={attribute}
                    className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs"
                  >
                    {attribute.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
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
                        alt={`Event photo featuring ${comedianNames}`}
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
                      <FriendsGoingBadge eventId={e.id} />
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

      {/* Upcoming shows */}
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
                        alt={`Event photo featuring ${comedianNames}`}
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
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2">
                      <StarRating rating={stats?.avgRating ?? null} count={stats?.count ?? 0} />
                      <FriendsGoingBadge eventId={e.id} />
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
          <div className="py-10 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 mb-1">No upcoming shows yet.</p>
            <p className="text-zinc-500 text-sm mb-3">Browse comedians and venues to find shows near you.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/comedians" className="inline-block text-brand-gold hover:underline font-medium">
                Browse comedians →
              </Link>
              <Link href="/schedule" className="inline-block text-brand-gold hover:underline font-medium">
                View schedule →
              </Link>
            </div>
          </div>
        )}
        {events.length > 0 && (
          <Link href="/schedule" className="inline-block mt-4 text-sm text-brand-gold hover:underline font-medium">
            View full schedule →
          </Link>
        )}
      </section>

      {/* Promoted Events */}
      {dbAvailable && <PromotedContent type="EVENT_FEATURED" className="mb-6 space-y-3" />}

      {/* Comedy Scenes — always visible */}
      <section className="mb-14">
        <h2 className="text-2xl font-bold text-white mb-2">Comedy scenes</h2>
        <p className="text-zinc-400 text-sm mb-6">Explore the best comedy cities in America.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURED_SCENES.map((scene) => (
            <Link
              key={scene.city}
              href={`/scenes/${scene.city}`}
              className="card-interactive p-5 text-center group block"
            >
              <h3 className="font-semibold text-white">{scene.label}</h3>
              <p className="text-zinc-500 text-xs mt-1">{scene.state}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore venues */}
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
                        alt={photo.caption ? `Photo of ${v.name}: ${photo.caption}` : `Photo of ${v.name}`}
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
          <div className="py-10 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 mb-1">No venues loaded yet.</p>
            <p className="text-zinc-500 text-sm mb-3">Check out comedy scenes by city or browse all venues.</p>
            <Link href="/venues" className="inline-block text-brand-gold hover:underline font-medium">
              Browse venues →
            </Link>
          </div>
        )}
        {venues.length > 0 && (
          <Link href="/venues" className="inline-block mt-4 text-sm text-brand-gold hover:underline font-medium">
            View all venues →
          </Link>
        )}
      </section>
    </div>
  );
}
