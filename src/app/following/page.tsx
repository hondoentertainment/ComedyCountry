import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      include: { comedian: true },
    }),
    prisma.venueFollow.findMany({
      where: { userId: session.user.id },
      include: { venue: true },
    }),
  ]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Following</h1>
        <p className="text-zinc-400 mb-8">
          Comedians and venues you follow. Visit their pages to unfollow.
        </p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Comedians ({comedianFollows.length})
          </h2>
          {comedianFollows.length > 0 ? (
            <ul className="space-y-2">
              {comedianFollows.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/comedians/${f.comedian.slug}`}
                    className="text-brand-gold hover:underline"
                  >
                    {f.comedian.name}
                  </Link>
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
            <ul className="space-y-2">
              {venueFollows.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/venues/${f.venue.id}`}
                    className="text-brand-gold hover:underline"
                  >
                    {f.venue.name}
                  </Link>
                  <span className="text-zinc-500 text-sm ml-2">
                    — {f.venue.city}, {f.venue.state}
                  </span>
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
    </main>
  );
}
