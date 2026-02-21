import Link from "next/link";
import { notFound } from "next/navigation";
import { getComedian } from "@/lib/comedians";
import { TOURING_STATUS_LABELS, SHOW_TYPE_LABELS } from "@/lib/constants";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ComedianPage({ params }: PageProps) {
  const { slug } = await params;
  const comedian = await getComedian(slug);

  if (!comedian) notFound();

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const upcomingShows = comedian.events
    .map((ec) => ec.event)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/comedians"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Comedians
        </Link>

        <header className="flex gap-6 mb-8">
          {comedian.headshotUrl ? (
            <img
              src={comedian.headshotUrl}
              alt={comedian.name}
              className="w-32 h-32 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-4xl text-zinc-500">
              {comedian.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-white mb-2">
              {comedian.name}
            </h1>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-block text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">
                {TOURING_STATUS_LABELS[comedian.touringStatus] ??
                  comedian.touringStatus}
              </span>
              {comedian.yearsActiveFrom && (
                <span className="text-zinc-400 text-sm">
                  Active {comedian.yearsActiveFrom}
                  {comedian.yearsActiveTo ? `–${comedian.yearsActiveTo}` : "+"}
                </span>
              )}
            </div>
            {comedian.bio && (
              <p className="text-zinc-400 text-sm leading-relaxed">
                {comedian.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-4">
              {comedian.website && (
                <a
                  href={comedian.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline text-sm"
                >
                  Website
                </a>
              )}
              {comedian.socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline text-sm capitalize"
                >
                  {link.platform}
                </a>
              ))}
              {comedian.youtubeChannel && (
                <a
                  href={comedian.youtubeChannel.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline text-sm"
                >
                  YouTube
                  {comedian.youtubeChannel.subscriberCount &&
                    ` (${(comedian.youtubeChannel.subscriberCount / 1000).toFixed(1)}K subs)`}
                </a>
              )}
            </div>
          </div>
        </header>

        {comedian.genres.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 mb-2">Genres</h2>
            <div className="flex flex-wrap gap-2">
              {comedian.genres.map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 rounded-full bg-zinc-700 text-zinc-300 text-sm capitalize"
                >
                  {g.genre}
                </span>
              ))}
            </div>
          </section>
        )}

        {comedian.specialReleases.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Specials & Releases
            </h2>
            <ul className="space-y-2">
              {comedian.specialReleases.map((special) => (
                <li key={special.id} className="flex gap-2 items-center">
                  <span className="text-white font-medium">{special.title}</span>
                  {special.releaseYear && (
                    <span className="text-zinc-500 text-sm">
                      ({special.releaseYear})
                    </span>
                  )}
                  {special.platform && (
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">
                      {special.platform}
                    </span>
                  )}
                  {special.url && (
                    <a
                      href={special.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:underline text-sm"
                    >
                      Watch
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Upcoming Shows ({upcomingShows.length})
          </h2>
          {upcomingShows.length > 0 ? (
            <ul className="space-y-4">
              {upcomingShows.map((event) => (
                <li
                  key={event.id}
                  className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <Link
                        href={`/venues/${event.venue.id}`}
                        className="font-medium text-white hover:text-brand-gold"
                      >
                        {event.venue.name}
                      </Link>
                      <p className="text-zinc-400 text-sm">
                        {event.venue.city}, {event.venue.state} •{" "}
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
