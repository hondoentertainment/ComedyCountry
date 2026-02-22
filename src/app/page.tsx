import Link from "next/link";
import { listVenues } from "@/lib/venues";
import { listEvents } from "@/lib/events";
import { formatEventPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let venues: Awaited<ReturnType<typeof listVenues>>["venues"] = [];
  let events: Awaited<ReturnType<typeof listEvents>>["events"] = [];

  try {
    const [v, e] = await Promise.all([
      listVenues({ take: 5 }),
      listEvents({ take: 5 }),
    ]);
    venues = v.venues;
    events = e.events;
  } catch {
    // DB not configured or Prisma engine unavailable at build time
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand-gold mb-3">
            Punchline Atlas
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            The nationwide comedy intelligence platform — discover venues, track
            comedian tours, and never miss a show.
          </p>
          <nav className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/venues"
              className="px-5 py-2.5 rounded-lg bg-brand-charcoal hover:bg-brand-gold/20 text-brand-gold transition-colors font-medium"
            >
              Venues
            </Link>
            <Link
              href="/comedians"
              className="px-5 py-2.5 rounded-lg bg-brand-charcoal hover:bg-brand-gold/20 text-brand-gold transition-colors font-medium"
            >
              Comedians
            </Link>
            <Link
              href="/schedule"
              className="px-5 py-2.5 rounded-lg bg-brand-charcoal hover:bg-brand-gold/20 text-brand-gold transition-colors font-medium"
            >
              Schedule
            </Link>
            <Link
              href="/map"
              className="px-5 py-2.5 rounded-lg bg-brand-charcoal hover:bg-brand-gold/20 text-brand-gold transition-colors font-medium"
            >
              Map
            </Link>
          </nav>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Recent Venues
            </h2>
            <ul className="space-y-3">
              {venues.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/venues/${v.id}`}
                    className="text-brand-gold hover:underline"
                  >
                    {v.name}
                  </Link>
                  <span className="text-zinc-500 text-sm ml-2">
                    {v.city}, {v.state}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/venues"
              className="inline-block mt-4 text-sm text-zinc-400 hover:text-brand-gold"
            >
              View all venues →
            </Link>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Upcoming Shows
            </h2>
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="text-brand-gold hover:underline"
                  >
                    {e.comedians.map((ec) => ec.comedian.name).join(", ")}
                  </Link>
                  <span className="text-zinc-500 text-sm ml-2">
                    at {e.venue.name} •
                    {new Date(e.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {formatEventPrice(e.priceMin, e.priceMax) && (
                      <> • {formatEventPrice(e.priceMin, e.priceMax)}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/schedule"
              className="inline-block mt-4 text-sm text-zinc-400 hover:text-brand-gold"
            >
              View full schedule →
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
