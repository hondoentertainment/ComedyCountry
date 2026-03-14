import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/**
 * Phase 16: Audience Growth & Marketing Suite
 */

/* ─── SMS Campaigns ──────────────────────────────────────────────────── */

export async function createSMSCampaign(
  venueId: string,
  data: { name: string; message: string; segmentId?: string },
) {
  if (data.message.length > 160) {
    throw new Error("SMS message must be 160 characters or fewer");
  }

  return prisma.sMSCampaign.create({
    data: {
      venueId,
      name: data.name,
      message: data.message,
      segmentId: data.segmentId ?? null,
    },
  });
}

export async function scheduleSMSCampaign(
  campaignId: string,
  scheduledAt: Date,
) {
  if (scheduledAt <= new Date()) {
    throw new Error("Scheduled time must be in the future");
  }

  const campaign = await prisma.sMSCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.status !== "draft") {
    throw new Error("Only draft campaigns can be scheduled");
  }

  return prisma.sMSCampaign.update({
    where: { id: campaignId },
    data: {
      scheduledAt,
      status: "scheduled",
    },
  });
}

export async function getSMSCampaigns(venueId: string) {
  return prisma.sMSCampaign.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSMSCampaignStats(campaignId: string) {
  const campaign = await prisma.sMSCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const deliveryRate =
    campaign.recipientCount > 0
      ? (campaign.deliveredCount / campaign.recipientCount) * 100
      : 0;

  const clickRate =
    campaign.deliveredCount > 0
      ? (campaign.clickCount / campaign.deliveredCount) * 100
      : 0;

  const optOutRate =
    campaign.deliveredCount > 0
      ? (campaign.optOutCount / campaign.deliveredCount) * 100
      : 0;

  return {
    ...campaign,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    optOutRate: Math.round(optOutRate * 100) / 100,
  };
}

/* ─── SMS Subscribers (TCPA-compliant opt-in/out) ────────────────────── */

export async function addSMSSubscriber(
  phone: string,
  venueId: string,
  source: string = "web",
) {
  // Validate phone format (basic E.164-like check)
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error("Invalid phone number");
  }

  // Check if already subscribed
  const existing = await prisma.sMSSubscriber.findUnique({
    where: { phone_venueId: { phone: cleaned, venueId } },
  });

  if (existing && existing.optedIn) {
    return existing;
  }

  if (existing && !existing.optedIn) {
    // Re-opt-in
    return prisma.sMSSubscriber.update({
      where: { id: existing.id },
      data: {
        optedIn: true,
        optInDate: new Date(),
        optOutDate: null,
        source,
      },
    });
  }

  return prisma.sMSSubscriber.create({
    data: {
      phone: cleaned,
      venueId,
      source,
    },
  });
}

export async function removeSMSSubscriber(phone: string, venueId: string) {
  const cleaned = phone.replace(/\D/g, "");

  const existing = await prisma.sMSSubscriber.findUnique({
    where: { phone_venueId: { phone: cleaned, venueId } },
  });

  if (!existing) {
    throw new Error("Subscriber not found");
  }

  return prisma.sMSSubscriber.update({
    where: { id: existing.id },
    data: {
      optedIn: false,
      optOutDate: new Date(),
    },
  });
}

export async function getSMSSubscriberCount(venueId: string) {
  return prisma.sMSSubscriber.count({
    where: { venueId, optedIn: true },
  });
}

/* ─── Audience Segments ──────────────────────────────────────────────── */

export async function createAudienceSegment(data: {
  venueId?: string;
  name: string;
  description?: string;
  criteria: Record<string, unknown>;
  isSystem?: boolean;
}) {
  return prisma.audienceSegment.create({
    data: {
      venueId: data.venueId ?? null,
      name: data.name,
      description: data.description ?? null,
      criteria: data.criteria,
      isSystem: data.isSystem ?? false,
    },
  });
}

