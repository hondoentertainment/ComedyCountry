import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

/**
 * Admin endpoint for managing venue claims.
 *
 * GET  - List all venue claims (filterable by status)
 * PATCH - Approve/reject a venue claim
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "PENDING";

  try {
    const claims = await prisma.venueClaim.findMany({
      where: status === "ALL" ? {} : { status: status as "PENDING" | "APPROVED" | "REJECTED" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Hydrate venue and user info
    const venueIds = Array.from(new Set(claims.map((c) => c.venueId)));
    const userIds = Array.from(new Set(claims.map((c) => c.userId)));

    const [venues, users] = await Promise.all([
      prisma.venue.findMany({
        where: { id: { in: venueIds } },
        select: { id: true, name: true, city: true, state: true },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const venueMap = new Map(venues.map((v) => [v.id, v]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const hydrated = claims.map((c) => ({
      ...c,
      venue: venueMap.get(c.venueId),
      user: userMap.get(c.userId),
    }));

    return NextResponse.json(hydrated);
  } catch {
    return NextResponse.json([]);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { claimId, status } = await request.json();
  if (!claimId || !["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "claimId and status (APPROVED/REJECTED) required" }, { status: 400 });
  }

  try {
    const claim = await prisma.venueClaim.update({
      where: { id: claimId },
      data: {
        status,
        reviewedBy: auth.session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Notify the claimant
    const venue = await prisma.venue.findUnique({
      where: { id: claim.venueId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId: claim.userId,
        type: status === "APPROVED" ? "venue_claim_approved" : "venue_claim_rejected",
        title: status === "APPROVED" ? "Venue Claim Approved!" : "Venue Claim Rejected",
        message: status === "APPROVED"
          ? `Your claim for ${venue?.name || "the venue"} has been approved. You now have access to the venue dashboard.`
          : `Your claim for ${venue?.name || "the venue"} was not approved. Please submit additional proof or contact support.`,
        venueId: claim.venueId,
      },
    });

    return NextResponse.json(claim);
  } catch {
    return NextResponse.json({ error: "Failed to update claim" }, { status: 503 });
  }
}
