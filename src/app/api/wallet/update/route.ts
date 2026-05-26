import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updatePassStatus,
  voidWalletPass,
  generateApplePassPayload,
  generateGooglePassPayload,
} from "@/lib/wallet-passes";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * PATCH /api/wallet/update
 *
 * Update a wallet pass when event details change (date, venue, etc.)
 * or update pass status (void, expire).
 */
export async function PATCH(request: NextRequest) {
  const rl = await checkRateLimit(`wallet-update:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serialNumber, action } = body;

    if (!serialNumber || typeof serialNumber !== "string") {
      return NextResponse.json(
        { error: "serialNumber is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const pass = await prisma.walletPass.findUnique({
      where: { serialNumber },
    });

    if (!pass) {
      return NextResponse.json(
        { error: "Wallet pass not found" },
        { status: 404 },
      );
    }

    if (pass.userId !== session.user.id) {
      // Allow admins to update any pass
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (user?.role !== "admin") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    if (action === "void") {
      const voided = await voidWalletPass(serialNumber);
      return NextResponse.json(voided);
    }

    if (action === "refresh") {
      // Regenerate the pass payload with latest event data
      const ticket = await prisma.ticket.findUnique({
        where: { id: pass.ticketId },
        include: {
          event: {
            include: { venue: true },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: "Associated ticket not found" },
          { status: 404 },
        );
      }

      const payload =
        pass.platform === "apple"
          ? generateApplePassPayload(ticket, ticket.event, ticket.event.venue)
          : generateGooglePassPayload(ticket, ticket.event, ticket.event.venue);

      const updated = await prisma.walletPass.update({
        where: { serialNumber },
        data: { lastUpdated: new Date() },
      });

      return NextResponse.json({ ...updated, payload });
    }

    if (action === "update_status" && body.status) {
      const updated = await updatePassStatus(serialNumber, body.status);
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      {
        error: "Invalid action. Must be 'void', 'refresh', or 'update_status'",
      },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error) {
      const clientErrors = ["Wallet pass not found", "Pass is already voided"];
      if (clientErrors.includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.startsWith("Invalid status")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    logger.error(
      "PATCH /api/wallet/update error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update wallet pass" },
      { status: 500 },
    );
  }
}
