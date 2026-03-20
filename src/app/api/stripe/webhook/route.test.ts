import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ticketOrder: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ticketRefund: {
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { verifyWebhookSignature } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { POST } from "./route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature: string | null = "sig_test") {
  const headers = new Headers();
  if (signature !== null) {
    headers.set("stripe-signature", signature);
  }
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

function makeEvent(
  id: string,
  type: string,
  object: Record<string, unknown> = {}
) {
  return {
    id,
    type,
    data: { object },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: signature valid, event not yet seen
  vi.mocked(verifyWebhookSignature).mockResolvedValue({
    valid: true,
    event: makeEvent("evt_1", "checkout.session.completed", {}),
  });
  vi.mocked(prisma.stripeWebhookEvent.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.stripeWebhookEvent.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.stripeWebhookEvent.update).mockResolvedValue({} as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook", () => {
  // ── Signature verification ───────────────────────────────────────────────

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}", null));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing signature");
    expect(verifyWebhookSignature).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: false,
    });

    const res = await POST(makeRequest("bad-payload", "sig_bad"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid signature");
  });

  it("returns 400 when verifyWebhookSignature returns valid but no event", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: true,
      event: undefined,
    });

    const res = await POST(makeRequest("{}", "sig_test"));
    expect(res.status).toBe(400);
  });

  // ── Idempotency ──────────────────────────────────────────────────────────

  it("returns duplicate:true for already-processed events", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: true,
      event: makeEvent("evt_dup", "checkout.session.completed"),
    });
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockResolvedValue({
      stripeEventId: "evt_dup",
      processed: true,
      retryCount: 0,
    } as never);

    const res = await POST(makeRequest("{}", "sig_test"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.duplicate).toBe(true);
  });

  it("returns maxRetries:true when retry count is exceeded", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: true,
      event: makeEvent("evt_retry", "checkout.session.completed"),
    });
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockResolvedValue({
      stripeEventId: "evt_retry",
      processed: false,
      retryCount: 5,
    } as never);

    const res = await POST(makeRequest("{}", "sig_test"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.maxRetries).toBe(true);
  });

  it("continues processing even when idempotency check throws", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: true,
      event: makeEvent("evt_err", "some.unknown.event"),
    });
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockRejectedValue(
      new Error("DB down")
    );

    const res = await POST(makeRequest("{}", "sig_test"));
    const data = await res.json();

    // Should succeed — unknown event type is still acknowledged
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
  });

  // ── Unhandled event type ─────────────────────────────────────────────────

  it("acknowledges unhandled event types gracefully", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue({
      valid: true,
      event: makeEvent("evt_unknown", "some.random.event"),
    });

    const res = await POST(makeRequest("{}", "sig_test"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.success).toBe(true);
  });

  // ── checkout.session.completed ─────────────────────────────────────────

  describe("checkout.session.completed", () => {
    it("creates subscription for subscription-mode checkout", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_cs_sub", "checkout.session.completed", {
          id: "cs_123",
          mode: "subscription",
          subscription: "sub_123",
          customer: "cus_123",
          client_reference_id: "user-1",
          metadata: { plan: "FAN_PRO", userId: "user-1" },
        }),
      });
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          update: expect.objectContaining({
            stripeSubId: "sub_123",
            status: "ACTIVE",
          }),
        })
      );
    });

    it("completes ticket order for payment-mode checkout", async () => {
      const orderId = "order-abc-12345678";
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_cs_pay", "checkout.session.completed", {
          id: "cs_456",
          mode: "payment",
          payment_intent: "pi_789",
          customer: "cus_456",
          client_reference_id: "user-2",
          metadata: { userId: "user-2" },
        }),
      });
      vi.mocked(prisma.ticketOrder.findFirst).mockResolvedValue({
        id: orderId,
        ticketIds: ["t1", "t2"],
        total: 4500,
      } as never);
      vi.mocked(prisma.ticketOrder.update).mockResolvedValue({} as never);
      vi.mocked(prisma.ticket.updateMany).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        name: "Test User",
        email: "test@example.com",
      } as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.ticketOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({
            status: "completed",
            stripePaymentId: "pi_789",
          }),
        })
      );
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["t1", "t2"] } },
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("Order Confirmed"),
        })
      );
    });

    it("returns success:false when userId is missing from session", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_cs_noid", "checkout.session.completed", {
          id: "cs_no_user",
          mode: "subscription",
          subscription: "sub_999",
          customer: "cus_999",
          metadata: {},
        }),
      });

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      // The handler returns success: false but the route still returns 200
      // because it wraps the result, not a thrown error
      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
    });

    it("skips email when user has no email", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_cs_noemail", "checkout.session.completed", {
          id: "cs_noemail",
          mode: "payment",
          payment_intent: "pi_ne",
          client_reference_id: "user-3",
          metadata: { userId: "user-3" },
        }),
      });
      vi.mocked(prisma.ticketOrder.findFirst).mockResolvedValue({
        id: "order-ne",
        ticketIds: [],
        total: 0,
      } as never);
      vi.mocked(prisma.ticketOrder.update).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        name: "No Email",
        email: null,
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      expect(res.status).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // ── payment_intent.succeeded ───────────────────────────────────────────

  describe("payment_intent.succeeded", () => {
    it("marks pending orders as completed", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_pi_ok", "payment_intent.succeeded", {
          id: "pi_success",
          metadata: { userId: "user-1" },
        }),
      });
      vi.mocked(prisma.ticketOrder.updateMany).mockResolvedValue({
        count: 1,
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.ticketOrder.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentId: "pi_success", status: "pending" },
        data: { status: "completed" },
      });
    });
  });

  // ── payment_intent.payment_failed ──────────────────────────────────────

  describe("payment_intent.payment_failed", () => {
    it("marks orders as failed and notifies user", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_pi_fail", "payment_intent.payment_failed", {
          id: "pi_fail",
          metadata: { userId: "user-1" },
          last_payment_error: { message: "Card declined" },
        }),
      });
      vi.mocked(prisma.ticketOrder.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.ticketOrder.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentId: "pi_fail", status: "pending" },
        data: { status: "failed" },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            type: "payment_failed",
          }),
        })
      );
    });

    it("does not create notification when userId is missing", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_pi_fail2", "payment_intent.payment_failed", {
          id: "pi_fail2",
          metadata: {},
        }),
      });
      vi.mocked(prisma.ticketOrder.updateMany).mockResolvedValue({
        count: 0,
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      expect(res.status).toBe(200);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ── charge.refunded ────────────────────────────────────────────────────

  describe("charge.refunded", () => {
    it("processes refund and updates ticket status when fully refunded", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_refund", "charge.refunded", {
          id: "ch_123",
          payment_intent: "pi_123",
          amount_refunded: 5000,
          refunded: true,
          refunds: {
            data: [{ id: "re_123", amount: 5000, status: "succeeded" }],
          },
        }),
      });
      vi.mocked(prisma.ticketRefund.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([
        { id: "t1", userId: "user-1" },
      ] as never);
      vi.mocked(prisma.ticket.update).mockResolvedValue({} as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "REFUNDED" },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            type: "refund_completed",
          }),
        })
      );
    });

    it("does not update tickets when charge is not fully refunded", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_partial_refund", "charge.refunded", {
          id: "ch_456",
          payment_intent: "pi_456",
          amount_refunded: 2500,
          refunded: false,
          refunds: {
            data: [{ id: "re_456", amount: 2500, status: "succeeded" }],
          },
        }),
      });
      vi.mocked(prisma.ticketRefund.updateMany).mockResolvedValue({
        count: 1,
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      expect(res.status).toBe(200);
      expect(prisma.ticket.findMany).not.toHaveBeenCalled();
    });
  });

  // ── customer.subscription.created ──────────────────────────────────────

  describe("customer.subscription.created", () => {
    it("creates subscription when userId is in metadata", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_create", "customer.subscription.created", {
          id: "sub_new",
          customer: "cus_abc",
          status: "active",
          metadata: { userId: "user-1", plan: "FAN_PRO" },
          current_period_start: 1700000000,
          current_period_end: 1702592000,
        }),
      });
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        })
      );
    });

    it("falls back to lookup by customer ID when userId is missing", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_create2", "customer.subscription.created", {
          id: "sub_new2",
          customer: "cus_existing",
          status: "active",
          metadata: {},
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        userId: "user-found",
      } as never);
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeCustId: "cus_existing" },
        select: { userId: true },
      });
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-found" },
        })
      );
    });

    it("returns failure when user cannot be resolved", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_create3", "customer.subscription.created", {
          id: "sub_orphan",
          customer: "cus_unknown",
          status: "active",
          metadata: {},
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
    });
  });

  // ── customer.subscription.updated ──────────────────────────────────────

  describe("customer.subscription.updated", () => {
    it("updates subscription status and period end", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_upd", "customer.subscription.updated", {
          id: "sub_upd",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1702592000,
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "db_sub_1",
        userId: "user-1",
        stripeSubId: "sub_upd",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "db_sub_1" },
          data: expect.objectContaining({
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
          }),
        })
      );
    });

    it("sends notification when subscription is set to cancel at period end", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_cancel", "customer.subscription.updated", {
          id: "sub_cancel",
          status: "active",
          cancel_at_period_end: true,
          current_period_end: 1702592000,
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "db_sub_2",
        userId: "user-2",
        stripeSubId: "sub_cancel",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      expect(res.status).toBe(200);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-2",
            type: "subscription_cancelling",
          }),
        })
      );
    });

    it("maps past_due status correctly", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_pd", "customer.subscription.updated", {
          id: "sub_pd",
          status: "past_due",
          cancel_at_period_end: false,
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "db_sub_3",
        userId: "user-3",
        stripeSubId: "sub_pd",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      await POST(makeRequest("{}", "sig_test"));
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAST_DUE" }),
        })
      );
    });
  });

  // ── customer.subscription.deleted ──────────────────────────────────────

  describe("customer.subscription.deleted", () => {
    it("marks subscription as cancelled and notifies user", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_del", "customer.subscription.deleted", {
          id: "sub_del",
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "db_sub_del",
        userId: "user-del",
        stripeSubId: "sub_del",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "db_sub_del" },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-del",
            type: "subscription_cancelled",
          }),
        })
      );
    });

    it("succeeds even when subscription not found in DB", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_sub_del2", "customer.subscription.deleted", {
          id: "sub_ghost",
        }),
      });
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  // ── invoice.paid ───────────────────────────────────────────────────────

  describe("invoice.paid", () => {
    it("updates subscription period from invoice line items", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_inv_paid", "invoice.paid", {
          subscription: "sub_inv",
          lines: {
            data: [
              { period: { start: 1700000000, end: 1702592000 } },
            ],
          },
        }),
      });
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({
        count: 1,
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubId: "sub_inv" },
          data: expect.objectContaining({
            status: "ACTIVE",
            currentPeriodStart: new Date(1700000000 * 1000),
            currentPeriodEnd: new Date(1702592000 * 1000),
          }),
        })
      );
    });

    it("returns success immediately when no subscription ID", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_inv_nosub", "invoice.paid", {
          subscription: null,
        }),
      });

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── invoice.payment_failed ─────────────────────────────────────────────

  describe("invoice.payment_failed", () => {
    it("sets subscription to PAST_DUE and sends notification + email", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_inv_fail", "invoice.payment_failed", {
          subscription: "sub_fail",
        }),
      });
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        userId: "user-fail",
      } as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "fail@test.com",
        name: "Fail User",
      } as never);

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubId: "sub_fail" },
        data: { status: "PAST_DUE" },
      });
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "fail@test.com",
          subject: expect.stringContaining("Payment Failed"),
        })
      );
    });

    it("returns success immediately when no subscription ID", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_inv_fail2", "invoice.payment_failed", {
          subscription: null,
        }),
      });

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns 500 and retryable:true when event handler throws", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_boom", "checkout.session.completed", {
          id: "cs_boom",
          mode: "subscription",
          subscription: "sub_boom",
          customer: "cus_boom",
          client_reference_id: "user-boom",
          metadata: { plan: "FAN_PRO", userId: "user-boom" },
        }),
      });
      vi.mocked(prisma.subscription.upsert).mockRejectedValue(
        new Error("DB exploded")
      );

      const res = await POST(makeRequest("{}", "sig_test"));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.retryable).toBe(true);
    });

    it("records error on the webhook event when handler fails", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_errlog", "checkout.session.completed", {
          id: "cs_errlog",
          mode: "subscription",
          subscription: "sub_errlog",
          customer: "cus_errlog",
          client_reference_id: "user-errlog",
          metadata: { plan: "FAN_PRO", userId: "user-errlog" },
        }),
      });
      vi.mocked(prisma.subscription.upsert).mockRejectedValue(
        new Error("Constraint violation")
      );
      vi.mocked(prisma.stripeWebhookEvent.update).mockResolvedValue(
        {} as never
      );

      await POST(makeRequest("{}", "sig_test"));

      expect(prisma.stripeWebhookEvent.update).toHaveBeenCalledWith({
        where: { stripeEventId: "evt_errlog" },
        data: { lastError: "Constraint violation" },
      });
    });

    it("marks event as processed on success", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        valid: true,
        event: makeEvent("evt_mark", "some.unknown.event"),
      });

      await POST(makeRequest("{}", "sig_test"));

      expect(prisma.stripeWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeEventId: "evt_mark" },
          data: expect.objectContaining({
            processed: true,
            lastError: null,
          }),
        })
      );
    });
  });
});
