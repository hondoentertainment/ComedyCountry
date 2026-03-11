import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;

  if (!token) {
    return NextResponse.json(
      { error: "Transfer token is required" },
      { status: 400 }
    );
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  // Find the transfer by token
  const transfer = await prisma.ticketTransfer.findUnique({
    where: { token },
    include: {
      ticket: true,
    },
  });

  if (!transfer) {
    return NextResponse.json(
      { error: "Transfer not found" },
      { status: 404 }
    );
  }

  if (transfer.status !== "pending") {
    return NextResponse.json(
      { error: `Transfer already ${transfer.status}` },
      { status: 400 }
    );
  }

  // Check expiry
  if (new Date() > transfer.expiresAt) {
    await prisma.ticketTransfer.update({
      where: { id: transfer.id },
      data: { status: "expired" },
    });
    return NextResponse.json(
      { error: "Transfer has expired" },
      { status: 400 }
    );
  }

  if (action === "decline") {
    const declined = await prisma.ticketTransfer.update({
      where: { id: transfer.id },
      data: { status: "declined" },
    });
    return NextResponse.json(declined);
  }

  // Accept: update ticket ownership and mark transfer as accepted
  const result = await prisma.$transaction(async (tx) => {
    // Update the original ticket ownership
    await tx.ticket.update({
      where: { id: transfer.ticketId },
      data: {
        userId: session.user.id,
        transferredTo: session.user.email,
        giftMessage: transfer.message,
        // Generate a new QR code for security
        qrCode: crypto.randomUUID(),
      },
    });

    // Mark transfer as accepted
    return tx.ticketTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "accepted",
        toUserId: session.user.id,
        acceptedAt: new Date(),
      },
      include: {
        ticket: {
          include: {
            event: { include: { venue: true } },
            ticketType: true,
          },
        },
      },
    });
  });

  return NextResponse.json(result);
}
