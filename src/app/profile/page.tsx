import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserComedianBadges } from "@/lib/badges";
import { ProfileForm } from "./ProfileForm";
import { ComedianBadges } from "@/components/ComedianBadges";

export const metadata = {
  title: "Profile | Punchline Atlas",
  description: "Your profile, favorite comedians, and saved venues.",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  const [user, badges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        followsComedians: {
          include: {
            comedian: {
              select: {
                id: true,
                name: true,
                slug: true,
                headshotUrl: true,
              },
            },
          },
        },
        followsVenues: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                type: true,
              },
            },
          },
        },
      },
    }),
    getUserComedianBadges(session.user.id),
  ]);

  if (!user) redirect("/auth/signin?callbackUrl=/profile");

  const displayName = user.profileName ?? user.name ?? "Anonymous";
  const favoriteComedians = user.followsComedians.map((f) => f.comedian);
  const favoriteVenues = user.followsVenues.map((f) => f.venue);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Discover
        </Link>

        <header className="flex gap-6 mb-8">
          {user.image ? (
            <Image
              src={user.image}
              alt={`Profile photo of ${displayName}`}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-3xl text-zinc-500">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <ProfileForm
              userId={user.id}
              initialName={user.profileName ?? user.name ?? ""}
            />
          </div>
        </header>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Badges — Comedians I&apos;ve Seen
            </h2>
            <p className="text-zinc-400 text-sm mb-4">
              Earn badges by reviewing shows you attend. &quot;First time&quot; = seen once;
              &quot;Multiple rounds&quot; = seen in 2+ different shows.
            </p>
            {badges.length === 0 ? (
              <p className="text-zinc-400">
                No badges yet.{" "}
                <Link href="/schedule" className="text-brand-gold hover:underline">
                  Find a show
                </Link>
                , attend it, then rate it on the event page to earn badges.
              </p>
            ) : (
              <ComedianBadges badges={badges} />
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Favorite Comedians
            </h2>
            {favoriteComedians.length === 0 ? (
              <p className="text-zinc-400">
                You haven&apos;t followed any comedians yet.{" "}
                <Link href="/comedians" className="text-brand-gold hover:underline">
                  Browse comedians
                </Link>{" "}
                and follow your favorites.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {favoriteComedians.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/comedians/${c.slug}`}
                      className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {c.headshotUrl ? (
                        <Image
                          src={c.headshotUrl}
                          alt={`Headshot of ${c.name}`}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-white truncate">
                        {c.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Saved Venues
            </h2>
            {favoriteVenues.length === 0 ? (
              <p className="text-zinc-400">
                You haven&apos;t followed any venues yet.{" "}
                <Link href="/venues" className="text-brand-gold hover:underline">
                  Browse venues
                </Link>{" "}
                and follow your favorites.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {favoriteVenues.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/venues/${v.id}`}
                      className="flex items-center gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                        {v.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-white block truncate">
                          {v.name}
                        </span>
                        <span className="text-sm text-zinc-500">
                          {v.city}, {v.state}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
