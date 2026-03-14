import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  dispatchWebhook,
  signPayload,
  getWebhookDeliveries,
  WEBHOOK_EVENTS,
} from "./webhooks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEndpoint: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  webhookEndpoint: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  webhookDelivery: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── WEBHOOK_EVENTS ────────────────────────────────────────────── */

  describe("WEBHOOK_EVENTS", () => {
    it("contains expected event types", () => {
      expect(WEBHOOK_EVENTS).toContain("event.created");
      expect(WEBHOOK_EVENTS).toContain("ticket.sold");
      expect(WEBHOOK_EVENTS).toContain("review.posted");
      expect(WEBHOOK_EVENTS).toContain("event.updated");
      expect(WEBHOOK_EVENTS).toContain("event.cancelled");
      expect(WEBHOOK_EVENTS).toContain("ticket.refunded");
      expect(WEBHOOK_EVENTS.length).toBeGreaterThanOrEqual(6);
    });
  });

  /* ── registerWebhook ───────────────────────────────────────────── */

  describe("registerWebhook", () => {
    it("creates endpoint with generated secret", async () => {
      const endpoint = {
        id: "wh1",
        apiKeyId: "ak1",
        url: "https://example.com/webhook",
        events: ["event.created"],
        secret: "generated-secret",
        active: true,
      };
      mockPrisma.webhookEndpoint.create.mockResolvedValue(endpoint);

      const result = await registerWebhook(
        "ak1",
        "https://example.com/webhook",
        ["event.created"]
      );

      expect(result).toEqual(endpoint);
      expect(mockPrisma.webhookEndpoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: "ak1",
          url: "https://example.com/webhook",
          events: ["event.created"],
          secret: expect.stringMatching(/^whsec_[a-f0-9]{64}$/),
        }),
      });
    });
  });

  /* ── listWebhooks ──────────────────────────────────────────────── */

  describe("listWebhooks", () => {
    it("returns endpoints for developer key", async () => {
      const endpoints = [
        { id: "wh1", apiKeyId: "ak1", url: "https://a.com/hook" },
        { id: "wh2", apiKeyId: "ak1", url: "https://b.com/hook" },
      ];
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const result = await listWebhooks("ak1");

      expect(result).toEqual(endpoints);
      expect(mockPrisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: { apiKeyId: "ak1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  /* ── deleteWebhook ─────────────────────────────────────────────── */

  describe("deleteWebhook", () => {
    it("throws when endpoint not found", async () => {
      mockPrisma.webhookEndpoint.findUnique.mockResolvedValue(null);

      await expect(deleteWebhook("wh1", "ak1")).rejects.toThrow(
        "Webhook endpoint not found"
      );
      expect(mockPrisma.webhookEndpoint.delete).not.toHaveBeenCalled();
    });

    it("throws when ownership is invalid", async () => {
      mockPrisma.webhookEndpoint.findUnique.mockResolvedValue({
        id: "wh1",
        apiKeyId: "other-key",
      });

      await expect(deleteWebhook("wh1", "ak1")).rejects.toThrow(
        "Not authorized"
      );
      expect(mockPrisma.webhookEndpoint.delete).not.toHaveBeenCalled();
    });

    it("deletes webhook when ownership is valid", async () => {
      const endpoint = { id: "wh1", apiKeyId: "ak1" };
      mockPrisma.webhookEndpoint.findUnique.mockResolvedValue(endpoint);
      mockPrisma.webhookEndpoint.delete.mockResolvedValue(endpoint);

      const result = await deleteWebhook("wh1", "ak1");

      expect(result).toEqual(endpoint);
      expect(mockPrisma.webhookEndpoint.findUnique).toHaveBeenCalledWith({
        where: { id: "wh1" },
      });
      expect(mockPrisma.webhookEndpoint.delete).toHaveBeenCalledWith({
        where: { id: "wh1" },
      });
    });
  });

  /* ── dispatchWebhook ───────────────────────────────────────────── */

  describe("dispatchWebhook", () => {
    it("creates delivery records for subscribed endpoints", async () => {
      const endpoints = [
        { id: "wh1", url: "https://a.com/hook", secret: "s1", events: ["event.created"] },
        { id: "wh2", url: "https://b.com/hook", secret: "s2", events: ["event.created"] },
      ];
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      mockPrisma.webhookDelivery.create
        .mockResolvedValueOnce({ id: "d1", endpointId: "wh1" })
        .mockResolvedValueOnce({ id: "d2", endpointId: "wh2" });

      const payload = { id: "e1", name: "Comedy Night" };
      const result = await dispatchWebhook("event.created", payload);

      expect(result).toHaveLength(2);
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: {
          endpointId: "wh1",
          event: "event.created",
          payload: JSON.stringify(payload),
        },
      });
    });

    it("skips inactive endpoints", async () => {
      // The query filters by active: true, so inactive endpoints won't be returned
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);

      const result = await dispatchWebhook("event.created", { id: "e1" });

      expect(result).toHaveLength(0);
      expect(mockPrisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          events: { has: "event.created" },
        },
      });
      expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
    });
  });

  /* ── signPayload ───────────────────────────────────────────────── */

  describe("signPayload", () => {
    it("produces consistent HMAC-SHA256 signatures", () => {
      const payload = '{"test": true}';
      const secret = "test-secret";

      const sig1 = signPayload(payload, secret);
      const sig2 = signPayload(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different signatures for different secrets", () => {
      const payload = '{"test": true}';

      const sig1 = signPayload(payload, "secret-a");
      const sig2 = signPayload(payload, "secret-b");

      expect(sig1).not.toBe(sig2);
    });
  });

  /* ── getWebhookDeliveries ──────────────────────────────────────── */

  describe("getWebhookDeliveries", () => {
    it("returns deliveries for endpoint with defaults", async () => {
      const deliveries = [{ id: "d1", event: "event.created" }];
      mockPrisma.webhookDelivery.findMany.mockResolvedValue(deliveries);

      const result = await getWebhookDeliveries("wh1");

      expect(result).toEqual(deliveries);
      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { endpointId: "wh1" },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
      });
    });

    it("respects take and skip options", async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([]);

      await getWebhookDeliveries("wh1", { take: 5, skip: 10 });

      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { endpointId: "wh1" },
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 10,
      });
    });
  });
});
