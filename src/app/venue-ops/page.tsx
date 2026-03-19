import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VenueOpsTabs from "./VenueOpsTabs";

export const metadata = {
  title: "Venue Operations | Punchline Atlas",
  description:
    "Smart venue operations dashboard for managing seating, sales, bookings, events, and more.",
};

export const dynamic = "force-dynamic";

export default async function VenueOpsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  // Look up the user's approved venue claim
  let venueId: string | null = null;
  let venueName: string | null = null;

  try {
    const claim = await prisma.venueClaim.findFirst({
      where: { userId: session.user.id, status: "APPROVED" },
      include: { venue: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (claim?.venue) {
      venueId = claim.venue.id;
      venueName = claim.venue.name;
    }
  } catch {
    // VenueClaim table may not exist yet
  }

  // Admins can also access — use first venue
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user?.role === "admin";

  if (!venueId && isAdmin) {
    try {
      const firstVenue = await prisma.venue.findFirst({
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      });
      if (firstVenue) {
        venueId = firstVenue.id;
        venueName = firstVenue.name;
      }
    } catch {
      // venue table may not exist
    }
  }

  if (!venueId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">
          Venue Operations
        </h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            Claim Your Venue
          </h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Claim your venue to access operations tools including floor plan
            management, POS dashboard, event management, and booking management.
          </p>
          <Link
            href="/venue-dashboard/claim"
            className="inline-block px-6 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Claim your venue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">
            Venue Operations
          </h1>
          <p className="text-zinc-400 mt-1">
            {venueName}
            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">
                ADMIN
              </span>
            )}
          </p>
        </div>
        <Link
          href="/venue-dashboard"
          className="text-sm text-brand-gold hover:underline"
        >
          Venue Dashboard &rarr;
        </Link>
      </div>

      <VenueOpsTabs venueId={venueId} />
    </div>
  );
}
