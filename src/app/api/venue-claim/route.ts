import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Venue claim system — parity with comedian claims.
 * Venue owners/managers can claim their venue profile.
 *
 * POST - Submit a venue claim
 * GET  - List user's venue claims
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { venueId, proofUrl, proofNote } = body;

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  try {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Check for existing claim by this user
    const existing = await prisma.venueClaim.findUnique({
      where: { userId_venueId: { userId: session.user.id, venueId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a claim for this venue", status: existing.status },
        { status: 409 }
      );
    }

    // Check if another user already has an approved claim
    const approvedClaim = await prisma.venueClaim.findFirst({
      where: { venueId, status: "APPROVED" },
    });
    if (approvedClaim) {
      return NextResponse.json({ error: "This venue has already been claimed" }, { status: 409 });
    }

    const claim = await prisma.venueClaim.create({
      data: {
        userId: session.user.id,
        venueId,
        proofUrl: proofUrl || null,
        proofNote: proofNote || null,
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Claim service unavailable" }, { status: 503 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const claims = await prisma.venueClaim.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(claims);
  } catch {
    return NextResponse.json([]);
  }
}
