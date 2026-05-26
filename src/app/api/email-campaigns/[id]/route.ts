import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const rl = await checkRateLimit(
    `email-campaigns:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["send", "schedule"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'send' or 'schedule'" },
        { status: 400 },
      );
    }

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status === "sent") {
      return NextResponse.json(
        { error: "Campaign already sent" },
        { status: 400 },
      );
    }

    if (action === "send") {
      const updated = await prisma.emailCampaign.update({
        where: { id },
        data: { status: "sent", sentAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    // schedule
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: { status: "scheduled" },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(
      "POST /api/email-campaigns/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process campaign" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const rl = await checkRateLimit(
    `email-campaigns:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft campaigns can be deleted" },
        { status: 400 },
      );
    }

    await prisma.emailCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "DELETE /api/email-campaigns/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 },
    );
  }
}
