import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VENUE_TYPE_LABELS } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { computeSceneIntelligence } from "@/lib/scene-intelligence";

type PageProps = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { city } = await params;
  const cityName = decodeURIComponent(city).replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    title: `${cityName} Comedy Scene | Punchline Atlas`,
    description: `Discover comedy clubs, shows, and comedians in ${cityName}. Your local comedy scene guide.`,
  };
}

export default async function CityScenePage({ params }: PageProps) {
  const { city } = await params;
  const citySlug = decodeURIComponent(city).toLowerCase().replace(/-/g, " ");

  // Find venues in this city (case-insensitive)
  const venues = await prisma.venue.findMany({
    where: { city: { contains: citySlug, mode: "insensitive" } },
    include: {
      photos: { take: 1 },
      _count: { select: { followers: true, events: true } },
    },
    orderBy: { name: "asc" },
  });

  if (venues.length === 0) notFound();

  const cityName = venues[0].city;
  const stateName = venues[0].state;
  const venueIds = venues.map((v) => v.id);
  const insights = await computeSceneIntelligence(cityName, stateName).catch(() => null);

  // Get upcoming shows at these venues
  const upcomingShows = await prisma.event.findMany({
    where: {
      venueId: { in: venueIds },
      date: { gte: new Date() },
    },
    include: {
      venue: { select: { name: true } },
      comedians: { include: { comedian: { select: { name: true, slug: true, headshotUrl: true } } } },
      _count: { select: { attendees: true } },
    },
    orderBy: { date: "asc" },
    take: 20,
  });

  // Get unique comedians performing in this city
  const comedianIds = new Set<string>();
  upcomingShows.forEach((s) => s.comedians.forEach((ec) => comedianIds.add(ec.comedian.slug)));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/venues" className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block">
          ← All venues
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-brand-gold mb-2">{cityName} Comedy Scene</h1>
          <p className="text-zinc-400">
            {venues.length} venue{venues.length !== 1 ? "s" : ""} · {upcomingShows.length} upcoming show{upcomingShows.length !== 1 ? "s" : ""} · {stateName}
          </p>
        </div>

        {insights && (
          <section className="mb-10 p-5 rounded-xl bg-brand-surface border border-zinc-800">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <Metric label="Scene score" value={insights.sceneScore} accent />
              <Metric label="Momentum" value={insights.momentumScore} />
              <Metric label="Loyalty" value={insights.loyaltyScore} />
              <Metric label="Variety" value={insights.varietyScore} />
              <Metric
                label="Avg. ticket"
                value={insights.avgTicketPrice > 0 ? `$${insights.avgTicketPrice}` : "—"}
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {insights.topAttributeLabels.map((attribute) => (
                <span
                  key={attribute}
                  className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs"
                >
                  {attribute}
                </span>
              ))}
            </div>
            <p className="text-zinc-400 text-sm">{insights.monetizationHint}</p>
          </section>
        )}

        {/* Venues Grid */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Venues</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((v) => (
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
                      🏛️
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 flex gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-zinc-300">
                      {VENUE_TYPE_LABELS[v.type] ?? v.type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-zinc-300">
                      {v._count.events} shows
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{v.name}</h3>
                  <p className="text-zinc-500 text-sm">
                    {v._count.followers} followers
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming Shows */}
        {upcomingShows.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-6">Upcoming shows in {cityName}</h2>
            <div className="space-y-3">
              {upcomingShows.map((show) => {
                const comedianNames = show.comedians.map((ec) => ec.comedian.name).join(", ");
                const displayTitle = show.title ?? comedianNames;
                return (
                  <Link
                    key={show.id}
                    href={`/events/${show.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
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
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{displayTitle}</p>
                      <p className="text-zinc-500 text-sm truncate">{show.venue.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-zinc-400 text-sm">
                        {new Date(show.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      {show._count.attendees > 0 && (
                        <p className="text-brand-gold text-xs font-medium">{show._count.attendees} going</p>
                      )}
                      {formatEventPrice(
                        (show as unknown as { priceMin: { toString(): string } | null }).priceMin,
                        (show as unknown as { priceMax: { toString(): string } | null }).priceMax
                      ) && (
                        <p className="text-zinc-500 text-xs">
                          {formatEventPrice(
                            (show as unknown as { priceMin: { toString(): string } | null }).priceMin,
                            (show as unknown as { priceMax: { toString(): string } | null }).priceMax
                          )}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-brand-charcoal/40 border border-zinc-800 p-3">
      <p className={`text-xl font-bold ${accent ? "text-brand-gold" : "text-white"}`}>{value}</p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  );
}
