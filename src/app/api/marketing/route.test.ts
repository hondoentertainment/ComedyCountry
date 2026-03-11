import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/marketing", () => ({
  createSMSCampaign: vi.fn(),
  getSMSCampaigns: vi.fn(),
  addSMSSubscriber: vi.fn(),
  removeSMSSubscriber: vi.fn(),
  createAudienceSegment: vi.fn(),
  getAudienceSegments: vi.fn(),
  generateReferralCode: vi.fn(),
  getReferralStats: vi.fn(),
  redeemReferralCode: vi.fn(),
  registerRetargetingPixel: vi.fn(),
  getRetargetingPixels: vi.fn(),
  createFollowUpSequence: vi.fn(),
  getFollowUpSequences: vi.fn(),
  createABTest: vi.fn(),
  getABTestResults: vi.fn(),
  recordABTestImpression: vi.fn(),
  recordABTestConversion: vi.fn(),
  matchInfluencers: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aBTest: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import {
  createSMSCampaign,
  getSMSCampaigns,
  addSMSSubscriber,
  removeSMSSubscriber,
  createAudienceSegment,
  getAudienceSegments,
  generateReferralCode,
  getReferralStats,
  redeemReferralCode,
  registerRetargetingPixel,
  getRetargetingPixels,
  createFollowUpSequence,
  getFollowUpSequences,
  createABTest,
  matchInfluencers,
} from "@/lib/marketing";

// Import route handlers
import {
  GET as getCampaigns,
  POST as postCampaign,
} from "./sms-campaigns/route";
import {
  POST as postSubscriber,
  DELETE as deleteSubscriber,
} from "./sms-subscribers/route";
import {
  GET as getSegments,
  POST as postSegment,
} from "./segments/route";
import {
  GET as getReferrals,
  POST as postReferral,
} from "./referrals/route";
import { POST as postRedeem } from "./referrals/redeem/route";
import {
  GET as getPixels,
  POST as postPixel,
} from "./pixels/route";
import {
  GET as getFollowUps,
  POST as postFollowUp,
} from "./follow-ups/route";
import {
  GET as getTests,
  POST as postTest,
} from "./ab-tests/route";
import { GET as getInfluencers } from "./influencers/route";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options);
}

