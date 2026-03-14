/**
 * Test Harness Self-Tests
 *
 * Validates that all test utilities work correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrisma,
  factories,
  resetFactoryCounter,
  req,
  parseResponse,
  routeParams,
  assertOk,
  assertCreated,
  assertError,
  assertBadRequest,
  assertUnauthorized,
  assertNotFound,
  assertThrowsAsync,
} from "./index";

// ── Mock Prisma Tests ────────────────────────────────────────────────────────

describe("createMockPrisma", () => {
  it("creates a proxy with auto-generated models", () => {
    const prisma = createMockPrisma();

    expect(prisma.event).toBeDefined();
    expect(prisma.event.findMany).toBeDefined();
    expect(typeof prisma.event.findMany).toBe("function");
  });

  it("returns the same model on repeated access", () => {
    const prisma = createMockPrisma();

    const first = prisma.event;
    const second = prisma.event;
    expect(first).toBe(second);
  });

  it("has all standard Prisma methods on each model", () => {
    const prisma = createMockPrisma();
    const methods = [
      "findUnique",
      "findFirst",
      "findMany",
      "create",
      "createMany",
      "update",
      "updateMany",
      "upsert",
      "delete",
      "deleteMany",
      "count",
      "aggregate",
      "groupBy",
    ];

    for (const method of methods) {
      expect(
        typeof prisma.someModel[method as keyof typeof prisma.someModel]
      ).toBe("function");
    }
  });

  it("methods are vi.fn() that can be mocked", async () => {
    const prisma = createMockPrisma();
    const mockEvents = [{ id: "1", title: "Test" }];

    prisma.event.findMany.mockResolvedValue(mockEvents);
    const result = await prisma.event.findMany();

    expect(result).toEqual(mockEvents);
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it("supports $transaction with function callback", async () => {
    const prisma = createMockPrisma();
    prisma.event.create.mockResolvedValue({ id: "1" });

    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      return tx.event.create({ data: { title: "Test" } });
    });

    expect(result).toEqual({ id: "1" });
  });

  it("different models are independent", () => {
    const prisma = createMockPrisma();

    expect(prisma.event).not.toBe(prisma.venue);
    expect(prisma.event.findMany).not.toBe(prisma.venue.findMany);
  });
});

// ── Factories Tests ──────────────────────────────────────────────────────────

describe("factories", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("generates unique IDs across calls", () => {
    const e1 = factories.event();
    const e2 = factories.event();

    expect(e1.id).not.toBe(e2.id);
  });

  it("accepts overrides", () => {
    const e = factories.event({ title: "Custom Title", capacity: 500 });

    expect(e.title).toBe("Custom Title");
    expect(e.capacity).toBe(500);
    expect(e.venueId).toBe("venue-1"); // default preserved
  });

  it("many() generates N entities", () => {
    const events = factories.many(factories.event, 5);

    expect(events).toHaveLength(5);
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size).toBe(5); // all unique
  });

  it("many() applies overrides to all", () => {
    const events = factories.many(factories.event, 3, { venueId: "v99" });

    for (const e of events) {
      expect(e.venueId).toBe("v99");
    }
  });

  it("generates all phase 14 entities", () => {
    const tl = factories.tableLayout();
    const dm = factories.drinkMinimum();
    const ws = factories.walkUpSale();
    const cl = factories.compListEntry();
    const ss = factories.staffShift();
    const mi = factories.menuItem();
    const po = factories.preOrder();

    expect(tl.venueId).toBeDefined();
    expect(dm.eventId).toBeDefined();
    expect(ws.amount).toBeGreaterThan(0);
    expect(cl.status).toBe("pending");
    expect(ss.role).toBeDefined();
    expect(mi.price).toBeGreaterThan(0);
    expect(po.items).toHaveLength(1);
  });

  it("generates all phase 15 entities", () => {
    const clip = factories.shortClip();
    const challenge = factories.clipChallenge();
    const trend = factories.trendingBit();

    expect(clip.duration).toBeGreaterThan(0);
    expect(challenge.status).toBe("active");
    expect(trend.score).toBeGreaterThan(0);
  });

  it("generates all phase 16 entities", () => {
    const sms = factories.smsCampaign();
    const sub = factories.smsSubscriber();
    const seg = factories.audienceSegment();
    const ref = factories.referralCode();
    const ab = factories.abTest();

    expect(sms.message.length).toBeLessThanOrEqual(160);
    expect(sub.tcpaConsentRecorded).toBe(true);
    expect(seg.memberCount).toBeGreaterThan(0);
    expect(ref.isActive).toBe(true);
    expect(ab.status).toBe("running");
  });

  it("generates all phase 17 entities", () => {
    const tag = factories.accessibilityTag();
    const pass = factories.walletPass();

    expect(tag.category).toBeDefined();
    expect(pass.serialNumber).toContain("SN-");
  });

  it("generates all phase 18 entities", () => {
    const scene = factories.internationalScene();
    const fest = factories.festivalCircuit();
    const style = factories.comedyStyle();
    const tour = factories.touringInfo();
    const promo = factories.promoterApplication();

    expect(scene.country).toBe("UK");
    expect(fest.currency).toBe("GBP");
    expect(style.region).toBeDefined();
    expect(tour.country).toBeDefined();
    expect(promo.status).toBe("pending");
  });
});

// ── Request Builder Tests ────────────────────────────────────────────────────

describe("req", () => {
  it("creates GET requests", () => {
    const r = req.get("/api/events");

    expect(r.method).toBe("GET");
    expect(r.url).toBe("http://localhost/api/events");
  });

  it("creates POST requests with body", async () => {
    const r = req.post("/api/events", { title: "Show" });

    expect(r.method).toBe("POST");
    const body = await r.json();
    expect(body.title).toBe("Show");
  });

  it("creates PATCH requests", () => {
    const r = req.patch("/api/events/1", { title: "Updated" });

    expect(r.method).toBe("PATCH");
  });

  it("creates DELETE requests", () => {
    const r = req.delete("/api/events/1");

    expect(r.method).toBe("DELETE");
  });

  it("withHeaders adds headers", () => {
    const r = req.get("/api/events").withHeaders({ Authorization: "Bearer tok" });

    expect(r.headers.get("Authorization")).toBe("Bearer tok");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });

  it("build() creates complex requests", async () => {
    const r = req
      .build("/api/events")
      .method("POST")
      .json({ title: "Show" })
      .header("X-Custom", "value")
      .query({ page: 1, limit: 10 })
      .done();

    expect(r.method).toBe("POST");
    expect(r.url).toContain("page=1");
    expect(r.url).toContain("limit=10");
    expect(r.headers.get("X-Custom")).toBe("value");
    const body = await r.json();
    expect(body.title).toBe("Show");
  });

  it("accepts full URLs", () => {
    const r = req.get("https://api.example.com/test");

    expect(r.url).toBe("https://api.example.com/test");
  });
});

describe("parseResponse", () => {
  it("parses JSON response", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});

describe("routeParams", () => {
  it("wraps params in a Promise", async () => {
    const params = routeParams({ id: "abc" });
    const resolved = await params.params;

    expect(resolved).toEqual({ id: "abc" });
  });
});

// ── API Helpers Tests ────────────────────────────────────────────────────────

describe("api helpers", () => {
  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("assertOk passes for 200", async () => {
    const res = jsonResponse({ items: [1, 2, 3] });
    await assertOk(res, (data: { items: number[] }) => {
      expect(data.items).toHaveLength(3);
    });
  });

  it("assertCreated passes for 201", async () => {
    const res = jsonResponse({ id: "new-1" }, 201);
    await assertCreated(res, (data: { id: string }) => {
      expect(data.id).toBe("new-1");
    });
  });

  it("assertError checks status and message", async () => {
    const res = jsonResponse({ error: "Bad request" }, 400);
    await assertError(res, 400, "Bad request");
  });

  it("assertBadRequest checks 400", async () => {
    const res = jsonResponse({ error: "Invalid" }, 400);
    await assertBadRequest(res, "Invalid");
  });

  it("assertUnauthorized checks 401", async () => {
    const res = jsonResponse({ error: "Unauthorized" }, 401);
    await assertUnauthorized(res);
  });

  it("assertNotFound checks 404", async () => {
    const res = jsonResponse({ error: "Not found" }, 404);
    await assertNotFound(res, "Not found");
  });

  it("assertThrowsAsync catches thrown errors", async () => {
    await assertThrowsAsync(async () => {
      throw new Error("Something broke");
    }, "Something broke");
  });
});
