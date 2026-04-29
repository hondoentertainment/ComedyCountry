import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Analytics | Admin | Punchline Atlas",
  description: "Business analytics dashboard — user growth, engagement, and revenue metrics.",
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const auth = await requireAdmin();
  if (!auth.authorized) redirect(auth.status === 401 ? "/auth/signin" : "/");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const prevThirtyDays = new Date(thirtyDaysAgo);
  prevThirtyDays.setDate(prevThirtyDays.getDate() - 30);

  // Parallel data fetches
  const [
    totalUsers,
    newUsers30d,
    prevNewUsers30d,
    totalComedians,
    totalVenues,
    totalEvents,
    upcomingEvents,
    activeSubscriptions,
    subscriptionRevenue,
    totalFollows,
    newFollows7d,
    totalReviews,
    newReviews30d,
    totalRsvps,
    ticketClicks30d,
    totalTicketClicks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: prevThirtyDays, lt: thirtyDaysAgo } } }),
    prisma.comedian.count(),
    prisma.venue.count(),
    prisma.event.count(),
    prisma.event.count({ where: { date: { gte: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true },
    }).catch(() => []),
    prisma.comedianFollow.count().catch(() => 0),
    prisma.comedianFollow.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
    prisma.eventReview.count().catch(() => 0),
    prisma.eventReview.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    prisma.eventAttendance.count({ where: { status: "going" } }).catch(() => 0),
    prisma.ticketClick.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    prisma.ticketClick.count().catch(() => 0),
  ]);

  // Calculate MRR from subscription plans
  const planPrices: Record<string, number> = {
    FAN_PRO: 4.99,
    COMEDIAN_PRO: 14.99,
    COMEDIAN_PREMIUM: 29.99,
    VENUE_PRO: 49.99,
    VENUE_PREMIUM: 99.99,
  };

  const mrr = (subscriptionRevenue as Array<{ plan: string }>).reduce((sum, s) => {
    return sum + (planPrices[s.plan] || 0);
  }, 0);

  // Plan breakdown
  const planCounts: Record<string, number> = {};
  (subscriptionRevenue as Array<{ plan: string }>).forEach((s) => {
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
  });

  const userGrowthPct = prevNewUsers30d > 0
    ? (((newUsers30d - prevNewUsers30d) / prevNewUsers30d) * 100).toFixed(1)
    : newUsers30d > 0 ? "+100" : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-gold">Business Analytics</h1>
        <p className="text-zinc-400 text-sm mt-1">Platform-wide metrics and growth indicators.</p>
      </div>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Total Users" value={totalUsers.toLocaleString()} />
          <MetricCard
            label="New Users (30d)"
            value={newUsers30d.toLocaleString()}
            badge={`${Number(userGrowthPct) >= 0 ? "+" : ""}${userGrowthPct}%`}
            badgeColor={Number(userGrowthPct) >= 0 ? "text-green-400" : "text-red-400"}
          />
          <MetricCard label="MRR" value={`$${mrr.toFixed(2)}`} highlight />
          <MetricCard label="Active Subs" value={activeSubscriptions.toLocaleString()} />
        </div>
      </section>

      {/* Content Stats */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Content</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Comedians" value={totalComedians.toLocaleString()} />
          <MetricCard label="Venues" value={totalVenues.toLocaleString()} />
          <MetricCard label="Total Events" value={totalEvents.toLocaleString()} />
          <MetricCard label="Upcoming Events" value={upcomingEvents.toLocaleString()} />
        </div>
      </section>

      {/* Engagement */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Total Follows" value={totalFollows.toLocaleString()} />
          <MetricCard label="New Follows (7d)" value={newFollows7d.toLocaleString()} />
          <MetricCard label="Total Reviews" value={totalReviews.toLocaleString()} />
          <MetricCard label="Reviews (30d)" value={newReviews30d.toLocaleString()} />
          <MetricCard label="Total RSVPs" value={totalRsvps.toLocaleString()} />
          <MetricCard label="Ticket Clicks (30d)" value={ticketClicks30d.toLocaleString()} />
          <MetricCard label="Total Ticket Clicks" value={totalTicketClicks.toLocaleString()} />
        </div>
      </section>

      {/* Subscription Breakdown */}
      {Object.keys(planCounts).length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Subscription Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(planCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([plan, count]) => (
                <div key={plan} className="p-4 rounded-lg bg-brand-surface border border-zinc-800 text-center">
                  <p className="text-brand-gold font-bold text-lg">{count}</p>
                  <p className="text-zinc-500 text-xs mt-1">{plan.replace(/_/g, " ")}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">
                    ${((planPrices[plan] || 0) * count).toFixed(2)}/mo
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="flex flex-wrap gap-3">
        <a href="/admin" className="px-4 py-2 rounded-lg bg-brand-surface border border-zinc-800 text-zinc-300 text-sm hover:border-zinc-700">
          Admin Dashboard
        </a>
        <a href="/admin/claims" className="px-4 py-2 rounded-lg bg-brand-surface border border-zinc-800 text-zinc-300 text-sm hover:border-zinc-700">
          Manage Claims
        </a>
        <a href="/admin/reports" className="px-4 py-2 rounded-lg bg-brand-surface border border-zinc-800 text-zinc-300 text-sm hover:border-zinc-700">
          Moderation Queue
        </a>
      </section>
    </div>
  );
}

function MetricCard({ label, value, highlight, badge, badgeColor }: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800 text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-brand-gold" : "text-white"}`}>
        {value}
      </p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
      {badge && (
        <p className={`text-xs mt-1 font-medium ${badgeColor || "text-zinc-400"}`}>{badge}</p>
      )}
    </div>
  );
}
