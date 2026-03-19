import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Venue Dashboard | Punchline Atlas",
  description: "Analytics and management dashboard for comedy venues.",
};

export const dynamic = "force-dynamic";

export default async function VenueDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  // Check subscription
  let subscription: { status: string; plan: string } | null = null;
  try {
    subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true, plan: true },
    });
  } catch {
    // Subscription table may not exist yet (pre-migration)
  }

  const isPro = subscription?.status === "ACTIVE" && (
    subscription.plan === "VENUE_PRO" || subscription.plan === "VENUE_PREMIUM"
  );

  // For now, admin users can also access
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user?.role === "admin";

  if (!isPro && !isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">Venue Dashboard</h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">For Venue Owners & Managers</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Get analytics on your venue&apos;s performance, manage events, track audience
            engagement, and promote your shows to comedy fans.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            View venue plans
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-2">Venue Pro — $49.99/mo</h3>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-center gap-2"><CheckIcon /> Venue analytics dashboard</li>
              <li className="flex items-center gap-2"><CheckIcon /> Event management tools</li>
              <li className="flex items-center gap-2"><CheckIcon /> Promoted venue listing</li>
              <li className="flex items-center gap-2"><CheckIcon /> Audience demographics</li>
              <li className="flex items-center gap-2"><CheckIcon /> Priority event placement</li>
            </ul>
          </div>
          <div className="p-6 rounded-lg bg-brand-gold/5 border border-brand-gold/30">
            <h3 className="text-lg font-bold text-white mb-2">Venue Premium — $99.99/mo</h3>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-center gap-2"><CheckIcon /> Everything in Venue Pro</li>
              <li className="flex items-center gap-2"><CheckIcon /> Homepage featured placement</li>
              <li className="flex items-center gap-2"><CheckIcon /> City takeover sponsorship</li>
              <li className="flex items-center gap-2"><CheckIcon /> Full API access</li>
              <li className="flex items-center gap-2"><CheckIcon /> Ticket sales analytics</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for pro venues / admins
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let topVenues: Array<{
    id: string; name: string; city: string; state: string;
    _count: { followers: number; events: number; reviews: number };
  }> = [];
  let recentEvents: Array<{
    id: string; date: Date;
    venue: { name: string; city: string; state: string };
    _count: { attendees: number; reviews: number };
  }> = [];
  let ticketClicks30d = 0;
  let venueReviews30d = 0;
  let rsvps30d = 0;

  try {
    const [v, e, metrics] = await Promise.all([
      prisma.venue.findMany({
        include: {
          _count: { select: { followers: true, events: true, reviews: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: 10,
      }),
      prisma.event.findMany({
        where: { date: { gte: new Date() } },
        include: {
          venue: { select: { name: true, city: true, state: true } },
          _count: { select: { attendees: true, reviews: true } },
        },
        orderBy: { date: "asc" },
        take: 15,
      }),
      Promise.all([
        prisma.ticketClick.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.venueReview.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.eventAttendance.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
      ]),
    ]);
    topVenues = v;
    recentEvents = e;
    [ticketClicks30d, venueReviews30d, rsvps30d] = metrics;
  } catch {
    // Dashboard degrades gracefully when queries fail
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">Venue Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            {isPro && <span className="px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-xs font-medium">PRO</span>}
            {isAdmin && <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">ADMIN</span>}
          </p>
        </div>
        <Link
          href="/venue-ops"
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold hover:bg-brand-gold/90 transition-colors"
        >
          Venue Operations &rarr;
        </Link>
      </div>

      {/* Quick links to operations tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Link
          href="/venue-ops"
          className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-brand-gold/50 transition-colors text-center group"
        >
          <span className="text-2xl block mb-2">
            <svg className="w-7 h-7 mx-auto text-zinc-400 group-hover:text-brand-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </span>
          <span className="text-white text-sm font-medium group-hover:text-brand-gold transition-colors">
            Floor Plan
          </span>
        </Link>
        <Link
          href="/venue-ops"
          className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-brand-gold/50 transition-colors text-center group"
        >
          <span className="text-2xl block mb-2">
            <svg className="w-7 h-7 mx-auto text-zinc-400 group-hover:text-brand-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </span>
          <span className="text-white text-sm font-medium group-hover:text-brand-gold transition-colors">
            POS Sales
          </span>
        </Link>
        <Link
          href="/venue-ops"
          className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-brand-gold/50 transition-colors text-center group"
        >
          <span className="text-2xl block mb-2">
            <svg className="w-7 h-7 mx-auto text-zinc-400 group-hover:text-brand-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </span>
          <span className="text-white text-sm font-medium group-hover:text-brand-gold transition-colors">
            Events
          </span>
        </Link>
        <Link
          href="/venue-ops"
          className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-brand-gold/50 transition-colors text-center group"
        >
          <span className="text-2xl block mb-2">
            <svg className="w-7 h-7 mx-auto text-zinc-400 group-hover:text-brand-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </span>
          <span className="text-white text-sm font-medium group-hover:text-brand-gold transition-colors">
            Bookings
          </span>
        </Link>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <MetricCard label="Ticket Clicks (30d)" value={ticketClicks30d} highlight />
        <MetricCard label="Venue Reviews (30d)" value={venueReviews30d} />
        <MetricCard label="RSVPs (30d)" value={rsvps30d} />
        <MetricCard label="Total Venues" value={topVenues.length} />
      </div>

      {/* Top Venues by Followers */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Top Venues by Followers</h2>
        <div className="space-y-2">
          {topVenues.map((venue, i) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-600 text-sm font-mono w-6">{i + 1}</span>
                <div>
                  <p className="text-white font-medium">{venue.name}</p>
                  <p className="text-zinc-500 text-xs">{venue.city}, {venue.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-brand-gold">{venue._count.followers} followers</span>
                <span className="text-zinc-500">{venue._count.events} events</span>
                <span className="text-zinc-500">{venue._count.reviews} reviews</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {recentEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Upcoming Events</h2>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <p className="text-white font-medium">{event.venue.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" · "}{event.venue.city}, {event.venue.state}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {event._count.attendees > 0 && (
                    <span className="text-brand-gold">{event._count.attendees} going</span>
                  )}
                  {event._count.reviews > 0 && (
                    <span className="text-zinc-500">{event._count.reviews} reviews</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800 text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-brand-gold" : "text-white"}`}>{value.toLocaleString()}</p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
