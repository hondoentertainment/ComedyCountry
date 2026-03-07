import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Comedian Dashboard | Punchline Atlas",
  description: "Pro analytics dashboard for comedians. Track followers, show attendance, ratings, and audience insights.",
};

export const dynamic = "force-dynamic";

export default async function ComedianDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  // Check if user has a comedian claim approved
  const claim = await prisma.comedianClaim.findFirst({
    where: { userId: session.user.id, status: "APPROVED" },
  }).catch(() => null);

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  }).catch(() => null);

  const isPro = subscription?.status === "ACTIVE" && (
    subscription.plan === "COMEDIAN_PRO" || subscription.plan === "COMEDIAN_PREMIUM"
  );

  // If no claim, show claim page
  if (!claim) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">Comedian Dashboard</h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Claim Your Profile</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Are you a comedian? Claim your profile to access analytics, manage your page,
            and unlock pro features like promoted placement and audience insights.
          </p>
          <Link
            href="/comedian-dashboard/claim"
            className="inline-block px-6 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Claim your profile
          </Link>
          <p className="text-zinc-600 text-xs mt-4">
            You&apos;ll need to verify your identity via social media or website.
          </p>
        </div>

        {/* Pro Plans Preview */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Pro Plans for Comedians</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PricingCard
              title="Comedian Pro"
              price="$14.99"
              period="/month"
              features={[
                "Analytics dashboard",
                "Verified badge on profile",
                "Promoted profile in search",
                "Audience demographics",
                "Show performance metrics",
                "Merch & tip jar links",
              ]}
              highlight={false}
            />
            <PricingCard
              title="Comedian Premium"
              price="$29.99"
              period="/month"
              features={[
                "Everything in Pro",
                "Featured homepage placement",
                "City scene spotlights",
                "API access for your data",
                "Priority support",
                "Custom profile themes",
              ]}
              highlight
            />
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for claimed comedians
  const comedian = await prisma.comedian.findUnique({
    where: { id: claim.comedianId },
    include: {
      _count: { select: { followers: true, events: true, tierRatings: true } },
      genres: { select: { genre: true } },
      specialReleases: { select: { id: true, title: true, ratings: { select: { rating: true } } } },
    },
  });

  if (!comedian) redirect("/comedian-dashboard");

  // Analytics data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentFollows, upcomingShows, tierBreakdown, recentAttendance] = await Promise.all([
    prisma.comedianFollow.count({
      where: { comedianId: comedian.id, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.event.findMany({
      where: {
        date: { gte: new Date() },
        comedians: { some: { comedianId: comedian.id } },
      },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        _count: { select: { attendees: true } },
      },
      orderBy: { date: "asc" },
      take: 10,
    }),
    prisma.comedianTierRating.groupBy({
      by: ["tier"],
      where: { comedianId: comedian.id },
      _count: true,
    }),
    prisma.eventAttendance.count({
      where: {
        event: { comedians: { some: { comedianId: comedian.id } }, date: { gte: thirtyDaysAgo } },
        status: "going",
      },
    }),
  ]);

  const tierMap = Object.fromEntries(tierBreakdown.map((t) => [t.tier, t._count]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">{comedian.name}</h1>
          <p className="text-zinc-400 mt-1">
            Comedian Dashboard
            {isPro && <span className="ml-2 px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-xs font-medium">PRO</span>}
          </p>
        </div>
        <Link href={`/comedians/${comedian.slug}`} className="text-sm text-zinc-400 hover:text-brand-gold">
          View public profile &rarr;
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Followers" value={comedian._count.followers} />
        <StatCard label="New Followers (30d)" value={recentFollows} highlight />
        <StatCard label="Upcoming Shows" value={upcomingShows.length} />
        <StatCard label="RSVPs (30d)" value={recentAttendance} />
      </div>

      {/* Tier Rating Breakdown */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Community Tier Ratings</h2>
        {comedian._count.tierRatings > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {["S", "A", "B", "C", "D", "F"].map((tier) => (
              <div key={tier} className="px-4 py-3 rounded-lg bg-brand-surface border border-zinc-800 text-center min-w-[60px]">
                <p className="text-brand-gold font-bold text-lg">{tier}</p>
                <p className="text-zinc-500 text-xs">{tierMap[tier] || 0}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm">No tier ratings yet.</p>
        )}
      </section>

      {/* Specials Performance */}
      {comedian.specialReleases.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Specials Performance</h2>
          <div className="space-y-2">
            {comedian.specialReleases.map((s) => {
              const avg = s.ratings.length > 0
                ? (s.ratings.reduce((sum, r) => sum + r.rating, 0) / s.ratings.length).toFixed(1)
                : "—";
              return (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800">
                  <span className="text-white font-medium">{s.title}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-brand-gold">{avg} avg</span>
                    <span className="text-zinc-500">{s.ratings.length} ratings</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Shows */}
      {upcomingShows.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Upcoming Shows</h2>
          <div className="space-y-2">
            {upcomingShows.map((show) => (
              <Link
                key={show.id}
                href={`/events/${show.id}`}
                className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <p className="text-white font-medium">{show.venue.name}</p>
                  <p className="text-zinc-500 text-sm">{show.venue.city}, {show.venue.state}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 text-sm">
                    {new Date(show.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  {show._count.attendees > 0 && (
                    <p className="text-brand-gold text-xs">{show._count.attendees} going</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upgrade CTA for non-pro */}
      {!isPro && (
        <section className="p-6 rounded-lg bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 border border-brand-gold/20 text-center">
          <h2 className="text-lg font-bold text-brand-gold mb-2">Upgrade to Pro</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Get verified badge, promoted placement, audience demographics, and more.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            View plans
          </Link>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800 text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-brand-gold" : "text-white"}`}>{value}</p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function PricingCard({ title, price, period, features, highlight }: {
  title: string; price: string; period: string; features: string[]; highlight: boolean;
}) {
  return (
    <div className={`p-6 rounded-lg border ${highlight ? "bg-brand-gold/5 border-brand-gold/30" : "bg-brand-surface border-zinc-800"}`}>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="mb-4">
        <span className="text-3xl font-bold text-brand-gold">{price}</span>
        <span className="text-zinc-500 text-sm">{period}</span>
      </p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-zinc-300 text-sm">
            <svg className="w-4 h-4 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
