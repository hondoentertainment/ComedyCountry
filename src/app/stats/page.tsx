import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "My Stats | Punchline Atlas",
  description: "Your comedy stats — shows attended, comedians seen, favorite genres, and more.",
};

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/stats");
  }

  const userId = session.user.id;

  const [
    followedComedians,
    followedVenues,
    reviews,
    attending,
    tierRatings,
  ] = await Promise.all([
    prisma.comedianFollow.count({ where: { userId } }),
    prisma.venueFollow.count({ where: { userId } }),
    prisma.eventReview.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            venue: { select: { name: true, city: true, state: true } },
            comedians: { include: { comedian: { select: { name: true, genres: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventAttendance.count({ where: { userId, status: "going" } }),
    prisma.comedianTierRating.findMany({
      where: { userId },
      include: { comedian: { select: { name: true, slug: true } } },
    }),
  ]);

  // Compute stats
  const showsReviewed = reviews.length;
  const avgRating = showsReviewed > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / showsReviewed).toFixed(1)
    : "—";

  // Genre breakdown
  const genreCounts: Record<string, number> = {};
  reviews.forEach((r) => {
    r.event.comedians.forEach((ec) => {
      ec.comedian.genres.forEach((g) => {
        genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
      });
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Unique comedians seen
  const uniqueComedians = new Set<string>();
  reviews.forEach((r) => {
    r.event.comedians.forEach((ec) => uniqueComedians.add(ec.comedian.name));
  });

  // Unique venues visited
  const uniqueVenues = new Set<string>();
  reviews.forEach((r) => uniqueVenues.add(r.event.venue.name));

  // States visited
  const statesVisited = new Set<string>();
  reviews.forEach((r) => statesVisited.add(r.event.venue.state));

  // Tier breakdown
  const tierCounts: Record<string, number> = {};
  tierRatings.forEach((t) => {
    tierCounts[t.tier] = (tierCounts[t.tier] || 0) + 1;
  });

  const statCards = [
    { label: "Shows reviewed", value: showsReviewed, icon: "🎤" },
    { label: "Upcoming shows", value: attending, icon: "🎟️" },
    { label: "Comedians seen", value: uniqueComedians.size, icon: "😂" },
    { label: "Venues visited", value: uniqueVenues.size, icon: "🏛️" },
    { label: "States covered", value: statesVisited.size, icon: "🗺️" },
    { label: "Avg. rating given", value: avgRating, icon: "⭐" },
    { label: "Comedians followed", value: followedComedians, icon: "❤️" },
    { label: "Venues followed", value: followedVenues, icon: "📍" },
  ];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/profile" className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block">
          ← Back to Profile
        </Link>

        <h1 className="text-3xl font-bold text-brand-gold mb-2">My Comedy Stats</h1>
        <p className="text-zinc-400 mb-8">Your comedy journey at a glance.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {statCards.map((s) => (
            <div key={s.label} className="p-4 rounded-card bg-brand-surface border border-zinc-800 text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top Genres */}
        {topGenres.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">Your top genres</h2>
            <div className="space-y-2">
              {topGenres.map(([genre, count]) => {
                const max = topGenres[0][1];
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={genre} className="flex items-center gap-3">
                    <span className="text-zinc-300 text-sm font-medium w-28 shrink-0 capitalize">{genre}</span>
                    <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-gold/80 to-brand-gold rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-zinc-500 text-xs w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tier Breakdown */}
        {tierRatings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">Your tier ratings</h2>
            <div className="flex gap-3 flex-wrap">
              {["S", "A", "B", "C", "D", "F"].map((tier) => {
                const count = tierCounts[tier] || 0;
                if (count === 0) return null;
                const colors: Record<string, string> = {
                  S: "bg-brand-gold/20 text-brand-gold border-brand-gold/40",
                  A: "bg-green-900/30 text-green-400 border-green-800/40",
                  B: "bg-blue-900/30 text-blue-400 border-blue-800/40",
                  C: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40",
                  D: "bg-orange-900/30 text-orange-400 border-orange-800/40",
                  F: "bg-red-900/30 text-red-400 border-red-800/40",
                };
                return (
                  <div key={tier} className={`px-4 py-3 rounded-lg border ${colors[tier]}`}>
                    <p className="text-xl font-bold">{tier}</p>
                    <p className="text-xs opacity-70">{count} comedian{count !== 1 ? "s" : ""}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Recent reviews</h2>
            <div className="space-y-2">
              {reviews.slice(0, 10).map((r) => {
                const comedianNames = r.event.comedians.map((ec) => ec.comedian.name).join(", ");
                return (
                  <Link
                    key={r.id}
                    href={`/events/${r.eventId}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <span className="rating-badge text-sm">★ {r.rating}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{comedianNames}</p>
                      <p className="text-zinc-500 text-xs truncate">{r.event.venue.name} · {r.event.venue.city}, {r.event.venue.state}</p>
                    </div>
                    <span className="text-zinc-600 text-xs shrink-0">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {showsReviewed === 0 && (
          <div className="py-16 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
            <p className="text-zinc-400 font-medium mb-2">No stats yet</p>
            <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
              Attend shows and leave reviews to build your comedy stats.
            </p>
            <Link href="/schedule" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors">
              Find shows
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
