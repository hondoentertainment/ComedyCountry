import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const body = await request.json();
  const { claimId, action } = body;

  if (!claimId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const claim = await prisma.comedianClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (claim.status !== "PENDING") {
      return NextResponse.json({ error: "Claim already resolved" }, { status: 409 });
    }

    const updated = await prisma.comedianClaim.update({
      where: { id: claimId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedBy: auth.session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, create a notification for the user
    if (action === "approve") {
      const comedian = await prisma.comedian.findUnique({
        where: { id: claim.comedianId },
        select: { name: true },
      });
      await prisma.notification.create({
        data: {
          userId: claim.userId,
          type: "claim_approved",
          title: "Profile Claimed!",
          message: `Your claim for ${comedian?.name ?? "comedian"} has been approved. You now have access to the comedian dashboard.`,
          comedianId: claim.comedianId,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Claims service unavailable" }, { status: 503 });
  }
}
