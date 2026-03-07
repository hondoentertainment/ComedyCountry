import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { getComedian } from "@/lib/comedians";
import { authOptions } from "@/lib/auth";
import { getUserBadgeForComedian } from "@/lib/badges";
import { TOURING_STATUS_LABELS, SHOW_TYPE_LABELS } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { FollowButton } from "@/components/FollowButton";
import { ComedianPageTabs } from "@/components/ComedianPageTabs";
import { ComedianStructuredData } from "@/components/StructuredData";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const comedian = await getComedian(slug);
  if (!comedian) return { title: "Comedian | Punchline Atlas" };
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const description = comedian.bio
    ? `${comedian.bio.slice(0, 155)}${comedian.bio.length > 155 ? "…" : ""}`
    : `Comedian profile and upcoming shows for ${comedian.name}.`;
  const images = comedian.headshotUrl
    ? [{ url: comedian.headshotUrl, width: 400, height: 400, alt: `${comedian.name} headshot` }]
    : undefined;
  return {
    title: `${comedian.name} | Punchline Atlas`,
    description,
    openGraph: {
      title: `${comedian.name} | Punchline Atlas`,
      description,
      url: `${siteUrl}/comedians/${slug}`,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: `${comedian.name} | Punchline Atlas`,
      description,
      images: comedian.headshotUrl ? [comedian.headshotUrl] : undefined,
    },
  };
}

export default async function ComedianPage({ params }: PageProps) {
  const { slug } = await params;
  const [comedian, session] = await Promise.all([
    getComedian(slug),
    getServerSession(authOptions),
  ]);

  if (!comedian) notFound();

  let isFollowing = false;
  let userBadge: Awaited<ReturnType<typeof getUserBadgeForComedian>> = null;
  let userTierRating: string | null = null;
  if (session?.user?.id) {
    const [follow, badge, tierRating] = await Promise.all([
      prisma.comedianFollow.findUnique({
        where: {
          userId_comedianId: {
            userId: session.user.id,
            comedianId: comedian.id,
          },
        },
      }),
      getUserBadgeForComedian(session.user.id, comedian.id),
      prisma.comedianTierRating.findUnique({
        where: {
          userId_comedianId: {
            userId: session.user.id,
            comedianId: comedian.id,
          },
        },
      }),
    ]);
    isFollowing = !!follow;
    userBadge = badge;
    userTierRating = tierRating?.tier ?? null;
  }

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

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

  return (
    <main className="min-h-screen">
      <ComedianStructuredData
        comedian={{
          id: comedian.id,
          name: comedian.name,
          slug: comedian.slug,
          bio: comedian.bio,
          headshotUrl: comedian.headshotUrl,
          website: comedian.website,
          socialLinks: comedian.socialLinks.map((l) => ({
            platform: l.platform,
            url: l.url,
          })),
        }}
        baseUrl={siteUrl}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/comedians"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Comedians
        </Link>

        <header className="flex gap-6 mb-8">
          {comedian.headshotUrl ? (
            <Image
              src={comedian.headshotUrl}
              alt={`Headshot of ${comedian.name}`}
              width={128}
              height={128}
              priority
              className="w-32 h-32 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-4xl text-zinc-500">
              {comedian.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                {comedian.name}
              </h1>
              <FollowButton
                type="comedian"
                id={comedian.id}
                initialFollowing={isFollowing}
              />
            </div>
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
              {userBadge && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-brand-gold/20 text-brand-gold border-brand-gold/40"
                    title="Seen once"
                  >
                    ★ First time
                  </span>
                  {userBadge.multiRound && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-600/20 text-amber-400 border-amber-500/40"
                      title="Seen in multiple shows"
                    >
                      ★★ Multiple rounds ({userBadge.roundCount})
                    </span>
                  )}
                </div>
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

        <ComedianPageTabs
          comedianId={comedian.id}
          comedianName={comedian.name}
          comedianSlug={comedian.slug}
          userTierRating={userTierRating}
          isSignedIn={!!session?.user}
          infoContent={
            <>
        {comedian.podcastLinks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Podcasts</h2>
            <ul className="space-y-2">
              {comedian.podcastLinks.map((link) => (
                <li key={link.id} className="flex items-center gap-2">
                  <span className="text-white">{link.podcastName}</span>
                  {link.episodeUrl ? (
                    <a
                      href={link.episodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:underline text-sm"
                    >
                      Listen →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

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
                        href={`/events/${event.id}`}
                        className="font-medium text-white hover:text-brand-gold"
                      >
                        {event.title ?? `${comedian.name} at ${event.venue.name}`}
                      </Link>
                      <p className="text-zinc-400 text-sm">
                        {event.venue.city}, {event.venue.state} •{" "}
                        {formatDate(event.date)}
                        {event.showtime && ` • ${event.showtime}`}
                        {formatEventPrice(event.priceMin, event.priceMax) && (
                          <> • {formatEventPrice(event.priceMin, event.priceMax)}</>
                        )}
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
            <div className="py-12 px-6 rounded-lg bg-brand-charcoal/30 border border-zinc-800 border-dashed text-center">
              <p className="text-zinc-400 font-medium mb-1">No upcoming shows</p>
              <p className="text-zinc-500 text-sm">
                Check back later or <Link href="/schedule" className="text-brand-gold hover:underline">browse the schedule</Link> for other comedians.
              </p>
            </div>
          )}
        </section>
            </>
          }
        />
      </div>
    </main>
  );
}
