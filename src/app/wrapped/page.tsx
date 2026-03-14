import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Comedy Wrapped | Punchline Atlas",
  description: "Your year in comedy — see your top comedians, venues, genres, and shows from the past year.",
};

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  let stats = {
    showsAttended: 0,
    reviewsWritten: 0,
    comedianFollows: 0,
    venueFollows: 0,
    topComedians: [] as Array<{ name: string; slug: string; count: number }>,
    topVenues: [] as Array<{ name: string; id: string; count: number }>,
    topGenres: [] as Array<{ genre: string; count: number }>,
    tierRatings: 0,
    listsCreated: 0,
  };

  try {
    const [
      attendances,
      reviews,
      comedianFollowCount,
      venueFollowCount,
      tierCount,
      listCount,
    ] = await Promise.all([
      prisma.eventAttendance.findMany({
        where: { userId, createdAt: { gte: yearAgo } },
        include: {
          event: {
            include: {
              venue: { select: { id: true, name: true } },
              comedians: { include: { comedian: { select: { name: true, slug: true, genres: true } } } },
            },
          },
        },
      }),
      prisma.eventReview.count({ where: { userId, createdAt: { gte: yearAgo } } }),
      prisma.comedianFollow.count({ where: { userId, createdAt: { gte: yearAgo } } }),
      prisma.venueFollow.count({ where: { userId, createdAt: { gte: yearAgo } } }),
      prisma.comedianTierRating.count({ where: { userId, createdAt: { gte: yearAgo } } }),
      prisma.comedyList.count({ where: { userId, createdAt: { gte: yearAgo } } }),
    ]);

    stats.showsAttended = attendances.length;
    stats.reviewsWritten = reviews;
    stats.comedianFollows = comedianFollowCount;
    stats.venueFollows = venueFollowCount;
    stats.tierRatings = tierCount;
    stats.listsCreated = listCount;

    // Top comedians
    const comedianCounts = new Map<string, { name: string; slug: string; count: number }>();
    const venueCounts = new Map<string, { name: string; id: string; count: number }>();
    const genreCounts = new Map<string, number>();

    attendances.forEach((a) => {
      const venue = a.event.venue;
      const vc = venueCounts.get(venue.id) || { name: venue.name, id: venue.id, count: 0 };
      vc.count++;
      venueCounts.set(venue.id, vc);

      a.event.comedians.forEach((ec) => {
        const c = ec.comedian;
        const cc = comedianCounts.get(c.slug) || { name: c.name, slug: c.slug, count: 0 };
        cc.count++;
        comedianCounts.set(c.slug, cc);

        c.genres.forEach((g: { genre: string }) => {
          genreCounts.set(g.genre, (genreCounts.get(g.genre) || 0) + 1);
        });
      });
    });

    stats.topComedians = Array.from(comedianCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    stats.topVenues = Array.from(venueCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    stats.topGenres = Array.from(genreCounts.entries()).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  } catch {
    // DB not configured
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Your Comedy Wrapped</h1>
      <p className="text-zinc-400 mb-10">Your year in comedy, by the numbers.</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        <StatCard label="Shows Attended" value={stats.showsAttended} />
        <StatCard label="Reviews Written" value={stats.reviewsWritten} />
        <StatCard label="New Comedian Follows" value={stats.comedianFollows} />
        <StatCard label="New Venue Follows" value={stats.venueFollows} />
        <StatCard label="Tier Ratings Given" value={stats.tierRatings} />
        <StatCard label="Lists Created" value={stats.listsCreated} />
      </div>

      {/* Top Comedians */}
      {stats.topComedians.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Your Top Comedians</h2>
          <div className="space-y-2">
            {stats.topComedians.map((c, i) => (
              <Link
                key={c.slug}
                href={`/comedians/${c.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span className="text-brand-gold font-bold text-lg w-6 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{c.name}</p>
                </div>
                <span className="text-zinc-400 text-sm">{c.count} shows</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Venues */}
      {stats.topVenues.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Your Top Venues</h2>
          <div className="space-y-2">
            {stats.topVenues.map((v, i) => (
              <Link
                key={v.id}
                href={`/venues/${v.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span className="text-brand-gold font-bold text-lg w-6 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{v.name}</p>
                </div>
                <span className="text-zinc-400 text-sm">{v.count} visits</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Genres */}
      {stats.topGenres.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Your Comedy DNA</h2>
          <div className="flex flex-wrap gap-3">
            {stats.topGenres.map((g) => (
              <div key={g.genre} className="px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm">
                {g.genre} ({g.count})
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.showsAttended === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-4">No activity yet this year. Start going to shows!</p>
          <Link href="/schedule" className="text-brand-gold hover:underline">Browse upcoming shows</Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800 text-center">
      <p className="text-3xl font-bold text-brand-gold">{value}</p>
      <p className="text-zinc-500 text-sm mt-1">{label}</p>
    </div>
  );
}
