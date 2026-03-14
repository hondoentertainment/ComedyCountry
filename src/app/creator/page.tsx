import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser, getRevenueStats } from "@/lib/creator";

export const metadata = {
  title: "Creator Hub | Punchline Atlas",
  description: "Manage your comedian profile, content, merch, bookings, and revenue.",
};

export const dynamic = "force-dynamic";

const tabs = [
  { label: "Content", href: "/creator/content", icon: "📝" },
  { label: "Tips", href: "/creator/revenue", icon: "💰" },
  { label: "Merch", href: "/creator/merch", icon: "🛍️" },
  { label: "Bookings", href: "/creator/bookings", icon: "📅" },
  { label: "Setlist", href: "/creator/setlist", icon: "🎤" },
  { label: "Revenue", href: "/creator/revenue", icon: "📊" },
  { label: "Press Kit", href: "/creator/press-kit", icon: "📰" },
];

export default async function CreatorHubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const comedian = await getComedianForUser(session.user.id);

  if (!comedian) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">Creator Hub</h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Claim Your Profile</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Are you a comedian? Claim your profile to unlock the full creator toolkit
            &mdash; exclusive content, fan tips, merch, booking requests, setlist tracking,
            and your auto-generated press kit.
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
      </div>
    );
  }

  let stats = { totalTips: 0, tipCount: 0, ticketRevenue: 0, ticketsSold: 0, merchItemCount: 0, confirmedBookings: 0 };
  try {
    stats = await getRevenueStats(comedian.id);
  } catch {
    // stats may fail if tables aren't migrated
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">Creator Hub</h1>
          <p className="text-zinc-400 mt-1">Welcome back, {comedian.name}</p>
        </div>
        <Link
          href={`/comedians/${comedian.slug}`}
          className="text-sm text-brand-gold hover:underline"
        >
          View public profile &rarr;
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tips" value={`$${stats.totalTips.toFixed(2)}`} />
        <StatCard label="Tip Count" value={String(stats.tipCount)} />
        <StatCard label="Ticket Revenue" value={`$${stats.ticketRevenue.toFixed(2)}`} />
        <StatCard label="Confirmed Bookings" value={String(stats.confirmedBookings)} />
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="p-6 rounded-lg bg-brand-surface border border-zinc-800 hover:border-brand-gold/50 transition-colors text-center group"
          >
            <span className="text-2xl block mb-2">{tab.icon}</span>
            <span className="text-white font-semibold group-hover:text-brand-gold transition-colors">
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
