import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserComedianBadges } from "@/lib/badges";
import { ComedianBadges } from "@/components/ComedianBadges";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { profileName: true, name: true },
  });
  const displayName = user?.profileName ?? user?.name ?? username;
  return {
    title: `${displayName} | Punchline Atlas`,
    description: `${displayName}'s comedy profile — badges, favorite comedians, and more.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      profileName: true,
      image: true,
      createdAt: true,
      followsComedians: {
        include: {
          comedian: { select: { id: true, name: true, slug: true, headshotUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      followsVenues: {
        include: {
          venue: { select: { id: true, name: true, city: true, state: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      _count: {
        select: {
          eventReviews: true,
          followsComedians: true,
          followsVenues: true,
          comedianTierRatings: true,
          eventAttendances: true,
        },
      },
    },
  });

  if (!user) notFound();

  const displayName = user.profileName ?? user.name ?? username;
  const badges = await getUserComedianBadges(user.id);
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Profile Header */}
        <header className="flex items-center gap-6 mb-8 p-6 rounded-card bg-brand-surface border border-zinc-800">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-3xl text-zinc-500">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <p className="text-zinc-500 text-sm">@{username} · Joined {joinDate}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-zinc-400">
                <span className="text-white font-medium">{user._count.eventReviews}</span> reviews
              </span>
              <span className="text-zinc-400">
                <span className="text-white font-medium">{user._count.followsComedians}</span> following
              </span>
              <span className="text-zinc-400">
                <span className="text-white font-medium">{badges.length}</span> badges
              </span>
            </div>
          </div>
        </header>

        {/* Badges */}
        {badges.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Badges</h2>
            <ComedianBadges badges={badges} />
          </section>
        )}

        {/* Favorite Comedians */}
        {user.followsComedians.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Favorite comedians</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {user.followsComedians.map((f) => (
                <Link
                  key={f.comedian.id}
                  href={`/comedians/${f.comedian.slug}`}
                  className="group text-center"
                >
                  <div className="w-full aspect-square rounded-full bg-brand-charcoal overflow-hidden relative mx-auto mb-2">
                    {f.comedian.headshotUrl ? (
                      <Image
                        src={f.comedian.headshotUrl}
                        alt={f.comedian.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-600">
                        {f.comedian.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-zinc-300 text-xs font-medium truncate group-hover:text-brand-gold transition-colors">
                    {f.comedian.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Saved Venues */}
        {user.followsVenues.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Saved venues</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.followsVenues.map((f) => (
                <Link
                  key={f.venue.id}
                  href={`/venues/${f.venue.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-500 shrink-0">
                    {f.venue.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{f.venue.name}</p>
                    <p className="text-zinc-500 text-xs">{f.venue.city}, {f.venue.state}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
