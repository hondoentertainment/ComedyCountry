import Link from "next/link";
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

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/schedule"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-6 inline-block"
        >
          ← Back to schedule
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {title}
          </h1>
          <Link
            href={`/venues/${event.venue.id}`}
            className="text-brand-gold hover:underline"
          >
            {event.venue.name} — {event.venue.city}, {event.venue.state}
          </Link>
          <p className="text-zinc-400 mt-2">
            {formatDate(event.date)}
            {event.showtime && ` • ${event.showtime}`}
            {formatEventPrice(event.priceMin, event.priceMax) && (
              <> • {formatEventPrice(event.priceMin, event.priceMax)}</>
            )}
          </p>
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
            {SHOW_TYPE_LABELS[event.showType] ?? event.showType}
          </span>
          <div className="flex flex-wrap gap-2 mt-3">
            {event.comedians.map((ec) => (
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
