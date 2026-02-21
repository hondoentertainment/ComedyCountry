import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenue } from "@/lib/venues";
import { VENUE_TYPE_LABELS, SHOW_TYPE_LABELS } from "@/lib/constants";

type PageProps = { params: Promise<{ id: string }> };

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params;
  const venue = await getVenue(id);

  if (!venue) notFound();

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/venues"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Venues
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{venue.name}</h1>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {venue.photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video rounded-lg overflow-hidden bg-zinc-800"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? venue.name}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
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
                      <p className="font-medium text-white">
                        {event.title ??
                          event.comedians.map((ec) => ec.comedian.name).join(", ")}
                      </p>
                      <p className="text-zinc-400 text-sm">
                        {formatDate(event.date)}
                        {event.showtime && ` • ${event.showtime}`}
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
            <p className="text-zinc-500">No upcoming shows at the moment.</p>
          )}
        </section>
      </div>
    </main>
  );
}
