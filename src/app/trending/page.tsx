import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { TOURING_STATUS_LABELS } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";

export const metadata = {
  title: "Trending | Punchline Atlas",
  description: "Discover trending comedians, hot shows, and popular venues across the comedy scene.",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let trendingComedians: Array<{
    id: string; name: string; slug: string; headshotUrl: string | null;
    touringStatus: string; genres: { genre: string }[];
    _count: { followers: number; events: number }; recentFollows: number;
  }> = [];
  let hotShows: Array<{
    id: string; date: Date; title: string | null; showtime: string | null;
    priceMin: { toString(): string } | null; priceMax: { toString(): string } | null;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string; slug: string; headshotUrl: string | null } }>;
    _count: { attendees: number; reviews: number };
  }> = [];
  let topVenues: Array<{
    id: string; name: string; city: string; state: string; type: string;
    _count: { followers: number; events: number };
  }> = [];

  try {
    const [follows, shows, venues] = await Promise.all([
      prisma.comedianFollow.groupBy({
        by: ["comedianId"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        orderBy: { _count: { comedianId: "desc" } },
        take: 12,
      }),
      prisma.event.findMany({
        where: { date: { gte: new Date() } },
        include: {
          venue: { select: { name: true, city: true, state: true } },
          comedians: { include: { comedian: { select: { name: true, slug: true, headshotUrl: true } } } },
          _count: { select: { attendees: true, reviews: true } },
        },
        orderBy: { attendees: { _count: "desc" } },
        take: 10,
      }),
      prisma.venue.findMany({
        select: {
          id: true, name: true, city: true, state: true, type: true,
          _count: { select: { followers: true, events: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: 10,
      }),
    ]);

    const comedianIds = follows.map((f) => f.comedianId);
    const comedians = await prisma.comedian.findMany({
      where: { id: { in: comedianIds } },
      select: {
        id: true, name: true, slug: true, headshotUrl: true, touringStatus: true,
        genres: true, _count: { select: { followers: true, events: true } },
      },
    });

    const cMap = new Map(comedians.map((c) => [c.id, c]));
    trendingComedians = comedianIds
      .map((id) => {
        const c = cMap.get(id);
        if (!c) return null;
        return { ...c, recentFollows: follows.find((f) => f.comedianId === id)?._count ?? 0 };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    hotShows = shows;
    topVenues = venues;
  } catch {
    // DB not configured
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Trending</h1>
        <p className="text-zinc-400 mb-10">What&apos;s hot in the comedy world right now.</p>

        {/* Trending Comedians */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            Trending comedians
          </h2>
          {trendingComedians.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingComedians.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/comedians/${c.slug}`}
                  className="card-interactive overflow-hidden group block relative"
                >
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-brand-gold text-brand-dark flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="aspect-square bg-brand-charcoal relative overflow-hidden">
                    {c.headshotUrl ? (
                      <Image
                        src={c.headshotUrl}
                        alt={c.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-white text-sm truncate">{c.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {c._count.followers} followers · {TOURING_STATUS_LABELS[c.touringStatus] ?? c.touringStatus}
                    </p>
                    <p className="text-brand-gold text-xs mt-1 font-medium">
                      +{c.recentFollows} new followers this month
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No trending data yet. Follow comedians to see trends!</p>
          )}
        </section>

        {/* Hot Shows */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Most anticipated shows
          </h2>
          {hotShows.length > 0 ? (
            <div className="space-y-3">
              {hotShows.map((show, i) => {
                const comedianNames = show.comedians.map((ec) => ec.comedian.name).join(", ");
                const displayTitle = show.title ?? comedianNames;
                return (
                  <Link
                    key={show.id}
                    href={`/events/${show.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-zinc-600 font-bold text-lg w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="w-12 h-12 rounded-lg bg-brand-charcoal overflow-hidden shrink-0 relative">
                      {show.comedians[0]?.comedian?.headshotUrl ? (
                        <Image
                          src={show.comedians[0].comedian.headshotUrl}
                          alt={displayTitle}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">
                          🎤
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{displayTitle}</p>
                      <p className="text-zinc-500 text-sm truncate">
                        {show.venue.name} · {show.venue.city}, {show.venue.state}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-zinc-400 text-sm">
                        {new Date(show.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {show._count.attendees > 0 && (
                        <p className="text-brand-gold text-xs font-medium">
                          {show._count.attendees} going
                        </p>
                      )}
                      {formatEventPrice(show.priceMin, show.priceMax) && (
                        <p className="text-zinc-500 text-xs">{formatEventPrice(show.priceMin, show.priceMax)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500">No upcoming shows yet.</p>
          )}
        </section>

        {/* Top Venues */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Top venues
          </h2>
          {topVenues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topVenues.map((v, i) => (
                <Link
                  key={v.id}
                  href={`/venues/${v.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <span className="text-zinc-600 font-bold text-lg w-6 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{v.name}</p>
                    <p className="text-zinc-500 text-sm">
                      {v.city}, {v.state}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <p className="text-zinc-400">{v._count.followers} followers</p>
                    <p className="text-zinc-500">{v._count.events} shows</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No venue data yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
