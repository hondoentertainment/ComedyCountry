import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";

export const metadata = {
  title: "Accessible Shows | Punchline Atlas",
  description:
    "Discover comedy shows with accessibility features including ASL interpretation, captioning, wheelchair access, and more.",
};

export const dynamic = "force-dynamic";

export default async function AccessibleShowsPage() {
  let events: Array<{
    id: string;
    date: Date;
    title: string | null;
    showtime: string | null;
    venue: { name: string; city: string; state: string };
    comedians: Array<{
      comedian: { name: string; slug: string };
    }>;
    accessibilityTags: Array<{
      id: string;
      type: string;
      description: string | null;
      verifiedBy: string | null;
    }>;
  }> = [];

  let venuesWithAccess: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    accessibilityTags: Array<{
      id: string;
      type: string;
      description: string | null;
      verifiedBy: string | null;
    }>;
  }> = [];

  let stats = { totalTags: 0, eventsWithAccessibility: 0, venuesWithAccessibility: 0 };

  try {
    const now = new Date();

    const [accessibleEvents, accessibleVenues, tagCount] = await Promise.all([
      prisma.event.findMany({
        where: {
          date: { gte: now },
          accessibilityTags: { some: {} },
        },
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
          accessibilityTags: true,
        },
        orderBy: { date: "asc" },
        take: 20,
      }),
      prisma.venue.findMany({
        where: {
          accessibilityTags: { some: {} },
        },
        include: {
          accessibilityTags: true,
        },
        orderBy: { name: "asc" },
        take: 12,
      }),
      prisma.accessibilityTag.count(),
    ]);

    events = accessibleEvents;
    venuesWithAccess = accessibleVenues;
    stats = {
      totalTags: tagCount,
      eventsWithAccessibility: accessibleEvents.length,
      venuesWithAccessibility: accessibleVenues.length,
    };
  } catch {
    // Render with empty data on error
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">
          Accessible Comedy Shows
        </h1>
        <p className="text-gray-400">
          Find comedy shows and venues with accessibility features including ASL
          interpretation, captioning, wheelchair access, hearing loops, and more.
        </p>
      </header>

      {/* Stats Summary */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-brand-gold">
            {stats.eventsWithAccessibility}
          </p>
          <p className="text-sm text-gray-400">Accessible Shows</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-brand-gold">
            {stats.venuesWithAccessibility}
          </p>
          <p className="text-sm text-gray-400">Accessible Venues</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-brand-gold">
            {stats.totalTags}
          </p>
          <p className="text-sm text-gray-400">Accessibility Features Tagged</p>
        </div>
      </section>

      {/* Upcoming Accessible Events */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Upcoming Accessible Shows
        </h2>

        {events.length === 0 ? (
          <p className="text-gray-400">
            No upcoming accessible shows found. Check back soon!
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      <Link
                        href={`/events/${event.id}`}
                        className="hover:text-brand-gold"
                      >
                        {event.title ||
                          event.comedians
                            .map((c) => c.comedian.name)
                            .join(", ") ||
                          "Comedy Show"}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-400">
                      {event.venue.name} &middot; {event.venue.city},{" "}
                      {event.venue.state}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {event.showtime && ` at ${event.showtime}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {event.accessibilityTags.map((tag) => (
                      <AccessibilityBadge
                        key={tag.id}
                        type={tag.type}
                        description={tag.description}
                        verified={!!tag.verifiedBy}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Accessible Venues */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">
          Accessible Venues
        </h2>

        {venuesWithAccess.length === 0 ? (
          <p className="text-gray-400">
            No accessible venues found yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venuesWithAccess.map((venue) => (
              <article
                key={venue.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <h3 className="font-semibold text-white">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="hover:text-brand-gold"
                  >
                    {venue.name}
                  </Link>
                </h3>
                <p className="mb-2 text-sm text-gray-400">
                  {venue.city}, {venue.state}
                </p>
                <div className="flex flex-wrap gap-1">
                  {venue.accessibilityTags.map((tag) => (
                    <AccessibilityBadge
                      key={tag.id}
                      type={tag.type}
                      description={tag.description}
                      verified={!!tag.verifiedBy}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
