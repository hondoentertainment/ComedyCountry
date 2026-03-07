import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Comedy Festivals | Punchline Atlas",
  description: "Discover comedy festivals across the country. Browse upcoming festival events, lineups, and venues.",
};

export const dynamic = "force-dynamic";

export default async function FestivalsPage() {
  let festivalVenues: Array<{
    id: string; name: string; city: string; state: string;
    photos: { url: string }[];
    _count: { events: number; followers: number };
  }> = [];
  let upcomingFestivals: Array<{
    id: string; date: Date; title: string | null; showtime: string | null;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string; slug: string; headshotUrl: string | null } }>;
    _count: { attendees: number };
  }> = [];

  try {
    const [venues, festivals] = await Promise.all([
      prisma.venue.findMany({
        where: { type: "FESTIVAL" },
        include: { photos: { take: 1 }, _count: { select: { events: true, followers: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.event.findMany({
        where: { showType: "FESTIVAL", date: { gte: new Date() } },
        include: {
          venue: { select: { name: true, city: true, state: true } },
          comedians: { include: { comedian: { select: { name: true, slug: true, headshotUrl: true } } } },
          _count: { select: { attendees: true } },
        },
        orderBy: { date: "asc" },
        take: 30,
      }),
    ]);
    festivalVenues = venues;
    upcomingFestivals = festivals;
  } catch {
    // DB not configured
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Comedy Festivals</h1>
      <p className="text-zinc-400 mb-10">
        The biggest comedy events and festivals happening across the country.
      </p>

      {/* Festival Venues */}
      {festivalVenues.length > 0 && (
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Festival Venues</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {festivalVenues.map((v) => (
              <Link
                key={v.id}
                href={`/venues/${v.id}`}
                className="card-interactive overflow-hidden group block"
              >
                <div className="aspect-[16/10] bg-brand-charcoal relative overflow-hidden">
                  {v.photos[0] ? (
                    <Image
                      src={v.photos[0].url}
                      alt={v.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                      🎪
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{v.name}</h3>
                  <p className="text-zinc-500 text-sm">{v.city}, {v.state}</p>
                  <p className="text-zinc-600 text-xs mt-1">{v._count.events} events &middot; {v._count.followers} followers</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Festival Events */}
      {upcomingFestivals.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Upcoming Festival Events</h2>
          <div className="space-y-3">
            {upcomingFestivals.map((fest) => {
              const comedianNames = fest.comedians.map((ec) => ec.comedian.name).join(", ");
              const displayTitle = fest.title ?? comedianNames;
              return (
                <Link
                  key={fest.id}
                  href={`/events/${fest.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="w-12 text-center shrink-0">
                    <p className="text-brand-gold text-xs font-bold uppercase">
                      {new Date(fest.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-white text-lg font-bold">{new Date(fest.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{displayTitle}</p>
                    <p className="text-zinc-500 text-sm">
                      {fest.venue.name} &middot; {fest.venue.city}, {fest.venue.state}
                    </p>
                    {fest.comedians.length > 0 && (
                      <p className="text-zinc-600 text-xs mt-1 truncate">
                        Lineup: {comedianNames}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {fest._count.attendees > 0 && (
                      <p className="text-brand-gold text-xs font-medium">{fest._count.attendees} going</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="text-zinc-500">No upcoming festivals found. Check back soon!</p>
      )}
    </div>
  );
}
