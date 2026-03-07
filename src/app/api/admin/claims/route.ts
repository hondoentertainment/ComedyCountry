import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { claimId, action } = body;

  if (!claimId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

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
      reviewedBy: session.user.id,
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
}
