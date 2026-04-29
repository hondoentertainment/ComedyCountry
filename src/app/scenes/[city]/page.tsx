import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VENUE_TYPE_LABELS } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { computeSceneIntelligence } from "@/lib/scene-intelligence";
import { buildEventTrustSummary } from "@/lib/trust";
import { scoreRoomFit } from "@/lib/room-fit";
import { TrustBadges } from "@/components/TrustBadges";
import { matchTargetCity } from "@/lib/target-cities";

type PageProps = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { city } = await params;
  const cityName = decodeURIComponent(city)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    title: `${cityName} Comedy Scene | Punchline Atlas`,
    description: `Discover comedy clubs, shows, and comedians in ${cityName}. Your local comedy scene guide.`,
  };
}

export default async function CityScenePage({ params }: PageProps) {
  const { city } = await params;
  const citySlug = decodeURIComponent(city).toLowerCase().replace(/-/g, " ");

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
  const venueIds = venues.map((venue) => venue.id);
  const insights = await computeSceneIntelligence(cityName, stateName).catch(() => null);

  const upcomingShows = await prisma.event.findMany({
    where: {
      venueId: { in: venueIds },
      date: { gte: new Date() },
    },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          type: true,
          capacity: true,
          updatedAt: true,
          website: true,
        },
      },
      comedians: {
        include: {
          comedian: {
            select: { name: true, slug: true, headshotUrl: true, genres: true },
          },
        },
      },
      accessibilityTags: true,
      fairPricePolicy: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { date: "asc" },
    take: 20,
  });

  const scoredShows = upcomingShows
    .map((show) => {
      const trust = buildEventTrustSummary(show);
      const roomFit = scoreRoomFit({
        showType: show.showType,
        venue: show.venue,
        comedians: show.comedians,
        trust,
        scene: insights,
        priceMin: Number(show.priceMin ?? 0) || null,
        priceMax: Number(show.priceMax ?? 0) || null,
      });

      return { show, trust, roomFit };
    })
    .sort((a, b) => b.roomFit.score - a.roomFit.score);

  const isTargetMarket = !!matchTargetCity(cityName, stateName);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/venues" className="mb-4 inline-block text-sm text-zinc-400 hover:text-brand-gold">
          &larr; All venues
        </Link>

        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold text-brand-gold">{cityName} Comedy Scene</h1>
          <p className="text-zinc-400">
            {venues.length} venue{venues.length !== 1 ? "s" : ""} · {upcomingShows.length} upcoming show
            {upcomingShows.length !== 1 ? "s" : ""} · {stateName}
          </p>
          {isTargetMarket && (
            <span className="mt-3 inline-flex rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold">
              Priority target city
            </span>
          )}
        </div>

        {insights && (
          <section className="mb-10 rounded-xl border border-zinc-800 bg-brand-surface p-5">
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Metric label="Scene score" value={insights.sceneScore} accent />
              <Metric label="Momentum" value={insights.momentumScore} />
              <Metric label="Loyalty" value={insights.loyaltyScore} />
              <Metric label="Variety" value={insights.varietyScore} />
              <Metric
                label="Avg. ticket"
                value={insights.avgTicketPrice > 0 ? `$${insights.avgTicketPrice}` : "—"}
              />
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {insights.topAttributeLabels.map((attribute) => (
                <span key={attribute} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  {attribute}
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-400">{insights.monetizationHint}</p>
          </section>
        )}

        {scoredShows.length > 0 && (
          <section className="mb-10 rounded-xl border border-zinc-800 bg-brand-surface p-5">
            <h2 className="text-xl font-bold text-white">Best room for this comic tonight</h2>
            <p className="mt-1 text-sm text-zinc-400">
              The shows in {cityName} with the best mix of room fit, trust signals, and scene momentum.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {scoredShows.slice(0, 3).map(({ show, trust, roomFit }) => {
                const title = show.title ?? show.comedians.map((entry) => entry.comedian.name).join(", ");
                return (
                  <Link
                    key={show.id}
                    href={`/events/${show.id}`}
                    className="rounded-xl border border-zinc-800 bg-brand-charcoal/50 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{show.venue.name}</p>
                      </div>
                      <span className="rounded-full bg-brand-gold/10 px-2.5 py-1 text-xs text-brand-gold">
                        {roomFit.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-400">{roomFit.explanation}</p>
                    <div className="mt-3">
                      <TrustBadges badges={trust.badges} freshness={trust.freshness} limit={3} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-14">
          <h2 className="mb-6 text-xl font-bold text-white">Venues</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="card-interactive group block overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-charcoal">
                  {venue.photos[0] ? (
                    <Image
                      src={venue.photos[0].url}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-600">
                      🏛
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 flex gap-2">
                    <span className="rounded bg-black/50 px-2 py-0.5 text-xs text-zinc-300">
                      {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                    </span>
                    <span className="rounded bg-black/50 px-2 py-0.5 text-xs text-zinc-300">
                      {venue._count.events} shows
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{venue.name}</h3>
                  <p className="text-sm text-zinc-500">{venue._count.followers} followers</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {scoredShows.length > 0 && (
          <section>
            <h2 className="mb-6 text-xl font-bold text-white">Upcoming shows in {cityName}</h2>
            <div className="space-y-3">
              {scoredShows.map(({ show, trust, roomFit }) => {
                const comedianNames = show.comedians.map((entry) => entry.comedian.name).join(", ");
                const displayTitle = show.title ?? comedianNames;

                return (
                  <Link
                    key={show.id}
                    href={`/events/${show.id}`}
                    className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-brand-surface p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-charcoal">
                      {show.comedians[0]?.comedian?.headshotUrl ? (
                        <Image
                          src={show.comedians[0].comedian.headshotUrl}
                          alt={displayTitle}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-600">🎤</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{displayTitle}</p>
                      <p className="truncate text-sm text-zinc-500">{show.venue.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{roomFit.label}</p>
                      <div className="mt-2">
                        <TrustBadges badges={trust.badges} freshness={trust.freshness} limit={2} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm text-zinc-400">
                        {new Date(show.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {show._count.attendees > 0 && (
                        <p className="text-xs font-medium text-brand-gold">{show._count.attendees} going</p>
                      )}
                      {formatEventPrice(show.priceMin, show.priceMax) && (
                        <p className="text-xs text-zinc-500">{formatEventPrice(show.priceMin, show.priceMax)}</p>
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
    <div className="rounded-lg border border-zinc-800 bg-brand-charcoal/40 p-3">
      <p className={`text-xl font-bold ${accent ? "text-brand-gold" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
