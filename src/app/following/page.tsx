import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FollowButton } from "@/components/FollowButton";

export const metadata = {
  title: "Following | Punchline Atlas",
  description: "Comedians and venues you follow.",
};

export default async function FollowingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const [comedianFollows, venueFollows] = await Promise.all([
    prisma.comedianFollow.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.venueFollow.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            photos: {
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Following</h1>
        <p className="text-zinc-400 mb-8">
          Comedians and venues you follow. Unfollow anytime from this page.
        </p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Comedians ({comedianFollows.length})
          </h2>
          {comedianFollows.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {comedianFollows.map((f) => (
                <li key={f.id}>
                  <div className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <Link
                      href={`/comedians/${f.comedian.slug}`}
                      className="flex gap-4 min-w-0 flex-1"
                    >
                      {f.comedian.headshotUrl ? (
                        <Image
                          src={f.comedian.headshotUrl}
                          alt={`Headshot of ${f.comedian.name}`}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                          {f.comedian.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-white truncate self-center">
                        {f.comedian.name}
                      </span>
                    </Link>
                    <FollowButton
                      type="comedian"
                      id={f.comedian.id}
                      initialFollowing={true}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500">
              No comedians yet. Browse{" "}
              <Link href="/comedians" className="text-brand-gold hover:underline">
                comedians
              </Link>{" "}
              and click Follow.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Venues ({venueFollows.length})
          </h2>
          {venueFollows.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {venueFollows.map((f) => (
                <li key={f.id}>
                  <div className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <Link
                      href={`/venues/${f.venue.id}`}
                      className="flex gap-4 min-w-0 flex-1"
                    >
                      {f.venue.photos[0] ? (
                        <Image
                          src={f.venue.photos[0].url}
                          alt={`Photo of ${f.venue.name}`}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                          {f.venue.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 self-center">
                        <span className="font-medium text-white block truncate">
                          {f.venue.name}
                        </span>
                        <span className="text-sm text-zinc-500">
                          {f.venue.city}, {f.venue.state}
                        </span>
                      </div>
                    </Link>
                    <FollowButton
                      type="venue"
                      id={f.venue.id}
                      initialFollowing={true}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500">
              No venues yet. Browse{" "}
              <Link href="/venues" className="text-brand-gold hover:underline">
                venues
              </Link>{" "}
              and click Follow.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