export async function getAudienceSegments(venueId: string) {
  return prisma.audienceSegment.findMany({
    where: {
      OR: [{ venueId }, { venueId: null, isSystem: true }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export function evaluateSegmentCriteria(
  criteria: {
    tasteGenres?: string[];
    minVisits?: number;
    minSpend?: number;
    maxDaysSinceVisit?: number;
    locations?: string[];
  },
  userProfile: {
    genres?: string[];
    visitCount?: number;
    totalSpend?: number;
    lastVisitDate?: Date;
    location?: string;
  },
): boolean {
  // Check genre overlap
  if (criteria.tasteGenres && criteria.tasteGenres.length > 0) {
    const userGenres = userProfile.genres ?? [];
    const hasOverlap = criteria.tasteGenres.some((g) =>
      userGenres.includes(g),
    );
    if (!hasOverlap) return false;
  }

  // Check minimum visit count
  if (criteria.minVisits !== undefined) {
    if ((userProfile.visitCount ?? 0) < criteria.minVisits) return false;
  }

  // Check minimum spend
  if (criteria.minSpend !== undefined) {
    if ((userProfile.totalSpend ?? 0) < criteria.minSpend) return false;
  }

  // Check recency (max days since last visit)
  if (criteria.maxDaysSinceVisit !== undefined && userProfile.lastVisitDate) {
    const daysSince = Math.floor(
      (Date.now() - userProfile.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince > criteria.maxDaysSinceVisit) return false;
  }

  // Check location
  if (criteria.locations && criteria.locations.length > 0) {
    if (!userProfile.location) return false;
    if (!criteria.locations.includes(userProfile.location)) return false;
  }

  return true;
}

/* ─── Referral Codes ─────────────────────────────────────────────────── */

export async function generateReferralCode(
  userId: string,
  options: {
    eventId?: string;
    venueId?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    maxUses?: number;
    expiresAt?: Date;
  } = {},
) {
  const code = `REF-${randomBytes(4).toString("hex").toUpperCase()}`;

  return prisma.referralCode.create({
    data: {
      code,
      referrerId: userId,
      eventId: options.eventId ?? null,
      venueId: options.venueId ?? null,
      discountType: options.discountType ?? "percentage",
      discountValue: options.discountValue ?? 10,
      maxUses: options.maxUses ?? 50,
      expiresAt: options.expiresAt ?? null,
    },
  });
}

export async function validateReferralCode(code: string) {
  const referral = await prisma.referralCode.findUnique({
    where: { code },
  });

  if (!referral) {
    return { valid: false, reason: "Code not found" };
  }

  if (!referral.isActive) {
    return { valid: false, reason: "Code is inactive" };
  }

  if (referral.expiresAt && referral.expiresAt < new Date()) {
    return { valid: false, reason: "Code has expired" };
  }

  if (referral.useCount >= referral.maxUses) {
    return { valid: false, reason: "Code has reached maximum uses" };
  }

  return {
    valid: true,
    referral,
    discountType: referral.discountType,
    discountValue: referral.discountValue,
  };
}

export async function redeemReferralCode(
  code: string,
  userId: string,
  orderId?: string,
) {
  const validation = await validateReferralCode(code);

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const referral = validation.referral!;

  // Prevent self-referral
  if (referral.referrerId === userId) {
    throw new Error("Cannot use your own referral code");
  }

  // Prevent duplicate redemption by the same user
  const existingRedemption = await prisma.referralRedemption.findFirst({
    where: { codeId: referral.id, userId },
  });

  if (existingRedemption) {
    throw new Error("You have already used this referral code");
  }

  const discount = referral.discountValue;

  // Create redemption and update use count in a transaction
  const [redemption] = await prisma.$transaction([
    prisma.referralRedemption.create({
      data: {
        codeId: referral.id,
        userId,
        orderId: orderId ?? null,
        discount,
      },
    }),
    prisma.referralCode.update({
      where: { id: referral.id },
      data: {
        useCount: { increment: 1 },
      },
    }),
  ]);

  return redemption;
}

export async function getReferralStats(userId: string) {
  const codes = await prisma.referralCode.findMany({
    where: { referrerId: userId },
    include: { redemptions: true },
  });

  const totalCodes = codes.length;
  const totalRedemptions = codes.reduce((sum, c) => sum + c.useCount, 0);
  const totalRevenue = codes.reduce((sum, c) => sum + c.revenue, 0);
  const activeCodes = codes.filter((c) => c.isActive).length;

  return {
    totalCodes,
    activeCodes,
    totalRedemptions,
    totalRevenue,
    codes,
  };
}

/* ─── Retargeting Pixels ─────────────────────────────────────────────── */

export async function registerRetargetingPixel(
  venueId: string,
  provider: string,
  pixelId: string,
  events: string[] = ["page_view"],
) {
  const validProviders = ["meta", "google", "tiktok"];
  if (!validProviders.includes(provider)) {
    throw new Error(`Invalid provider. Must be one of: ${validProviders.join(", ")}`);
  }

  return prisma.retargetingPixel.upsert({
    where: { venueId_provider: { venueId, provider } },
    update: { pixelId, events, isActive: true },
    create: { venueId, provider, pixelId, events },
  });
}

export async function getRetargetingPixels(venueId: string) {
  return prisma.retargetingPixel.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Follow-Up Sequences ────────────────────────────────────────────── */

export async function createFollowUpSequence(
  venueId: string,
  data: {
    name: string;
    triggerEvent: string;
    steps: Array<{
      delayHours: number;
      channel: "email" | "sms" | "push";
      templateId: string;
      subject?: string;
    }>;
  },
) {
  const validTriggers = [
    "post_show",
    "ticket_purchase",
    "first_visit",
    "no_show",
  ];
  if (!validTriggers.includes(data.triggerEvent)) {
    throw new Error(
      `Invalid trigger event. Must be one of: ${validTriggers.join(", ")}`,
    );
  }

  return prisma.followUpSequence.create({
    data: {
      venueId,
      name: data.name,
      triggerEvent: data.triggerEvent,
      steps: data.steps,
    },
  });
}

export async function getFollowUpSequences(venueId: string) {
  return prisma.followUpSequence.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── A/B Tests ──────────────────────────────────────────────────────── */

export async function createABTest(data: {
  eventId?: string;
  venueId?: string;
  name: string;
  type: string;
  variantA: { value: string };
  variantB: { value: string };
}) {
  return prisma.aBTest.create({
    data: {
      eventId: data.eventId ?? null,
      venueId: data.venueId ?? null,
      name: data.name,
      type: data.type,
      variantA: { value: data.variantA.value, impressions: 0, conversions: 0 },
      variantB: { value: data.variantB.value, impressions: 0, conversions: 0 },
    },
  });
}

export async function recordABTestImpression(
  testId: string,
  variant: "A" | "B",
) {
  const test = await prisma.aBTest.findUnique({ where: { id: testId } });
  if (!test) throw new Error("A/B test not found");
  if (test.status !== "running") throw new Error("A/B test is not running");

  const field = variant === "A" ? "variantA" : "variantB";
  const data = test[field] as { value: string; impressions: number; conversions: number };

  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      [field]: { ...data, impressions: data.impressions + 1 },
    },
  });
}

export async function recordABTestConversion(
  testId: string,
  variant: "A" | "B",
) {
  const test = await prisma.aBTest.findUnique({ where: { id: testId } });
  if (!test) throw new Error("A/B test not found");
  if (test.status !== "running") throw new Error("A/B test is not running");

  const field = variant === "A" ? "variantA" : "variantB";
  const data = test[field] as { value: string; impressions: number; conversions: number };

  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      [field]: { ...data, conversions: data.conversions + 1 },
    },
  });
}

/** Calculate statistical significance using a two-proportion z-test */
function calculateSignificance(
  impressionsA: number,
  conversionsA: number,
  impressionsB: number,
  conversionsB: number,
): { zScore: number; pValue: number; isSignificant: boolean } {
  if (impressionsA === 0 || impressionsB === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const pA = conversionsA / impressionsA;
  const pB = conversionsB / impressionsB;
  const pPooled =
    (conversionsA + conversionsB) / (impressionsA + impressionsB);

  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / impressionsA + 1 / impressionsB),
  );

  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const zScore = (pA - pB) / se;
  // Approximate p-value using normal CDF approximation
  const absZ = Math.abs(zScore);
  const pValue = 2 * (1 - normalCDF(absZ));

  return {
    zScore: Math.round(zScore * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    isSignificant: pValue < 0.05,
  };
}

/** Approximation of the standard normal CDF */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

export async function getABTestResults(testId: string) {
  const test = await prisma.aBTest.findUnique({ where: { id: testId } });
  if (!test) throw new Error("A/B test not found");

  const vA = test.variantA as { value: string; impressions: number; conversions: number };
  const vB = test.variantB as { value: string; impressions: number; conversions: number };

  const rateA = vA.impressions > 0 ? (vA.conversions / vA.impressions) * 100 : 0;
  const rateB = vB.impressions > 0 ? (vB.conversions / vB.impressions) * 100 : 0;

  const significance = calculateSignificance(
    vA.impressions,
    vA.conversions,
    vB.impressions,
    vB.conversions,
  );

  let winner: string | null = null;
  if (significance.isSignificant) {
    winner = rateA > rateB ? "A" : "B";
  }

  return {
    test,
    variantA: { ...vA, conversionRate: Math.round(rateA * 100) / 100 },
    variantB: { ...vB, conversionRate: Math.round(rateB * 100) / 100 },
    significance,
    winner,
  };
}

// Export for testing
export { calculateSignificance };

/* ─── Influencer Matching ────────────────────────────────────────────── */

export async function matchInfluencers(
  venueId: string,
  criteria: {
    platform?: string;
    minFollowers?: number;
    minEngagement?: number;
    genres?: string[];
    location?: string;
  } = {},
) {
  const where: Record<string, unknown> = { venueId };

  if (criteria.platform) {
    where.platform = criteria.platform;
  }
  if (criteria.minFollowers) {
    where.followerCount = { gte: criteria.minFollowers };
  }
  if (criteria.minEngagement) {
    where.engagementRate = { gte: criteria.minEngagement };
  }
  if (criteria.location) {
    where.location = criteria.location;
  }

  const matches = await prisma.influencerMatch.findMany({
    where,
    orderBy: { matchScore: "desc" },
  });

  // Filter by genres if specified (array overlap check in app layer)
  if (criteria.genres && criteria.genres.length > 0) {
    return matches.filter((m) =>
      criteria.genres!.some((g) => m.comedyGenres.includes(g)),
    );
  }

  return matches;
}

export async function getInfluencerMatches(venueId: string) {
  return prisma.influencerMatch.findMany({
    where: { venueId },
    orderBy: { matchScore: "desc" },
  });
}
