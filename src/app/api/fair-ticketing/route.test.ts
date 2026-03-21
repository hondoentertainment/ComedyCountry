import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/fair-ticketing", () => ({
  createFairPricePolicy: vi.fn(),
  getFairPricePolicy: vi.fn(),
  calculateTransparentPrice: vi.fn(),
  getFeeBreakdown: vi.fn(),
  verifyTicketHolder: vi.fn(),
  checkTicketVerification: vi.fn(),
  joinWaitlistQueue: vi.fn(),
  getWaitlistPosition: vi.fn(),
  claimWaitlistTicket: vi.fn(),
  requestResale: vi.fn(),
  approveResale: vi.fn(),
  purchaseResaleTicket: vi.fn(),
  getResaleListings: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  createFairPricePolicy,
  getFairPricePolicy,
  getFeeBreakdown,
  verifyTicketHolder,
  checkTicketVerification,
  joinWaitlistQueue,
  getWaitlistPosition,
  claimWaitlistTicket,
  requestResale,
  getResaleListings,
  approveResale,
  purchaseResaleTicket,
} from "@/lib/fair-ticketing";

import {
  GET as getPolicyGET,
  POST as getPolicyPOST,
} from "./policy/route";
import {
  POST as verifyPOST,
  GET as verifyGET,
} from "./verify/route";
import { GET as priceGET } from "./price/route";
import {
  GET as waitlistGET,
  POST as waitlistPOST,
} from "./waitlist/route";
import { POST as claimPOST } from "./waitlist/claim/route";
import {
  GET as resaleGET,
  POST as resalePOST,
} from "./resale/route";

function createRequest(
  url: string,
  options?: { method?: string; body?: unknown }
) {
  const init: RequestInit = { method: options?.method ?? "GET" };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init as any);
}

