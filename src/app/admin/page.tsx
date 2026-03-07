import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  let stats = { venues: 0, comedians: 0, events: 0, users: 0, reviews: 0 };

  try {
    const [venues, comedians, events, users, reviews] = await Promise.all([
      prisma.venue.count(),
      prisma.comedian.count(),
      prisma.event.count(),
      prisma.user.count(),
      prisma.eventReview.count(),
    ]);
    stats = { venues, comedians, events, users, reviews };
  } catch {
    // DB not configured
  }

  const cards = [
    { label: "Venues", count: stats.venues, href: "/admin/venues", color: "text-emerald-400" },
    { label: "Comedians", count: stats.comedians, href: "/admin/comedians", color: "text-blue-400" },
    { label: "Events", count: stats.events, href: "/admin/events", color: "text-purple-400" },
    { label: "Users", count: stats.users, href: "#", color: "text-amber-400" },
    { label: "Reviews", count: stats.reviews, href: "#", color: "text-rose-400" },
  ];

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
}
