import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteWebhook, getWebhookDeliveries } from "@/lib/webhooks";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rl = await checkRateLimit(
    `developer-webhooks:${getRateLimitKey(request)}`,
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

    const { id } = params;

    // Find the webhook and verify ownership through API key
    const webhook = await prisma.webhookEndpoint.findUnique({
      where: { id },
      include: { apiKey: { select: { userId: true } } },
    });

    if (!webhook || webhook.apiKey.userId !== session.user.id) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const deliveries = await getWebhookDeliveries(id, { take: 20 });

    return NextResponse.json({ webhook, deliveries });
  } catch (error) {
    logger.error(
      "GET /api/developer/webhooks/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rl = await checkRateLimit(
    `developer-webhooks:${getRateLimitKey(request)}`,
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

    const { id } = params;

    // Find the webhook and verify ownership through API key
    const webhook = await prisma.webhookEndpoint.findUnique({
      where: { id },
      include: { apiKey: { select: { userId: true } } },
    });

    if (!webhook || webhook.apiKey.userId !== session.user.id) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await deleteWebhook(id, webhook.apiKeyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "DELETE /api/developer/webhooks/[id] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}
