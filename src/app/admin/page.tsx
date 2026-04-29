import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFreshnessDashboardData } from "@/lib/freshness";

export default async function AdminDashboard() {
  let stats = { venues: 0, comedians: 0, events: 0, users: 0, reviews: 0, pendingClaims: 0, subscriptions: 0, ticketClicks: 0 };
  let freshnessSummary = { staleCount: 0, averageCoverage: 0 };

  try {
    const [venues, comedians, events, users, reviews, pendingClaims, subscriptions, ticketClicks] = await Promise.all([
      prisma.venue.count(),
      prisma.comedian.count(),
      prisma.event.count(),
      prisma.user.count(),
      prisma.eventReview.count(),
      prisma.comedianClaim.count({ where: { status: "PENDING" } }).catch(() => 0),
      prisma.subscription.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.ticketClick.count().catch(() => 0),
    ]);
    stats = { venues, comedians, events, users, reviews, pendingClaims, subscriptions, ticketClicks };
  } catch {
    // DB not configured
  }

  try {
    const freshness = await getFreshnessDashboardData();
    freshnessSummary = {
      staleCount: freshness.summary.staleCount,
      averageCoverage: freshness.summary.averageCoverage,
    };
  } catch {
    // ignore freshness failures on dashboard load
  }

  const cards = [
    { label: "Venues", count: stats.venues, href: "/admin/venues", color: "text-emerald-400" },
    { label: "Comedians", count: stats.comedians, href: "/admin/comedians", color: "text-blue-400" },
    { label: "Events", count: stats.events, href: "/admin/events", color: "text-purple-400" },
    { label: "Users", count: stats.users, href: "#", color: "text-amber-400" },
    { label: "Reviews", count: stats.reviews, href: "#", color: "text-rose-400" },
    { label: "Pending Claims", count: stats.pendingClaims, href: "/admin/claims", color: "text-orange-400" },
    { label: "Active Subs", count: stats.subscriptions, href: "#", color: "text-cyan-400" },
    { label: "Ticket Clicks", count: stats.ticketClicks, href: "/admin/ticket-clicks", color: "text-pink-400" },
  ];

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, count, href, color }) => (
          <Link
            key={label}
            href={href}
            className="p-4 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-zinc-600/50 transition-colors"
          >
            <p className="text-zinc-400 text-sm">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              {count.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      {/* Content Management */}
      <h2 className="text-lg font-semibold text-white mb-3">Content Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/venues"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-emerald-500/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
            Manage Venues
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Create, edit, and delete comedy venues across the US.
          </p>
        </Link>
        <Link
          href="/admin/comedians"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-blue-500/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Manage Comedians
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Add and update comedian profiles, bios, and social links.
          </p>
        </Link>
        <Link
          href="/admin/events"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-purple-500/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
            Manage Events
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Schedule shows, assign comedians, and manage ticket links.
          </p>
        </Link>
      </div>

      {/* Business & Revenue */}
      <h2 className="text-lg font-semibold text-white mb-3">Business & Revenue</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/freshness"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-brand-gold transition-colors">
            Freshness Dashboard
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {freshnessSummary.staleCount} stale items queued · {Math.round(freshnessSummary.averageCoverage)} average city coverage
          </p>
        </Link>
        <Link
          href="/admin/operations"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-cyan-500/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
            Operations Readiness
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Monitor import guardrails, target-city coverage, and venue or event gaps that block launch quality.
          </p>
        </Link>
        <Link
          href="/admin/claims"
          className="p-6 rounded-card bg-brand-surface border border-zinc-800/80 hover:border-orange-500/30 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">
            Comedian Claims
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Review and approve comedian profile verification requests.
          </p>
          {stats.pendingClaims > 0 && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-bold rounded bg-orange-500/20 text-orange-400">
              {stats.pendingClaims} pending
            </span>
          )}
        </Link>
        <div className="p-6 rounded-card bg-brand-surface border border-zinc-800/80">
          <h2 className="text-lg font-semibold text-white">Revenue Overview</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {stats.subscriptions} active subscriptions · {stats.ticketClicks.toLocaleString()} ticket clicks
          </p>
        </div>
        <div className="p-6 rounded-card bg-brand-surface border border-zinc-800/80">
          <h2 className="text-lg font-semibold text-white">Promotions</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Manage promoted listings, ad placements, and affiliate partners.
          </p>
        </div>
      </div>
    </div>
  );
}
