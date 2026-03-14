import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Open Mic Finder | Punchline Atlas",
  description: "Find open mic nights near you. Browse comedy open mics at venues across the country — perfect for new comedians and comedy fans.",
};

export const dynamic = "force-dynamic";

export default async function OpenMicsPage() {
  let openMicVenues: Array<{
    id: string; name: string; city: string; state: string; address: string | null;
    _count: { events: number };
  }> = [];
  let upcomingOpenMics: Array<{
    id: string; date: Date; showtime: string | null; title: string | null;
    venue: { id: string; name: string; city: string; state: string };
    _count: { attendees: number };
  }> = [];

  try {
    const [venues, mics] = await Promise.all([
      prisma.venue.findMany({
        where: { type: "OPEN_MIC" },
        select: { id: true, name: true, city: true, state: true, address: true, _count: { select: { events: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.event.findMany({
        where: { showType: "OPEN_MIC", date: { gte: new Date() } },
        include: {
          venue: { select: { id: true, name: true, city: true, state: true } },
          _count: { select: { attendees: true } },
        },
        orderBy: { date: "asc" },
        take: 30,
      }),
    ]);
    openMicVenues = venues;
    upcomingOpenMics = mics;
  } catch {
    // DB not configured
  }

  // Group by state
  const byState = new Map<string, typeof openMicVenues>();
  openMicVenues.forEach((v) => {
    const list = byState.get(v.state) || [];
    list.push(v);
    byState.set(v.state, list);
  });
  const states = Array.from(byState.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Open Mic Finder</h1>
      <p className="text-zinc-400 mb-10">
        Find open mic nights near you. Whether you&apos;re a new comedian looking for stage time or a fan looking for raw comedy.
      </p>

      {/* Upcoming Open Mics */}
      {upcomingOpenMics.length > 0 && (
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Upcoming Open Mics</h2>
          <div className="space-y-2">
            {upcomingOpenMics.map((mic) => (
              <Link
                key={mic.id}
                href={`/events/${mic.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="w-12 text-center shrink-0">
                  <p className="text-brand-gold text-xs font-bold uppercase">
                    {new Date(mic.date).toLocaleDateString("en-US", { month: "short" })}
                  </p>
                  <p className="text-white text-lg font-bold">
                    {new Date(mic.date).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{mic.title || "Open Mic Night"}</p>
                  <p className="text-zinc-500 text-sm">{mic.venue.name} &middot; {mic.venue.city}, {mic.venue.state}</p>
                </div>
                <div className="text-right shrink-0">
                  {mic.showtime && <p className="text-zinc-400 text-sm">{mic.showtime}</p>}
                  {mic._count.attendees > 0 && (
                    <p className="text-brand-gold text-xs">{mic._count.attendees} going</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Venues by State */}
      {states.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Open Mic Venues by State</h2>
          <div className="space-y-8">
            {states.map(([state, venues]) => (
              <div key={state}>
                <h3 className="text-lg font-semibold text-zinc-300 mb-3">{state}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {venues.map((v) => (
                    <Link
                      key={v.id}
                      href={`/venues/${v.id}`}
                      className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <p className="text-white font-medium">{v.name}</p>
                      <p className="text-zinc-500 text-sm">{v.city}, {v.state}</p>
                      {v.address && <p className="text-zinc-600 text-xs mt-1">{v.address}</p>}
                      <p className="text-zinc-500 text-xs mt-2">{v._count.events} shows listed</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-zinc-500">No open mic venues found yet. Check back soon!</p>
      )}
    </div>
  );
}
