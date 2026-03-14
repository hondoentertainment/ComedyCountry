import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/venue-claim/verify
 *
 * Automated verification for venue claims.
 * Checks if user's email domain matches venue website domain.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { venueId, businessUrl } = body;

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { socialLinks: true },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const existingClaim = await prisma.venueClaim.findFirst({
      where: { venueId, status: "APPROVED" },
    });
    if (existingClaim) {
      return NextResponse.json({ error: "This venue is already claimed" }, { status: 409 });
    }

    const userClaim = await prisma.venueClaim.findUnique({
      where: { userId_venueId: { userId: session.user.id, venueId } },
    });
    if (userClaim) {
      return NextResponse.json(
        { error: "You already have a claim for this venue", status: userClaim.status },
        { status: 409 }
      );
    }

    // Verification scoring
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    let score = 0;
    const checks: string[] = [];

    // 1. Email domain matches venue website
    const emailDomain = user?.email?.split("@")[1];
    let websiteDomain: string | null = null;
    const websiteUrl = venue.website || businessUrl;
    if (websiteUrl) {
      try {
        websiteDomain = new URL(
          websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
        ).hostname.replace("www.", "");
      } catch {
        // Invalid URL
      }
    }

    if (emailDomain && websiteDomain && emailDomain === websiteDomain) {
      score += 4;
      checks.push("email_domain_match");
    }

    // 2. Business URL provided and matches venue website
    if (businessUrl && venue.website) {
      const normalizeUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/^www\./, "");
      if (normalizeUrl(businessUrl) === normalizeUrl(venue.website)) {
        score += 2;
        checks.push("website_match");
      }
    }

    // 3. Social link provided
    if (businessUrl && venue.socialLinks.some((link) => {
      const norm = (u: string) => u.toLowerCase().replace(/\/+$/, "");
      return norm(link.url) === norm(businessUrl);
    })) {
      score += 3;
      checks.push("social_link_match");
    }

    const autoApproved = score >= 4;

    const claim = await prisma.venueClaim.create({
      data: {
        userId: session.user.id,
        venueId,
        status: autoApproved ? "APPROVED" : "PENDING",
        proofUrl: businessUrl || null,
        proofNote: `Auto-verification: score=${score}, checks=[${checks.join(",")}]`,
        ...(autoApproved ? { reviewedBy: "system", reviewedAt: new Date() } : {}),
      },
    });

    if (autoApproved) {
      try {
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: "venue_claim_approved",
            title: "Venue Verified!",
            message: `Your claim for ${venue.name} has been automatically verified. Welcome to the venue dashboard!`,
            venueId,
          },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      claim,
      autoApproved,
      verificationScore: score,
      message: autoApproved
        ? "Your venue has been automatically verified!"
        : "Your claim has been submitted for manual review.",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Verification service unavailable" }, { status: 503 });
  }
}
