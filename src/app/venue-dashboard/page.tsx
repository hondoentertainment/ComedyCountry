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
