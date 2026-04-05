import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWebhookDeliveries } from "@/lib/webhooks";
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

    const { searchParams } = new URL(request.url);
    const take = Math.min(parseInt(searchParams.get("take") ?? "20", 10), 100);
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const event = searchParams.get("event") ?? undefined;
    const success = searchParams.get("success");

    // If filtering by event or success, query directly instead of using the helper
    if (event || success !== null) {
      const where: Record<string, unknown> = { endpointId: id };
      if (event) where.event = event;
      if (success === "true") where.success = true;
      if (success === "false") where.success = false;

      const deliveries = await prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      });

      const total = await prisma.webhookDelivery.count({ where });

      return NextResponse.json({ deliveries, total, take, skip });
    }

    const deliveries = await getWebhookDeliveries(id, { take, skip });

    const total = await prisma.webhookDelivery.count({
      where: { endpointId: id },
    });

    return NextResponse.json({ deliveries, total, take, skip });
  } catch (error) {
    logger.error(
      "GET /api/developer/webhooks/[id]/deliveries error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch deliveries" },
      { status: 500 },
    );
  }
}
