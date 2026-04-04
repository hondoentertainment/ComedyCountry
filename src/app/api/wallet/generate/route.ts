import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWalletPass } from "@/lib/wallet-passes";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/wallet/generate
 *
 * Generate a wallet pass (Apple or Google) for a ticket.
 * Verifies ticket ownership before generating.
 */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(
    `wallet-generate:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ticketId, platform } = body;

    if (!ticketId || typeof ticketId !== "string") {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 },
      );
    }

    if (!platform || !["apple", "google"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be 'apple' or 'google'" },
        { status: 400 },
      );
    }

    // Verify ticket ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { userId: true, status: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to generate pass for this ticket" },
        { status: 403 },
      );
    }

    if (ticket.status !== "VALID") {
      return NextResponse.json(
        {
          error: `Cannot generate pass for ticket with status: ${ticket.status}`,
        },
        { status: 400 },
      );
    }

    // Check if a pass already exists for this ticket+platform
    const existingPass = await prisma.walletPass.findFirst({
      where: {
        ticketId,
        platform,
        userId: session.user.id,
        status: "active",
      },
    });

    if (existingPass) {
      return NextResponse.json({
        ...existingPass,
        message: "Pass already exists for this ticket",
      });
    }

    const pass = await generateWalletPass(session.user.id, ticketId, platform);

    return NextResponse.json(pass, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Ticket not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    logger.error(
      "POST /api/wallet/generate error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to generate wallet pass" },
      { status: 500 },
    );
  }
}
