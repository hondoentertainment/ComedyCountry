import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTasteProfile, computeTasteProfile } from "@/lib/taste-profile";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Your Comedy Taste Profile | Punchline Atlas",
  description: "Discover your comedy taste dimensions, top genres, and get personalized recommendations.",
};

export const dynamic = "force-dynamic";

export default async function TasteProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/taste-profile");
  }

  // Fetch or compute profile
  let profile = await getTasteProfile(session.user.id);
  const isStale =
    !profile ||
    Date.now() - profile.lastComputed.getTime() > 7 * 24 * 60 * 60 * 1000;

  if (!profile || isStale) {
    profile = await computeTasteProfile(session.user.id);
  }

  const dimensions = profile.dimensions;
  const sortedDimensions = Object.entries(dimensions).sort(
    (a, b) => b[1] - a[1]
  );
  const topGenres = profile.topGenres;
  const topAttributes = profile.topAttributes;
  const confidencePct = Math.round(profile.confidence * 100);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-brand-gold">
            Your Comedy DNA
          </h1>
          <form action="/api/taste-profile" method="POST">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium"
            >
              Recompute
            </button>
          </form>
        </div>
        <p className="text-zinc-400 mb-8">
          Based on your follows, ratings, reviews, and show attendance.
        </p>

        <div className="mb-8 p-4 rounded-lg bg-brand-surface border border-zinc-800">
          <p className="text-white font-medium mb-1">Explainable match engine</p>
          <p className="text-zinc-400 text-sm">{profile.profileSummary}</p>
        </div>

        {/* Confidence indicator */}
        <div className="mb-8 p-4 rounded-lg bg-brand-surface border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm">Profile confidence</span>
            <span className="text-white text-sm font-medium">
              {confidencePct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-gold transition-all"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          {confidencePct < 50 && (
            <p className="text-zinc-500 text-xs mt-2">
              Follow more comedians and review shows to improve your profile accuracy.
            </p>
          )}
        </div>

        {/* Top Genres */}
        {topGenres.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Top Genres</h2>
            <div className="flex flex-wrap gap-2">
              {topGenres.map((genre, i) => (
                <span
                  key={genre}
                  className={`px-4 py-2 rounded-full font-medium text-sm capitalize ${
                    i === 0
                      ? "bg-brand-gold text-brand-dark"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {genre}
                </span>
              ))}
            </div>
          </section>
        )}

        {topAttributes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Comedy Genome</h2>
            <div className="flex flex-wrap gap-2">
              {topAttributes.map((attribute, index) => (
                <span
                  key={attribute}
                  className={`px-4 py-2 rounded-full font-medium text-sm ${
                    index === 0
                      ? "bg-brand-gold text-brand-dark"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {attribute.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <p className="text-zinc-500 text-sm mt-3">
              These traits power explainable recommendations, stretch picks, and scene matching.
            </p>
          </section>
        )}

        {/* Taste Dimensions - Bar Chart */}
        {sortedDimensions.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">
              Taste Dimensions
            </h2>
            <div className="space-y-3">
              {sortedDimensions.map(([genre, score]) => (
                <div key={genre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-300 text-sm capitalize">
                      {genre}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-gold transition-all"
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="py-16 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center mb-10">
            <p className="text-zinc-400 font-medium mb-2">
              Not enough data yet
            </p>
            <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
              Follow comedians, attend shows, and leave reviews to build your taste profile.
            </p>
            <Link
              href="/comedians"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
            >
              Browse comedians
            </Link>
          </div>
        )}

        {/* Links */}
        <section className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/for-you"
            className="flex-1 text-center px-5 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            View Recommended Comedians
          </Link>
          <Link
            href="/happening-tonight"
            className="flex-1 text-center px-5 py-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors font-medium"
          >
            Happening Tonight
          </Link>
        </section>
      </div>
    </div>
  );
}