describe("Marketing API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── SMS Campaigns ────────────────────────────────────────────── */

  describe("GET /api/marketing/sms-campaigns", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest("http://localhost/api/marketing/sms-campaigns?venueId=v1");
      const res = await getCampaigns(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when venueId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      const req = createRequest("http://localhost/api/marketing/sms-campaigns");
      const res = await getCampaigns(req);
      expect(res.status).toBe(400);
    });

    it("returns campaigns for venue", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(getSMSCampaigns).mockResolvedValue([
        { id: "c1", name: "Promo", status: "draft" },
      ] as any);

      const req = createRequest("http://localhost/api/marketing/sms-campaigns?venueId=v1");
      const res = await getCampaigns(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.campaigns).toHaveLength(1);
    });
  });

  describe("POST /api/marketing/sms-campaigns", () => {
    it("creates a campaign", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(createSMSCampaign).mockResolvedValue({
        id: "c1",
        name: "Promo",
        message: "Come tonight!",
      } as any);

      const req = createRequest("http://localhost/api/marketing/sms-campaigns", {
        method: "POST",
        body: JSON.stringify({ venueId: "v1", name: "Promo", message: "Come tonight!" }),
      });
      const res = await postCampaign(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 when fields missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      const req = createRequest("http://localhost/api/marketing/sms-campaigns", {
        method: "POST",
        body: JSON.stringify({ venueId: "v1" }),
      });
      const res = await postCampaign(req);
      expect(res.status).toBe(400);
    });
  });

  /* ─── SMS Subscribers ──────────────────────────────────────────── */

  describe("POST /api/marketing/sms-subscribers", () => {
    it("adds subscriber", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(addSMSSubscriber).mockResolvedValue({ id: "s1", optedIn: true } as any);

      const req = createRequest("http://localhost/api/marketing/sms-subscribers", {
        method: "POST",
        body: JSON.stringify({ phone: "5551234567", venueId: "v1" }),
      });
      const res = await postSubscriber(req);
      expect(res.status).toBe(201);
    });
  });

  describe("DELETE /api/marketing/sms-subscribers", () => {
    it("removes subscriber", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(removeSMSSubscriber).mockResolvedValue({ id: "s1", optedIn: false } as any);

      const req = createRequest("http://localhost/api/marketing/sms-subscribers", {
        method: "DELETE",
        body: JSON.stringify({ phone: "5551234567", venueId: "v1" }),
      });
      const res = await deleteSubscriber(req);
      expect(res.status).toBe(200);
    });
  });

  /* ─── Segments ─────────────────────────────────────────────────── */

  describe("POST /api/marketing/segments", () => {
    it("creates a segment", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(createAudienceSegment).mockResolvedValue({ id: "seg1", name: "VIPs" } as any);

      const req = createRequest("http://localhost/api/marketing/segments", {
        method: "POST",
        body: JSON.stringify({ name: "VIPs", criteria: { minVisits: 5 } }),
      });
      const res = await postSegment(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 when name missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      const req = createRequest("http://localhost/api/marketing/segments", {
        method: "POST",
        body: JSON.stringify({ criteria: {} }),
      });
      const res = await postSegment(req);
      expect(res.status).toBe(400);
    });
  });

  /* ─── Referrals ────────────────────────────────────────────────── */

  describe("GET /api/marketing/referrals", () => {
    it("returns referral stats for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(getReferralStats).mockResolvedValue({
        totalCodes: 3,
        activeCodes: 2,
        totalRedemptions: 10,
        totalRevenue: 500,
        codes: [],
      });

      const res = await getReferrals();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.totalCodes).toBe(3);
    });
  });

  describe("POST /api/marketing/referrals", () => {
    it("creates referral code", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(generateReferralCode).mockResolvedValue({
        id: "r1",
        code: "REF-ABCD1234",
      } as any);

      const req = createRequest("http://localhost/api/marketing/referrals", {
        method: "POST",
        body: JSON.stringify({ discountValue: 15 }),
      });
      const res = await postReferral(req);
      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/marketing/referrals/redeem", () => {
    it("redeems a valid code", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } });
      vi.mocked(redeemReferralCode).mockResolvedValue({
        id: "rd1",
        discount: 10,
      } as any);

      const req = createRequest("http://localhost/api/marketing/referrals/redeem", {
        method: "POST",
        body: JSON.stringify({ code: "REF-ABCD" }),
      });
      const res = await postRedeem(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 when code missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } });
      const req = createRequest("http://localhost/api/marketing/referrals/redeem", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await postRedeem(req);
      expect(res.status).toBe(400);
    });
  });

  /* ─── Pixels ───────────────────────────────────────────────────── */

  describe("POST /api/marketing/pixels", () => {
    it("registers a pixel", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(registerRetargetingPixel).mockResolvedValue({
        id: "p1",
        provider: "meta",
      } as any);

      const req = createRequest("http://localhost/api/marketing/pixels", {
        method: "POST",
        body: JSON.stringify({ venueId: "v1", provider: "meta", pixelId: "123" }),
      });
      const res = await postPixel(req);
      expect(res.status).toBe(201);
    });
  });

  /* ─── Follow-Ups ──────────────────────────────────────────────── */

  describe("POST /api/marketing/follow-ups", () => {
    it("creates a follow-up sequence", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(createFollowUpSequence).mockResolvedValue({
        id: "fs1",
        name: "Post-Show",
      } as any);

      const req = createRequest("http://localhost/api/marketing/follow-ups", {
        method: "POST",
        body: JSON.stringify({
          venueId: "v1",
          name: "Post-Show",
          triggerEvent: "post_show",
          steps: [{ delayHours: 24, channel: "email", templateId: "t1" }],
        }),
      });
      const res = await postFollowUp(req);
      expect(res.status).toBe(201);
    });
  });

  /* ─── Influencers ──────────────────────────────────────────────── */

  describe("GET /api/marketing/influencers", () => {
    it("returns influencer matches", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(matchInfluencers).mockResolvedValue([
        { id: "i1", influencerName: "FunnyGuy", matchScore: 85 },
      ] as any);

      const req = createRequest("http://localhost/api/marketing/influencers?venueId=v1");
      const res = await getInfluencers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.influencers).toHaveLength(1);
    });

    it("returns 400 when venueId missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      const req = createRequest("http://localhost/api/marketing/influencers");
      const res = await getInfluencers(req);
      expect(res.status).toBe(400);
    });
  });
});
