import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    promoCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticketOrder: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/fair-ticketing", () => ({
  enforcePurchaseLimits: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mockPrisma = prisma as unknown as {
  event: { findUnique: ReturnType<typeof vi.fn> };
  promoCode: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticketOrder: {
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function createPostRequest(body: unknown, url = "http://localhost/api/checkout/session") {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createInvalidJsonRequest() {
  return new Request("http://localhost/api/checkout/session", {
    method: "POST",
    body: "not-json{{{",
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to build a mock event with sensible defaults
function buildMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    title: "Comedy Night",
    date: new Date(Date.now() + 86400000), // tomorrow
    showtime: "8:00 PM",
    venue: { id: "venue-1", name: "Laugh Lounge", state: "NY" },
    ticketTypes: [
      {
        id: "tt-1",
        name: "General Admission",
        price: new Decimal("25.00"),
        capacity: 100,
        sold: 10,
        saleStart: null,
        saleEnd: null,
      },
    ],
    comedians: [{ comedian: { name: "Jane Doe" } }],
    fairPricePolicy: null,
    ...overrides,
  };
}

// Default transaction result
function buildTransactionResult() {
  return {
    order: {
      id: "order-1",
      createdAt: new Date("2026-01-15T00:00:00Z"),
    },
    tickets: [
      {
        id: "ticket-1",
        qrCode: "qr-uuid-1",
        ticketTypeName: "General Admission",
        purchasePrice: 25,
      },
    ],
  };
}

describe("POST /api/checkout/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "buyer@example.com", name: "Buyer" },
      expires: "",
    });
    // Default: event exists and is valid
    mockPrisma.event.findUnique.mockResolvedValue(buildMockEvent());
    // Default: transaction succeeds
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        ticketType: {
          findUnique: vi.fn().mockResolvedValue({
            id: "tt-1",
            sold: 10,
            capacity: 100,
          }),
          update: vi.fn(),
        },
        ticket: {
          create: vi.fn().mockResolvedValue({
            id: "ticket-1",
            qrCode: "qr-uuid-1",
          }),
        },
        ticketOrder: {
          create: vi.fn().mockResolvedValue({
            id: "order-1",
            createdAt: new Date("2026-01-15T00:00:00Z"),
          }),
        },
      };
      return fn(tx);
    });
    mockPrisma.ticketOrder.update.mockResolvedValue({});
    // No Stripe key by default
    delete process.env.STRIPE_SECRET_KEY;
  });

  // ── Authentication ──────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(createPostRequest({ eventId: "event-1", items: [{ ticketTypeId: "tt-1", quantity: 1 }] }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no email", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", name: "No Email" },
      expires: "",
    });

    const res = await POST(createPostRequest({ eventId: "event-1", items: [{ ticketTypeId: "tt-1", quantity: 1 }] }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ── Request Validation ──────────────────────────────────────────────────

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(createInvalidJsonRequest());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON");
  });

  it("returns 400 when eventId is missing", async () => {
    const res = await POST(createPostRequest({ items: [{ ticketTypeId: "tt-1", quantity: 1 }] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("eventId and items are required");
  });

  it("returns 400 when items is missing", async () => {
    const res = await POST(createPostRequest({ eventId: "event-1" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("eventId and items are required");
  });

  it("returns 400 when items is empty", async () => {
    const res = await POST(createPostRequest({ eventId: "event-1", items: [] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("eventId and items are required");
  });

  // ── Event Validation ────────────────────────────────────────────────────

  it("returns 404 when event is not found", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ eventId: "bad-id", items: [{ ticketTypeId: "tt-1", quantity: 1 }] }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Event not found");
  });

  it("returns 400 when event has already occurred", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({ date: new Date(Date.now() - 86400000) })
    );

    const res = await POST(createPostRequest({ eventId: "event-1", items: [{ ticketTypeId: "tt-1", quantity: 1 }] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("This event has already occurred");
  });

  // ── Cart Item Validation ────────────────────────────────────────────────

  it("returns 400 when item has no ticketTypeId", async () => {
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Each item must have ticketTypeId and quantity >= 1");
  });

  it("returns 400 when item has quantity < 1", async () => {
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 0 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Each item must have ticketTypeId and quantity >= 1");
  });

  it("returns 400 when ticket type is not found for event", async () => {
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "nonexistent-tt", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Ticket type nonexistent-tt not found for this event");
  });

  it("returns 400 when tickets are not on sale yet", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        ticketTypes: [
          {
            id: "tt-1",
            name: "General Admission",
            price: new Decimal("25.00"),
            capacity: 100,
            sold: 0,
            saleStart: new Date(Date.now() + 86400000 * 7), // a week from now
            saleEnd: null,
          },
        ],
      })
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("General Admission tickets are not on sale yet");
  });

  it("returns 400 when ticket sales have ended", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        ticketTypes: [
          {
            id: "tt-1",
            name: "VIP",
            price: new Decimal("50.00"),
            capacity: 100,
            sold: 0,
            saleStart: null,
            saleEnd: new Date(Date.now() - 86400000), // yesterday
          },
        ],
      })
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("VIP ticket sales have ended");
  });

  it("returns 400 when requested quantity exceeds availability", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        ticketTypes: [
          {
            id: "tt-1",
            name: "General Admission",
            price: new Decimal("25.00"),
            capacity: 100,
            sold: 98,
            saleStart: null,
            saleEnd: null,
          },
        ],
      })
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 5 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Only 2 General Admission tickets available");
  });

  // ── Anti-Scalping ───────────────────────────────────────────────────────

  it("returns 400 when anti-scalping purchase limit is exceeded", async () => {
    const { enforcePurchaseLimits } = await import("@/lib/fair-ticketing");

    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        fairPricePolicy: { antiScalpingEnabled: true },
      })
    );

    vi.mocked(enforcePurchaseLimits).mockResolvedValue({
      allowed: false,
      reason: "Purchase limit of 4 tickets exceeded",
    } as any);

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 2 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Purchase limit of 4 tickets exceeded");
  });

  it("allows purchase when anti-scalping check passes", async () => {
    const { enforcePurchaseLimits } = await import("@/lib/fair-ticketing");

    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        fairPricePolicy: { antiScalpingEnabled: true },
      })
    );

    vi.mocked(enforcePurchaseLimits).mockResolvedValue({
      allowed: true,
      reason: null,
    } as any);

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 2 }],
    }));

    expect(res.status).toBe(201);
  });

  // ── Promo Code ──────────────────────────────────────────────────────────

  it("returns 400 when promo code is not found", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "BADCODE",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Promo code not found");
  });

  it("returns 400 when promo code is inactive", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "INACTIVE",
      isActive: false,
      expiresAt: null,
      maxUses: null,
      currentUses: 0,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "INACTIVE",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Promo code is no longer active");
  });

  it("returns 400 when promo code has expired", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "EXPIRED",
      isActive: true,
      expiresAt: new Date(Date.now() - 86400000),
      maxUses: null,
      currentUses: 0,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "EXPIRED",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Promo code has expired");
  });

  it("returns 400 when promo code usage limit is reached", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "MAXEDOUT",
      isActive: true,
      expiresAt: null,
      maxUses: 5,
      currentUses: 5,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "MAXEDOUT",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Promo code usage limit reached");
  });

  it("returns 400 when promo code minimum purchase not met", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "MINPURCHASE",
      isActive: true,
      expiresAt: null,
      maxUses: null,
      currentUses: 0,
      minPurchase: new Decimal("100.00"),
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }], // $25 subtotal
      promoCode: "MINPURCHASE",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Minimum purchase of $100.00 required");
  });

  it("returns 400 when promo code is not valid for this event", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "OTHEREVENT",
      isActive: true,
      expiresAt: null,
      maxUses: null,
      currentUses: 0,
      minPurchase: null,
      applicableEventIds: ["event-999"],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "OTHEREVENT",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Promo code is not valid for this event");
  });

  // ── Successful Checkout (non-Stripe) ────────────────────────────────────

  it("returns 201 with order confirmation on successful checkout", async () => {
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.orderId).toBe("order-1");
    expect(data.tickets).toHaveLength(1);
    expect(data.tickets[0].ticketTypeName).toBe("General Admission");
    expect(data.tickets[0].eventTitle).toBe("Comedy Night");
    expect(data.tickets[0].venueName).toBe("Laugh Lounge");
    expect(data.subtotal).toBe(25);
    expect(data.customerEmail).toBe("buyer@example.com");
    expect(data.stripePaymentId).toBeNull();
  });

  it("marks order as completed when Stripe is not configured", async () => {
    await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));

    expect(mockPrisma.ticketOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "completed" },
    });
  });

  it("applies percentage promo code and reduces total", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "SAVE10",
      isActive: true,
      expiresAt: null,
      maxUses: null,
      currentUses: 0,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 2 }],
      promoCode: "SAVE10",
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    // Subtotal = 2 * 25 = 50
    // Discount = 10% of 50 = 5
    expect(data.subtotal).toBe(50);
    expect(data.discount).toBe(5);
    expect(data.promoCode).toBe("SAVE10");
  });

  it("applies flat-amount promo code discount", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "FLAT5",
      isActive: true,
      expiresAt: null,
      maxUses: null,
      currentUses: 0,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "fixed",
      discountValue: new Decimal("5.00"),
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "FLAT5",
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.discount).toBe(5);
  });

  it("increments promo code usage after successful checkout", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue({
      code: "SAVE10",
      isActive: true,
      expiresAt: null,
      maxUses: null,
      currentUses: 3,
      minPurchase: null,
      applicableEventIds: [],
      discountType: "percentage",
      discountValue: new Decimal("10"),
    });
    mockPrisma.promoCode.update.mockResolvedValue({});

    await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
      promoCode: "SAVE10",
    }));

    expect(mockPrisma.promoCode.update).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
      data: { currentUses: { increment: 1 } },
    });
  });

  it("calculates tax based on venue state", async () => {
    // NY has tax rate 0.08875
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    // Subtotal = 25, discountedSubtotal = 25
    // Tax = 25 * 0.08875 = 2.22 (rounded)
    expect(data.tax).toBe(2.22);
  });

  it("uses default 0% tax for unknown state", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        venue: { id: "venue-1", name: "Laugh Lounge", state: "ZZ" },
      })
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.tax).toBe(0);
  });

  it("uses event title for confirmation when title exists", async () => {
    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(data.tickets[0].eventTitle).toBe("Comedy Night");
  });

  it("falls back to comedian names when event has no title", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({ title: null })
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(data.tickets[0].eventTitle).toBe("Jane Doe");
  });

  // ── Stripe Checkout ─────────────────────────────────────────────────────

  it("creates Stripe session when STRIPE_SECRET_KEY is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "cs_test_123", url: "https://checkout.stripe.com/pay/cs_test_123" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    mockPrisma.ticketOrder.update.mockResolvedValue({});

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sessionId).toBe("cs_test_123");
    expect(data.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(data.orderId).toBe("order-1");

    // Should link stripe session to order
    expect(mockPrisma.ticketOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { stripeSessionId: "cs_test_123" },
    });

    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("falls through to non-Stripe flow when Stripe call fails", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: () => Promise.resolve({ error: { message: "Invalid request" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    // Falls through to non-Stripe confirmation
    expect(res.status).toBe(201);
    expect(data.orderId).toBe("order-1");
    expect(data.stripePaymentId).toBeNull();

    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
  });

  // ── Transaction Errors ──────────────────────────────────────────────────

  it("returns 500 when transaction fails due to availability", async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new Error("General Admission is no longer available")
    );

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("General Admission is no longer available");
  });

  it("returns 500 with generic message for non-Error throws", async () => {
    mockPrisma.$transaction.mockRejectedValue("unexpected string error");

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Checkout failed");
  });

  // ── Multiple Items ──────────────────────────────────────────────────────

  it("handles multiple ticket types in a single order", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(
      buildMockEvent({
        ticketTypes: [
          {
            id: "tt-1",
            name: "General Admission",
            price: new Decimal("25.00"),
            capacity: 100,
            sold: 0,
            saleStart: null,
            saleEnd: null,
          },
          {
            id: "tt-2",
            name: "VIP",
            price: new Decimal("75.00"),
            capacity: 50,
            sold: 0,
            saleStart: null,
            saleEnd: null,
          },
        ],
      })
    );

    // Update transaction mock for multiple ticket types
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      let ticketCount = 0;
      const tx = {
        ticketType: {
          findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === "tt-1") return { id: "tt-1", sold: 0, capacity: 100 };
            if (where.id === "tt-2") return { id: "tt-2", sold: 0, capacity: 50 };
            return null;
          }),
          update: vi.fn(),
        },
        ticket: {
          create: vi.fn().mockImplementation(() => {
            ticketCount++;
            return { id: `ticket-${ticketCount}`, qrCode: `qr-${ticketCount}` };
          }),
        },
        ticketOrder: {
          create: vi.fn().mockResolvedValue({
            id: "order-1",
            createdAt: new Date("2026-01-15T00:00:00Z"),
          }),
        },
      };
      return fn(tx);
    });

    const res = await POST(createPostRequest({
      eventId: "event-1",
      items: [
        { ticketTypeId: "tt-1", quantity: 2 },
        { ticketTypeId: "tt-2", quantity: 1 },
      ],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    // Subtotal = (2 * 25) + (1 * 75) = 125
    expect(data.subtotal).toBe(125);
    expect(data.tickets).toHaveLength(3);
  });
});
