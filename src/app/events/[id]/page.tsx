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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event | Punchline Atlas" };
  const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  return {
    title: `${title} | Punchline Atlas`,
    description: `Rate and review ${title} at ${event.venue.name}`,
  };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;

  const [event, session, stats] = await Promise.all([
    getEventById(id),
    getServerSession(authOptions),
    getEventRatingStats(id).catch(() => ({ count: 0, avgRating: null })),
  ]);

  if (!event) notFound();

  const userReview = session?.user?.id
    ? await getUserReview(id, session.user.id).catch(() => null)
    : null;

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const img = event.comedians[0]?.comedian?.headshotUrl;

  return (
    <main className="min-h-screen">
      {/* Spotify-style hero with Yelp rating prominence */}
      <div className="relative h-48 sm:h-64 md:h-72 bg-brand-charcoal">
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
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
          className="text-sm text-zinc-400 hover:text-brand-gold mb-6 inline-block"
        >
          ← Back to schedule
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
          <div className="flex flex-wrap gap-2 mt-4">
            {event.comedians.map((ec) => (
              <Link
                key={ec.id}
                href={`/comedians/${ec.comedian.slug}`}
                className="text-sm text-zinc-400 hover:text-brand-gold font-medium"
              >
                {ec.comedian.name}
              </Link>
            ))}
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90 ml-2"
              >
                Get tickets
              </a>
            )}
          </div>
        </div>

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
    </main>
  );
}
