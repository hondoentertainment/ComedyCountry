import { randomBytes, createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/* ─── Valid webhook event types ───────────────────────────────────────── */

export const WEBHOOK_EVENTS = [
  "event.created",
  "event.updated",
  "event.cancelled",
  "ticket.sold",
  "ticket.refunded",
  "review.posted",
  "comedian.added",
  "venue.updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

/* ─── Register a new webhook endpoint ─────────────────────────────────── */

export async function registerWebhook(
  apiKeyId: string,
  url: string,
  events: string[],
) {
  const secret = `whsec_${randomBytes(32).toString("hex")}`;

  return prisma.webhookEndpoint.create({
    data: {
      apiKeyId,
      url,
      events,
      secret,
    },
  });
}

/* ─── List webhooks for an API key ────────────────────────────────────── */

export async function listWebhooks(apiKeyId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { apiKeyId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Delete a webhook (validates ownership) ──────────────────────────── */

export async function deleteWebhook(id: string, apiKeyId: string) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
  });

  if (!endpoint) {
    throw new Error("Webhook endpoint not found");
  }

  if (endpoint.apiKeyId !== apiKeyId) {
    throw new Error("Not authorized to delete this webhook");
  }

  return prisma.webhookEndpoint.delete({ where: { id } });
}

/* ─── Dispatch a webhook event to all subscribed endpoints ────────────── */

export async function dispatchWebhook(eventType: string, payload: object) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      active: true,
      events: { has: eventType },
    },
  });

  const deliveries = [];

  for (const endpoint of endpoints) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event: eventType,
        payload: JSON.stringify(payload),
      },
    });
    deliveries.push(delivery);
  }

  return deliveries;
}

/* ─── Sign a payload with HMAC-SHA256 ─────────────────────────────────── */

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/* ─── Deliver a webhook (HTTP POST with signed payload) ───────────────── */

export async function deliverWebhook(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });

  if (!delivery) {
    throw new Error("Webhook delivery not found");
  }

  const signature = signPayload(delivery.payload, delivery.endpoint.secret);

  try {
    const response = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Delivery": delivery.id,
      },
      body: delivery.payload,
    });

    const responseBody = await response.text();

    return prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        statusCode: response.status,
        responseBody: responseBody.slice(0, 1000),
        success: response.ok,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
      },
    });
  } catch (err) {
    return prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        statusCode: null,
        responseBody: err instanceof Error ? err.message : "Unknown error",
        success: false,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
      },
    });
  }
}

/* ─── Get webhook deliveries for an endpoint ──────────────────────────── */

export async function getWebhookDeliveries(
  endpointId: string,
  { take = 20, skip = 0 }: { take?: number; skip?: number } = {},
) {
  return prisma.webhookDelivery.findMany({
    where: { endpointId },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}
