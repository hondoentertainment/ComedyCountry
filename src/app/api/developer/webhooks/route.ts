import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerWebhook, listWebhooks, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
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

    // Find the user's API keys
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { id: true },
    });

    if (apiKeys.length === 0) {
      return NextResponse.json({ webhooks: [] });
    }

    const apiKeyIds = apiKeys.map((k) => k.id);

    // Get webhooks for all of the user's API keys
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { apiKeyId: { in: apiKeyIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ webhooks });
  } catch (error) {
    logger.error(
      "GET /api/developer/webhooks error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { url, events, apiKeyId } = body;

    // Validate URL format
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "url must use http or https protocol" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "url must be a valid URL" },
        { status: 400 },
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events must be a non-empty array" },
        { status: 400 },
      );
    }

    const validEvents = WEBHOOK_EVENTS as readonly string[];
    const invalidEvents = events.filter(
      (e: string) => !validEvents.includes(e),
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate API key ownership
    if (!apiKeyId) {
      return NextResponse.json(
        { error: "apiKeyId is required" },
        { status: 400 },
      );
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId: session.user.id, isActive: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const webhook = await registerWebhook(apiKeyId, url, events);

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    logger.error(
      "POST /api/developer/webhooks error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
