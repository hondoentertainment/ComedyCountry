import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSMSCampaign,
  scheduleSMSCampaign,
  getSMSCampaigns,
  getSMSCampaignStats,
  addSMSSubscriber,
  removeSMSSubscriber,
  getSMSSubscriberCount,
  createAudienceSegment,
  getAudienceSegments,
  evaluateSegmentCriteria,
  generateReferralCode,
  validateReferralCode,
  redeemReferralCode,
  getReferralStats,
  registerRetargetingPixel,
  getRetargetingPixels,
  createFollowUpSequence,
  getFollowUpSequences,
  createABTest,
  recordABTestImpression,
  recordABTestConversion,
  getABTestResults,
  calculateSignificance,
  matchInfluencers,
  getInfluencerMatches,
} from "./marketing";

vi.mock("./prisma", () => ({
  prisma: {
    sMSCampaign: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    sMSSubscriber: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    audienceSegment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    referralCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    referralRedemption: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    retargetingPixel: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    followUpSequence: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    aBTest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    influencerMatch: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  sMSCampaign: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sMSSubscriber: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  audienceSegment: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  referralCode: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  referralRedemption: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  retargetingPixel: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  followUpSequence: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  aBTest: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  influencerMatch: {
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("marketing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── SMS Campaigns ────────────────────────────────────────────── */

  describe("createSMSCampaign", () => {
    it("creates a campaign with valid data", async () => {
      const campaign = { id: "c1", venueId: "v1", name: "Promo", message: "Come tonight!", status: "draft" };
      mockPrisma.sMSCampaign.create.mockResolvedValue(campaign);

      const result = await createSMSCampaign("v1", { name: "Promo", message: "Come tonight!" });
      expect(result).toEqual(campaign);
      expect(mockPrisma.sMSCampaign.create).toHaveBeenCalledWith({
        data: { venueId: "v1", name: "Promo", message: "Come tonight!", segmentId: null },
      });
    });

    it("rejects messages over 160 characters", async () => {
      const longMsg = "x".repeat(161);
      await expect(createSMSCampaign("v1", { name: "Long", message: longMsg })).rejects.toThrow(
        "SMS message must be 160 characters or fewer",
      );
    });
  });

  describe("scheduleSMSCampaign", () => {
    it("schedules a draft campaign", async () => {
      const future = new Date(Date.now() + 86400000);
      mockPrisma.sMSCampaign.findUnique.mockResolvedValue({ id: "c1", status: "draft" });
      mockPrisma.sMSCampaign.update.mockResolvedValue({ id: "c1", status: "scheduled", scheduledAt: future });

      const result = await scheduleSMSCampaign("c1", future);
      expect(result.status).toBe("scheduled");
    });

    it("rejects past scheduled times", async () => {
      const past = new Date("2020-01-01");
      await expect(scheduleSMSCampaign("c1", past)).rejects.toThrow("Scheduled time must be in the future");
    });

    it("rejects scheduling non-draft campaigns", async () => {
      const future = new Date(Date.now() + 86400000);
      mockPrisma.sMSCampaign.findUnique.mockResolvedValue({ id: "c1", status: "sent" });

      await expect(scheduleSMSCampaign("c1", future)).rejects.toThrow("Only draft campaigns can be scheduled");
    });
  });

  describe("getSMSCampaignStats", () => {
    it("computes delivery, click, and opt-out rates", async () => {
      mockPrisma.sMSCampaign.findUnique.mockResolvedValue({
        id: "c1",
        recipientCount: 100,
        deliveredCount: 90,
        clickCount: 18,
        optOutCount: 2,
        status: "sent",
      });

      const stats = await getSMSCampaignStats("c1");
      expect(stats.deliveryRate).toBe(90);
      expect(stats.clickRate).toBe(20);
      expect(stats.optOutRate).toBe(2.22);
    });

    it("returns zero rates when no recipients", async () => {
      mockPrisma.sMSCampaign.findUnique.mockResolvedValue({
        id: "c1",
        recipientCount: 0,
        deliveredCount: 0,
        clickCount: 0,
        optOutCount: 0,
        status: "draft",
      });

      const stats = await getSMSCampaignStats("c1");
      expect(stats.deliveryRate).toBe(0);
      expect(stats.clickRate).toBe(0);
    });
  });

  /* ─── SMS Subscribers (TCPA compliance) ────────────────────────── */

  describe("addSMSSubscriber", () => {
    it("creates new subscriber", async () => {
      mockPrisma.sMSSubscriber.findUnique.mockResolvedValue(null);
      mockPrisma.sMSSubscriber.create.mockResolvedValue({ id: "s1", phone: "5551234567", optedIn: true });

      const result = await addSMSSubscriber("555-123-4567", "v1", "web");
      expect(result.optedIn).toBe(true);
      expect(mockPrisma.sMSSubscriber.create).toHaveBeenCalledWith({
        data: { phone: "5551234567", venueId: "v1", source: "web" },
      });
    });

    it("re-opts-in a previously opted-out subscriber", async () => {
      mockPrisma.sMSSubscriber.findUnique.mockResolvedValue({
        id: "s1",
        phone: "5551234567",
        optedIn: false,
      });
      mockPrisma.sMSSubscriber.update.mockResolvedValue({ id: "s1", optedIn: true });

      const result = await addSMSSubscriber("5551234567", "v1");
      expect(result.optedIn).toBe(true);
    });

    it("returns existing subscriber if already opted in", async () => {
      const existing = { id: "s1", phone: "5551234567", optedIn: true };
      mockPrisma.sMSSubscriber.findUnique.mockResolvedValue(existing);

      const result = await addSMSSubscriber("5551234567", "v1");
      expect(result).toEqual(existing);
      expect(mockPrisma.sMSSubscriber.create).not.toHaveBeenCalled();
    });

    it("rejects invalid phone numbers", async () => {
      await expect(addSMSSubscriber("123", "v1")).rejects.toThrow("Invalid phone number");
    });
  });

  describe("removeSMSSubscriber", () => {
    it("opts out subscriber (TCPA compliance)", async () => {
      mockPrisma.sMSSubscriber.findUnique.mockResolvedValue({ id: "s1", phone: "5551234567", optedIn: true });
      mockPrisma.sMSSubscriber.update.mockResolvedValue({ id: "s1", optedIn: false });

      const result = await removeSMSSubscriber("5551234567", "v1");
      expect(result.optedIn).toBe(false);
    });

    it("throws when subscriber not found", async () => {
      mockPrisma.sMSSubscriber.findUnique.mockResolvedValue(null);
      await expect(removeSMSSubscriber("5551234567", "v1")).rejects.toThrow("Subscriber not found");
    });
  });

  describe("getSMSSubscriberCount", () => {
    it("returns count of opted-in subscribers", async () => {
      mockPrisma.sMSSubscriber.count.mockResolvedValue(42);
      const count = await getSMSSubscriberCount("v1");
      expect(count).toBe(42);
      expect(mockPrisma.sMSSubscriber.count).toHaveBeenCalledWith({
        where: { venueId: "v1", optedIn: true },
      });
    });
  });

  /* ─── Audience Segments ────────────────────────────────────────── */

  describe("evaluateSegmentCriteria", () => {
    it("matches user with all criteria", () => {
      const criteria = {
        tasteGenres: ["standup", "improv"],
        minVisits: 3,
        minSpend: 50,
        locations: ["New York"],
      };
      const profile = {
        genres: ["standup", "sketch"],
        visitCount: 5,
        totalSpend: 100,
        location: "New York",
      };

      expect(evaluateSegmentCriteria(criteria, profile)).toBe(true);
    });

    it("fails when no genre overlap", () => {
      const criteria = { tasteGenres: ["improv"] };
      const profile = { genres: ["standup"] };
      expect(evaluateSegmentCriteria(criteria, profile)).toBe(false);
    });

    it("fails when visits below minimum", () => {
      const criteria = { minVisits: 5 };
      const profile = { visitCount: 2 };
      expect(evaluateSegmentCriteria(criteria, profile)).toBe(false);
    });

    it("fails when spend below minimum", () => {
      const criteria = { minSpend: 100 };
      const profile = { totalSpend: 50 };
      expect(evaluateSegmentCriteria(criteria, profile)).toBe(false);
    });

    it("fails when last visit too old", () => {
      const criteria = { maxDaysSinceVisit: 7 };
      const profile = {
        lastVisitDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };
      expect(evaluateSegmentCriteria(criteria, profile)).toBe(false);
    });

    it("fails when user location not in allowed locations", () => {
      const criteria = { locations: ["New York", "LA"] };
      const profile = { location: "Chicago" };
      expect(evaluateSegmentCriteria(criteria, profile)).toBe(false);
    });

    it("passes with empty criteria (all users match)", () => {
      expect(evaluateSegmentCriteria({}, {})).toBe(true);
    });
  });

  /* ─── Referral Codes ───────────────────────────────────────────── */

  describe("generateReferralCode", () => {
    it("creates a referral code with defaults", async () => {
      mockPrisma.referralCode.create.mockResolvedValue({
        id: "r1",
        code: "REF-ABCD1234",
        referrerId: "u1",
        discountType: "percentage",
        discountValue: 10,
      });

      const result = await generateReferralCode("u1");
      expect(result.code).toContain("REF-");
      expect(mockPrisma.referralCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerId: "u1",
          discountType: "percentage",
          discountValue: 10,
          maxUses: 50,
        }),
      });
    });
  });

  describe("validateReferralCode", () => {
    it("returns valid for active unexpired code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        code: "REF-ABCD",
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        useCount: 5,
        maxUses: 50,
        discountType: "percentage",
        discountValue: 10,
      });

      const result = await validateReferralCode("REF-ABCD");
      expect(result.valid).toBe(true);
      expect(result.discountValue).toBe(10);
    });

    it("returns invalid for non-existent code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      const result = await validateReferralCode("FAKE");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Code not found");
    });

    it("returns invalid for inactive code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        isActive: false,
      });
      const result = await validateReferralCode("REF-X");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Code is inactive");
    });

    it("returns invalid for expired code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        isActive: true,
        expiresAt: new Date("2020-01-01"),
        useCount: 0,
        maxUses: 50,
      });
      const result = await validateReferralCode("REF-EXP");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Code has expired");
    });

    it("returns invalid for maxed-out code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        isActive: true,
        expiresAt: null,
        useCount: 50,
        maxUses: 50,
      });
      const result = await validateReferralCode("REF-MAX");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Code has reached maximum uses");
    });
  });

  describe("redeemReferralCode", () => {
    it("redeems valid code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        code: "REF-VALID",
        referrerId: "u-owner",
        isActive: true,
        expiresAt: null,
        useCount: 0,
        maxUses: 50,
        discountType: "percentage",
        discountValue: 10,
      });
      mockPrisma.referralRedemption.findFirst.mockResolvedValue(null);
      const redemption = { id: "rd1", codeId: "r1", userId: "u2", discount: 10 };
      mockPrisma.$transaction.mockResolvedValue([redemption, {}]);

      const result = await redeemReferralCode("REF-VALID", "u2", "order-1");
      expect(result).toEqual(redemption);
    });

    it("prevents self-referral", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        code: "REF-SELF",
        referrerId: "u1",
        isActive: true,
        expiresAt: null,
        useCount: 0,
        maxUses: 50,
        discountValue: 10,
      });

      await expect(redeemReferralCode("REF-SELF", "u1")).rejects.toThrow(
        "Cannot use your own referral code",
      );
    });

    it("prevents duplicate redemption by same user", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        id: "r1",
        code: "REF-DUP",
        referrerId: "u-other",
        isActive: true,
        expiresAt: null,
        useCount: 1,
        maxUses: 50,
        discountValue: 10,
      });
      mockPrisma.referralRedemption.findFirst.mockResolvedValue({ id: "rd-existing" });

      await expect(redeemReferralCode("REF-DUP", "u2")).rejects.toThrow(
        "You have already used this referral code",
      );
    });
  });

  /* ─── Retargeting Pixels ───────────────────────────────────────── */

  describe("registerRetargetingPixel", () => {
    it("registers a valid pixel", async () => {
      const pixel = { id: "p1", venueId: "v1", provider: "meta", pixelId: "123", isActive: true };
      mockPrisma.retargetingPixel.upsert.mockResolvedValue(pixel);

      const result = await registerRetargetingPixel("v1", "meta", "123");
      expect(result).toEqual(pixel);
    });

    it("rejects invalid providers", async () => {
      await expect(registerRetargetingPixel("v1", "snapchat", "123")).rejects.toThrow(
        "Invalid provider",
      );
    });
  });

  /* ─── Follow-Up Sequences ─────────────────────────────────────── */

  describe("createFollowUpSequence", () => {
    it("creates a valid sequence", async () => {
      const seq = { id: "fs1", venueId: "v1", name: "Post-Show", triggerEvent: "post_show" };
      mockPrisma.followUpSequence.create.mockResolvedValue(seq);

      const result = await createFollowUpSequence("v1", {
        name: "Post-Show",
        triggerEvent: "post_show",
        steps: [{ delayHours: 24, channel: "email", templateId: "t1", subject: "Thanks!" }],
      });
      expect(result).toEqual(seq);
    });

    it("rejects invalid trigger events", async () => {
      await expect(
        createFollowUpSequence("v1", {
          name: "Bad",
          triggerEvent: "invalid_trigger",
          steps: [],
        }),
      ).rejects.toThrow("Invalid trigger event");
    });
  });

  /* ─── A/B Tests ────────────────────────────────────────────────── */

  describe("createABTest", () => {
    it("creates test with initial zero stats", async () => {
      mockPrisma.aBTest.create.mockResolvedValue({ id: "ab1", name: "Title test" });

      await createABTest({
        name: "Title test",
        type: "title",
        variantA: { value: "Comedy Night" },
        variantB: { value: "LOL Fest" },
      });

      expect(mockPrisma.aBTest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantA: { value: "Comedy Night", impressions: 0, conversions: 0 },
          variantB: { value: "LOL Fest", impressions: 0, conversions: 0 },
        }),
      });
    });
  });

  describe("recordABTestImpression", () => {
    it("increments variant A impressions", async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue({
        id: "ab1",
        status: "running",
        variantA: { value: "A", impressions: 10, conversions: 2 },
        variantB: { value: "B", impressions: 8, conversions: 1 },
      });
      mockPrisma.aBTest.update.mockResolvedValue({});

      await recordABTestImpression("ab1", "A");
      expect(mockPrisma.aBTest.update).toHaveBeenCalledWith({
        where: { id: "ab1" },
        data: { variantA: { value: "A", impressions: 11, conversions: 2 } },
      });
    });

    it("rejects impressions on non-running tests", async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue({ id: "ab1", status: "completed" });
      await expect(recordABTestImpression("ab1", "A")).rejects.toThrow("A/B test is not running");
    });
  });

  describe("calculateSignificance", () => {
    it("detects significant difference with large sample", () => {
      // A: 50% conversion, B: 30% conversion, 1000 samples each
      const result = calculateSignificance(1000, 500, 1000, 300);
      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
    });

    it("detects no significance with small sample", () => {
      // A: 50% conv, B: 40% conv, 10 samples each
      const result = calculateSignificance(10, 5, 10, 4);
      expect(result.isSignificant).toBe(false);
    });

    it("returns non-significant when zero impressions", () => {
      const result = calculateSignificance(0, 0, 0, 0);
      expect(result.isSignificant).toBe(false);
      expect(result.pValue).toBe(1);
    });
  });

  describe("getABTestResults", () => {
    it("returns winner when significant", async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue({
        id: "ab1",
        status: "running",
        variantA: { value: "A", impressions: 1000, conversions: 500 },
        variantB: { value: "B", impressions: 1000, conversions: 300 },
      });

      const result = await getABTestResults("ab1");
      expect(result.winner).toBe("A");
      expect(result.significance.isSignificant).toBe(true);
      expect(result.variantA.conversionRate).toBe(50);
      expect(result.variantB.conversionRate).toBe(30);
    });

    it("returns no winner when not significant", async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue({
        id: "ab1",
        status: "running",
        variantA: { value: "A", impressions: 10, conversions: 5 },
        variantB: { value: "B", impressions: 10, conversions: 4 },
      });

      const result = await getABTestResults("ab1");
      expect(result.winner).toBeNull();
    });
  });

  /* ─── Influencer Matching ──────────────────────────────────────── */

  describe("matchInfluencers", () => {
    it("filters by genre overlap", async () => {
      mockPrisma.influencerMatch.findMany.mockResolvedValue([
        { id: "i1", comedyGenres: ["standup", "improv"], matchScore: 90 },
        { id: "i2", comedyGenres: ["sketch"], matchScore: 70 },
      ]);

      const results = await matchInfluencers("v1", { genres: ["standup"] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("i1");
    });

    it("returns all matches without genre filter", async () => {
      const matches = [
        { id: "i1", matchScore: 90 },
        { id: "i2", matchScore: 70 },
      ];
      mockPrisma.influencerMatch.findMany.mockResolvedValue(matches);

      const results = await matchInfluencers("v1");
      expect(results).toHaveLength(2);
    });
  });
});
