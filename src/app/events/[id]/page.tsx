import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEventById } from "@/lib/events";
import { getUserReview, getEventRatingStats } from "@/lib/event-reviews";
import { formatEventPrice } from "@/lib/format";
import { SHOW_TYPE_LABELS } from "@/lib/constants";
import { EventReviewsSection } from "@/components/EventReviewsSection";
import { EventShareButtons } from "@/components/EventShareButtons";
import { EventStructuredData } from "@/components/StructuredData";
import { AttendanceButtons } from "@/components/AttendanceButtons";
import { FriendsGoingBadge } from "@/components/FriendsGoingBadge";
import { CalendarExport } from "@/components/CalendarExport";
import { TicketButton } from "@/components/TicketButton";
import WaitlistButton from "@/components/WaitlistButton";
import { getEventReputationSummary } from "@/lib/live-reputation";
import { getComedyPassportSummary } from "@/lib/comedy-passport";
import { getEventRecommendationInsight } from "@/lib/recommendations";
import { getSimilarEvents } from "@/lib/similar-events";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event | Punchline Atlas" };
  const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const description = `Rate and review ${title} at ${event.venue.name}`;
  // Use first comedian headshot or placeholder
  const img =
    event.comedians[0]?.comedian?.headshotUrl ?? `${siteUrl}/og-default.png`;
  const images = [
    { url: img, width: 1200, height: 630, alt: title },
  ];
  return {
    title: `${title} | Punchline Atlas`,
    description,
    openGraph: {
      title: `${title} | Punchline Atlas`,
      description,
      url: `${siteUrl}/events/${id}`,
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Punchline Atlas`,
      description,
      images: [img],
    },
  };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;

  const [event, session, stats] = await Promise.all([
    getEventById(id, { includeTicketTypes: true }),
    getServerSession(authOptions),
    getEventRatingStats(id).catch(() => ({ count: 0, avgRating: null })),
  ]);

  if (!event) notFound();

  const ticketTypes = "ticketTypes" in event ? (event.ticketTypes as { capacity: number; sold: number }[]) ?? [] : [];
  const totalCapacity = ticketTypes.reduce((s, t) => s + t.capacity, 0);
  const totalSold = ticketTypes.reduce((s, t) => s + t.sold, 0);
  const isSoldOut = ticketTypes.length > 0 && totalSold >= totalCapacity;

  const similarEvents = await getSimilarEvents(id, 4).catch(() => []);

  const userReview = session?.user?.id
    ? await getUserReview(id, session.user.id).catch(() => null)
    : null;
  const [reputation, passport, recommendation] = await Promise.all([
    getEventReputationSummary(id).catch(() => null),
    session?.user?.id ? getComedyPassportSummary(session.user.id).catch(() => null) : Promise.resolve(null),
    session?.user?.id
      ? getEventRecommendationInsight(session.user.id, id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const img = event.comedians[0]?.comedian?.headshotUrl;
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

  return (
    <div className="min-h-screen">
      <EventStructuredData event={event} baseUrl={siteUrl} />
      {/* Spotify-style hero with Yelp rating prominence */}
      <div className="relative h-48 sm:h-64 md:h-72 bg-brand-charcoal">
        {img ? (
          <Image
            src={img}
            alt={`Event photo: ${title}`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-zinc-600">
            🎤
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            {stats.count > 0 && (
              <span className="rating-badge mb-3 inline-block">
                ★ {stats.avgRating?.toFixed(1)} ({stats.count} review{stats.count !== 1 ? "s" : ""})
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {title}
            </h1>
            <Link
              href={`/venues/${event.venue.id}`}
              className="text-brand-gold hover:underline text-sm sm:text-base font-medium"
            >
              {event.venue.name} — {event.venue.city}, {event.venue.state}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/schedule"
          className="inline-flex items-center text-sm text-zinc-400 hover:text-brand-gold transition-colors mb-6"
        >
          ← Back to Events
        </Link>

        <div className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          <p className="text-zinc-400">
            {formatDate(event.date)}
            {event.showtime && ` • ${event.showtime}`}
            {formatEventPrice(event.priceMin, event.priceMax) && (
              <> • {formatEventPrice(event.priceMin, event.priceMax)}</>
            )}
          </p>
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300">
            {SHOW_TYPE_LABELS[event.showType] ?? event.showType}
          </span>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <EventShareButtons
              title={title}
              url={`${siteUrl}/events/${id}`}
              venueName={event.venue.name}
            />
            <CalendarExport
              eventId={id}
              title={title}
              date={event.date.toISOString()}
              venue={event.venue.name}
              location={`${event.venue.name}, ${event.venue.city}, ${event.venue.state}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AttendanceButtons eventId={id} />
            {session?.user && <FriendsGoingBadge eventId={id} />}
            {!isSoldOut && <WaitlistButton eventId={id} />}
          </div>
          <div className="flex flex-wrap gap-2 mt-4 items-center">
            {event.comedians.map((ec) => (
              <Link
                key={ec.id}
                href={`/comedians/${ec.comedian.slug}`}
                className="text-sm text-zinc-400 hover:text-brand-gold font-medium"
              >
                {ec.comedian.name}
              </Link>
            ))}
            <span className="flex-1" />
            {isSoldOut ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-amber-400 font-medium">Sold out</span>
                <WaitlistButton eventId={id} />
                <span className="text-zinc-600">·</span>
                <EventShareButtons
                  title={title}
                  url={`${siteUrl}/events/${id}`}
                  venueName={event.venue.name}
                />
              </div>
            ) : event.ticketUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <TicketButton
                  eventId={id}
                  ticketUrl={event.ticketUrl}
                  className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90"
                >
                  Get tickets
                </TicketButton>
                <span className="text-zinc-600">·</span>
                <EventShareButtons
                  title={title}
                  url={`${siteUrl}/events/${id}`}
                  venueName={event.venue.name}
                />
              </div>
            ) : (
              <EventShareButtons
                title={title}
                url={`${siteUrl}/events/${id}`}
                venueName={event.venue.name}
              />
            )}
          </div>
        </div>

        {recommendation && (
          <section className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
            <h2 className="text-lg font-semibold text-white mb-2">Why this show fits you</h2>
            <p className="text-zinc-400 text-sm">{recommendation.reason}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {typeof recommendation.matchPct === "number" && recommendation.matchPct > 0 && (
                <span className="px-2 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs">
                  {recommendation.matchPct}% match
                </span>
              )}
              {recommendation.stretchLabel && (
                <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs capitalize">
                  {recommendation.stretchLabel} pick
                </span>
              )}
              {(recommendation.tags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          <h2 className="text-lg font-semibold text-white mb-2">Plan your night</h2>
          <p className="text-zinc-400 text-sm">
            Know the room, line up nearby options, and make sure you get a reminder before the show starts.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={`/venues/${event.venue.id}`}
              className="rounded-lg border border-zinc-800 bg-brand-charcoal/50 p-3 hover:border-zinc-700 transition-colors"
            >
              <p className="text-sm font-medium text-white">Venue details</p>
              <p className="text-xs text-zinc-500 mt-1">
                {event.venue.name} · {event.venue.city}, {event.venue.state}
              </p>
            </Link>
            <Link
              href={`/schedule?city=${encodeURIComponent(event.venue.city)}&state=${encodeURIComponent(event.venue.state)}`}
              className="rounded-lg border border-zinc-800 bg-brand-charcoal/50 p-3 hover:border-zinc-700 transition-colors"
            >
              <p className="text-sm font-medium text-white">More shows in this city</p>
              <p className="text-xs text-zinc-500 mt-1">
                Browse the rest of the {event.venue.city} schedule.
              </p>
            </Link>
            <Link
              href={`/map?city=${encodeURIComponent(event.venue.city)}&state=${encodeURIComponent(event.venue.state)}`}
              className="rounded-lg border border-zinc-800 bg-brand-charcoal/50 p-3 hover:border-zinc-700 transition-colors"
            >
              <p className="text-sm font-medium text-white">Explore nearby venues</p>
              <p className="text-xs text-zinc-500 mt-1">
                See clubs and theaters around {event.venue.city}.
              </p>
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-zinc-800 bg-brand-charcoal/50 p-3 hover:border-zinc-700 transition-colors"
            >
              <p className="text-sm font-medium text-white">Turn on reminders</p>
              <p className="text-xs text-zinc-500 mt-1">
                Manage 24-hour and 1-hour show reminders in settings.
              </p>
            </Link>
          </div>
        </section>

        {reputation && (
          <section className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
            <h2 className="text-lg font-semibold text-white mb-2">Verified crowd take</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-brand-gold text-xl font-bold">{reputation.trustScore}</p>
                <p className="text-zinc-500 text-xs">Trust score</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">{reputation.verifiedSignalRate}%</p>
                <p className="text-zinc-500 text-xs">Verified signals</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">
                  {reputation.wouldRecommendRate ?? "—"}{reputation.wouldRecommendRate !== null ? "%" : ""}
                </p>
                <p className="text-zinc-500 text-xs">Would recommend</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">{reputation.verifiedReviewCount}</p>
                <p className="text-zinc-500 text-xs">Verified reviews</p>
              </div>
            </div>
            {reputation.topSignals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {reputation.topSignals.map((signal) => (
                  <span
                    key={signal}
                    className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {similarEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">More like this</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similarEvents.map((ev) => {
                const evTitle = ev.title ?? ev.comedians.map((ec) => ec.comedian.name).join(", ");
                const evImg = ev.comedians[0]?.comedian?.headshotUrl;
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="card-interactive flex gap-3 p-4 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-brand-charcoal relative">
                      {evImg ? (
                        <Image
                          src={evImg}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-600">
                          🎤
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{evTitle}</p>
                      <p className="text-sm text-zinc-400">
                        {ev.venue.name} · {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {passport && (
          <section className="mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
            <h2 className="text-lg font-semibold text-white mb-2">Your comedy passport</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <p className="text-brand-gold text-xl font-bold">{passport.showsAttended}</p>
                <p className="text-zinc-500 text-xs">Shows attended</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">{passport.scenesExplored}</p>
                <p className="text-zinc-500 text-xs">Scenes explored</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">{passport.comediansSeen}</p>
                <p className="text-zinc-500 text-xs">Comedians seen</p>
              </div>
              <div>
                <p className="text-white text-xl font-bold">{passport.currentStreak}</p>
                <p className="text-zinc-500 text-xs">Current streak</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm">{passport.nextMilestone}</p>
          </section>
        )}

        <EventReviewsSection
          eventId={id}
          initialReview={
            userReview
              ? {
                  id: userReview.id,
                  rating: userReview.rating,
                  comment: userReview.comment,
                }
              : null
          }
          initialStats={stats}
          isSignedIn={!!session?.user}
        />
      </div>
    </div>
  );
}
