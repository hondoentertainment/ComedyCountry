import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/comedian-claim/verify
 *
 * Automated self-service verification for comedian claims.
 * Checks if the user's connected social accounts match a comedian's social links.
 *
 * Body: { comedianId, socialProof: { platform, handle, profileUrl } }
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`comedian-claim-verify:${getRateLimitKey(request)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { comedianId, socialProof } = body;

  if (!comedianId || !socialProof?.platform || !socialProof?.profileUrl) {
    return NextResponse.json({ error: "comedianId and socialProof required" }, { status: 400 });
  }

  try {
    // Get the comedian and their social links
    const comedian = await prisma.comedian.findUnique({
      where: { id: comedianId },
      include: {
        socialLinks: true,
      },
    });

    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    // Check if already claimed
    const existingClaim = await prisma.comedianClaim.findFirst({
      where: { comedianId, status: "APPROVED" },
    });
    if (existingClaim) {
      return NextResponse.json({ error: "This comedian is already claimed" }, { status: 409 });
    }

    // Check if user already has a pending/approved claim
    const userClaim = await prisma.comedianClaim.findUnique({
      where: { userId_comedianId: { userId: session.user.id, comedianId } },
    });
    if (userClaim) {
      return NextResponse.json({ error: "You already have a claim for this comedian", status: userClaim.status }, { status: 409 });
    }

    // --- Automated verification logic ---
    // Check if the social proof URL matches any of the comedian's known social links
    const proofUrl = socialProof.profileUrl.toLowerCase().replace(/\/+$/, "");
    const matchedLink = comedian.socialLinks.find((link) => {
      const knownUrl = link.url.toLowerCase().replace(/\/+$/, "");
      return (
        link.platform.toLowerCase() === socialProof.platform.toLowerCase() &&
        (knownUrl === proofUrl || knownUrl.includes(socialProof.handle?.toLowerCase() || "___never___"))
      );
    });

    // Check if the user's OAuth account matches (e.g. connected Twitter/GitHub)
    const userAccounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true, providerAccountId: true },
    });

    const oauthMatch = userAccounts.some(
      (acc) => acc.provider.toLowerCase() === socialProof.platform.toLowerCase(),
    );

    // Also check if user's email domain matches comedian's website
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    const emailDomain = user?.email?.split("@")[1];
    const websiteDomain = comedian.website
      ? new URL(comedian.website.startsWith("http") ? comedian.website : `https://${comedian.website}`).hostname.replace("www.", "")
      : null;
    const domainMatch = emailDomain && websiteDomain && emailDomain === websiteDomain;

    // Determine verification level
    const verificationScore = (matchedLink ? 3 : 0) + (oauthMatch ? 2 : 0) + (domainMatch ? 3 : 0);
    const autoApproved = verificationScore >= 3;

    // Create the claim
    const claim = await prisma.comedianClaim.create({
      data: {
        userId: session.user.id,
        comedianId,
        status: autoApproved ? "APPROVED" : "PENDING",
        proofUrl: socialProof.profileUrl,
        proofNote: `Auto-verification: score=${verificationScore}, social=${!!matchedLink}, oauth=${oauthMatch}, domain=${!!domainMatch}`,
        ...(autoApproved ? { reviewedBy: "system", reviewedAt: new Date() } : {}),
      },
    });

    // If auto-approved, create notification
    if (autoApproved) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "claim_approved",
          title: "Profile Verified!",
          message: `Your claim for ${comedian.name} has been automatically verified. Welcome to the comedian dashboard!`,
          comedianId,
        },
      });
    }

    return NextResponse.json({
      claim,
      autoApproved,
      verificationScore,
      message: autoApproved
        ? "Your profile has been automatically verified!"
        : "Your claim has been submitted for manual review. We'll notify you once it's processed.",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Verification service unavailable" }, { status: 503 });
  }
}
