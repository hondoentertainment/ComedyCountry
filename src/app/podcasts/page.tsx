import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Comedy Podcasts | Punchline Atlas",
  description: "Discover comedy podcasts from your favorite comedians. Browse episodes, live shows, and podcast links.",
};

export const dynamic = "force-dynamic";

export default async function PodcastsPage() {
  // Get all comedians with podcast links, grouped
  const podcastLinks = await prisma.comedianPodcastLink.findMany({
    include: {
      comedian: {
        select: {
          id: true,
          name: true,
          slug: true,
          headshotUrl: true,
          genres: { select: { genre: true } },
        },
      },
    },
    orderBy: { podcastName: "asc" },
  });

  // Group by podcast name for a directory-style view
  const podcastMap = new Map<string, Array<typeof podcastLinks[number]>>();
  podcastLinks.forEach((link) => {
    const name = link.podcastName;
    if (!podcastMap.has(name)) podcastMap.set(name, []);
    podcastMap.get(name)!.push(link);
  });

  const podcasts = Array.from(podcastMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Also get comedians who have podcast live show events
  const podcastEvents = await prisma.event.findMany({
    where: {
      showType: "PODCAST_LIVE",
      date: { gte: new Date() },
    },
    include: {
      venue: { select: { name: true, city: true, state: true } },
      comedians: { include: { comedian: { select: { name: true, slug: true } } } },
    },
    orderBy: { date: "asc" },
    take: 10,
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Comedy Podcasts</h1>
        <p className="text-zinc-400 mb-8">
          Discover podcasts from comedians on Punchline Atlas. Catch up on episodes or see live podcast tapings.
        </p>

        {/* Live Podcast Events */}
        {podcastEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Live Podcast Tapings</h2>
            <div className="space-y-2">
              {podcastEvents.map((event) => {
                const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <p className="text-white font-medium">{event.title || comedianNames}</p>
                      <p className="text-zinc-500 text-sm">
                        {event.venue.name} · {event.venue.city}, {event.venue.state}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-brand-gold text-sm font-medium">
                        {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-zinc-600 text-xs">Live Podcast</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Podcast Directory */}
        {podcasts.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">
              Podcast Directory
              <span className="text-zinc-500 text-sm font-normal ml-2">{podcasts.length} podcasts</span>
            </h2>
            <div className="space-y-4">
              {podcasts.map(([podcastName, links]) => (
                <div key={podcastName} className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">{podcastName}</h3>
                    <span className="text-zinc-500 text-xs">
                      {links.length} comedian{links.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {links.map((link) => (
                      <Link
                        key={link.id}
                        href={`/comedians/${link.comedian.slug}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors group"
                      >
                        {link.comedian.headshotUrl ? (
                          <Image
                            src={link.comedian.headshotUrl}
                            alt={link.comedian.name}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-500 text-xs font-bold">
                            {link.comedian.name[0]}
                          </div>
                        )}
                        <span className="text-zinc-300 text-sm group-hover:text-brand-gold transition-colors">
                          {link.comedian.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                  {links[0]?.episodeUrl && (
                    <a
                      href={links[0].episodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-brand-gold text-xs hover:underline"
                    >
                      Listen &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="py-16 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 font-medium mb-2">No podcasts yet</p>
            <p className="text-zinc-500 text-sm">
              Comedian podcasts will appear here as they&apos;re added to the platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
