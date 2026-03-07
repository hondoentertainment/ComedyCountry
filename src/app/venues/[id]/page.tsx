import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { getVenue } from "@/lib/venues";
import { authOptions } from "@/lib/auth";
import { VENUE_TYPE_LABELS, SHOW_TYPE_LABELS } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { FollowButton } from "@/components/FollowButton";
import { ImageGalleryLightbox } from "@/components/ImageGalleryLightbox";
import { VenueMap } from "@/components/VenueMap";
import { VenueStructuredData } from "@/components/StructuredData";
import { VenueReviews } from "@/components/VenueReviews";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) return { title: "Venue | Punchline Atlas" };
  return {
    title: `${venue.name} — ${venue.city}, ${venue.state} | Punchline Atlas`,
    description: `Comedy venue ${venue.name} in ${venue.city}, ${venue.state}. Upcoming shows, capacity, and more.`,
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params;
  const [venue, session] = await Promise.all([
    getVenue(id),
    getServerSession(authOptions),
  ]);

  if (!venue) notFound();

  let isFollowing = false;
  if (session?.user?.id) {
    const follow = await prisma.venueFollow.findUnique({
      where: {
        userId_venueId: {
          userId: session.user.id,
          venueId: venue.id,
        },
      },
    });
    isFollowing = !!follow;
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

  return (
    <main className="min-h-screen">
      <VenueStructuredData venue={venue} baseUrl={siteUrl} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/venues"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Venues
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{venue.name}</h1>
            <FollowButton
              type="venue"
              id={venue.id}
              initialFollowing={isFollowing}
            />
          </div>
          <p className="text-zinc-400">
            {venue.address && (
              <>
                {venue.address}
                <br />
              </>
            )}
            {venue.city}, {venue.state}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-block text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">
              {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
            </span>
            {venue.capacity && (
              <span className="inline-block text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">
                {venue.capacity} capacity
              </span>
            )}
          </div>
        </header>

        {venue.latitude != null && venue.longitude != null && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Location</h2>
            <VenueMap
              venues={[
                {
                  id: venue.id,
                  name: venue.name,
                  address: venue.address,
                  city: venue.city,
                  state: venue.state,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                },
              ]}
            />
          </section>
        )}

        <section className="mb-8">
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:underline"
            >
              Visit website →
            </a>
          )}
          {venue.socialLinks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                Social
              </h3>
              <ul className="flex gap-4">
                {venue.socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:underline capitalize"
                    >
                      {link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {venue.photos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Photos</h2>
            <ImageGalleryLightbox
              photos={venue.photos.map((p) => ({
                id: p.id,
                url: p.url,
                caption: p.caption,
              }))}
              venueName={venue.name}
            />
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Upcoming Shows ({venue.events.length})
          </h2>
          {venue.events.length > 0 ? (
            <ul className="space-y-4">
              {venue.events.map((event) => (
                <li
                  key={event.id}
                  className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium text-white hover:text-brand-gold"
                      >
                        {event.title ??
                          event.comedians.map((ec) => ec.comedian.name).join(", ")}
                      </Link>
                      <p className="text-zinc-400 text-sm">
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
                    {event.ticketUrl && (
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90"
                      >
                        Get tickets
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 px-6 rounded-lg bg-brand-charcoal/30 border border-zinc-800 border-dashed text-center">
              <p className="text-zinc-400 font-medium mb-1">No upcoming shows</p>
              <p className="text-zinc-500 text-sm">
                Check back later or <Link href="/schedule" className="text-brand-gold hover:underline">browse the schedule</Link> for other venues.
              </p>
            </div>
          )}
        </section>

        <VenueReviews venueId={venue.id} />
      </div>
    </main>
  );
}