describe("Fair Ticketing API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Policy Routes ──────────────────────────────────────────────────────

  describe("GET /api/fair-ticketing/policy", () => {
    it("returns 400 when eventId missing", async () => {
      const req = createRequest("http://localhost/api/fair-ticketing/policy");
      const res = await getPolicyGET(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when no policy found", async () => {
      vi.mocked(getFairPricePolicy).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/policy?eventId=e1"
      );
      const res = await getPolicyGET(req);
      expect(res.status).toBe(404);
    });

    it("returns policy for valid eventId", async () => {
      const policy = { id: "fp1", eventId: "e1", showAllFees: true };
      vi.mocked(getFairPricePolicy).mockResolvedValue(policy as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/policy?eventId=e1"
      );
      const res = await getPolicyGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("fp1");
    });
  });

  describe("POST /api/fair-ticketing/policy", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/policy",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await getPolicyPOST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when eventId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/policy",
        { method: "POST", body: { showAllFees: true } }
      );
      const res = await getPolicyPOST(req);
      expect(res.status).toBe(400);
    });

    it("creates policy successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      const policy = { id: "fp1", eventId: "e1" };
      vi.mocked(createFairPricePolicy).mockResolvedValue(policy as never);

      const req = createRequest(
        "http://localhost/api/fair-ticketing/policy",
        {
          method: "POST",
          body: { eventId: "e1", showAllFees: true, antiScalpingEnabled: true },
        }
      );
      const res = await getPolicyPOST(req);
      expect(res.status).toBe(201);
    });
  });

  // ── Verify Routes ─────────────────────────────────────────────────────

  describe("POST /api/fair-ticketing/verify", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/verify",
        { method: "POST", body: { ticketId: "t1", method: "EMAIL" } }
      );
      const res = await verifyPOST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when ticketId or method missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/verify",
        { method: "POST", body: { ticketId: "t1" } }
      );
      const res = await verifyPOST(req);
      expect(res.status).toBe(400);
    });

    it("verifies ticket holder successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(verifyTicketHolder).mockResolvedValue({
        id: "v1",
        isVerified: true,
      } as never);

      const req = createRequest(
        "http://localhost/api/fair-ticketing/verify",
        {
          method: "POST",
          body: { ticketId: "t1", method: "EMAIL", data: { email: "a@b.com" } },
        }
      );
      const res = await verifyPOST(req);
      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/fair-ticketing/verify", () => {
    it("returns 400 when ticketId missing", async () => {
      const req = createRequest("http://localhost/api/fair-ticketing/verify");
      const res = await verifyGET(req);
      expect(res.status).toBe(400);
    });

    it("returns verification status", async () => {
      vi.mocked(checkTicketVerification).mockResolvedValue({
        isVerified: true,
        verification: { id: "v1" },
      } as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/verify?ticketId=t1"
      );
      const res = await verifyGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isVerified).toBe(true);
    });
  });

  // ── Price Routes ──────────────────────────────────────────────────────

  describe("GET /api/fair-ticketing/price", () => {
    it("returns 400 when params missing", async () => {
      const req = createRequest("http://localhost/api/fair-ticketing/price");
      const res = await priceGET(req);
      expect(res.status).toBe(400);
    });

    it("returns fee breakdown", async () => {
      vi.mocked(getFeeBreakdown).mockResolvedValue({
        ticketTypeName: "GA",
        basePrice: 50,
        serviceFee: 5,
        processingFee: 1.75,
        totalPrice: 56.75,
        feePercentage: 13.5,
        showAllFees: true,
        antiScalpingEnabled: true,
      });
      const req = createRequest(
        "http://localhost/api/fair-ticketing/price?ticketTypeId=tt1&eventId=e1"
      );
      const res = await priceGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.basePrice).toBe(50);
      expect(data.totalPrice).toBe(56.75);
    });
  });

  // ── Waitlist Routes ───────────────────────────────────────────────────

  describe("POST /api/fair-ticketing/waitlist", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await waitlistPOST(req);
      expect(res.status).toBe(401);
    });

    it("joins waitlist successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(joinWaitlistQueue).mockResolvedValue({
        id: "wl1",
        position: 1,
      } as never);

      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await waitlistPOST(req);
      expect(res.status).toBe(201);
    });

    it("returns 409 when already in waitlist", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(joinWaitlistQueue).mockRejectedValue(
        new Error("Already in waitlist")
      );

      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await waitlistPOST(req);
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/fair-ticketing/waitlist", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist?eventId=e1"
      );
      const res = await waitlistGET(req);
      expect(res.status).toBe(401);
    });

    it("returns waitlist position", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(getWaitlistPosition).mockResolvedValue({
        position: 3,
        effectivePosition: 2,
        status: "WAITING",
        joinedAt: new Date(),
        expiresAt: new Date(),
      });

      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist?eventId=e1"
      );
      const res = await waitlistGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.position).toBe(3);
    });
  });

  // ── Claim Route ────────────────────────────────────────────────────────

  describe("POST /api/fair-ticketing/waitlist/claim", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist/claim",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await claimPOST(req);
      expect(res.status).toBe(401);
    });

    it("claims ticket successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(claimWaitlistTicket).mockResolvedValue({
        id: "wl1",
        status: "CLAIMED",
      } as never);

      const req = createRequest(
        "http://localhost/api/fair-ticketing/waitlist/claim",
        { method: "POST", body: { eventId: "e1" } }
      );
      const res = await claimPOST(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Resale Routes ─────────────────────────────────────────────────────

  describe("GET /api/fair-ticketing/resale", () => {
    it("returns 400 when eventId missing", async () => {
      const req = createRequest("http://localhost/api/fair-ticketing/resale");
      const res = await resaleGET(req);
      expect(res.status).toBe(400);
    });

    it("returns resale listings", async () => {
      vi.mocked(getResaleListings).mockResolvedValue([
        { id: "rl1", maxPrice: 55 },
      ] as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/resale?eventId=e1"
      );
      const res = await resaleGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
    });
  });

  describe("POST /api/fair-ticketing/resale", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/resale",
        { method: "POST", body: { ticketId: "t1", maxPrice: 55 } }
      );
      const res = await resalePOST(req);
      expect(res.status).toBe(401);
    });

    it("creates resale request successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      vi.mocked(requestResale).mockResolvedValue({
        id: "rl1",
        listingStatus: "PENDING",
      } as never);

      const req = createRequest(
        "http://localhost/api/fair-ticketing/resale",
        { method: "POST", body: { ticketId: "t1", maxPrice: 55 } }
      );
      const res = await resalePOST(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 when params missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1" },
      } as never);
      const req = createRequest(
        "http://localhost/api/fair-ticketing/resale",
        { method: "POST", body: { ticketId: "t1" } }
      );
      const res = await resalePOST(req);
      expect(res.status).toBe(400);
    });
  });
});
