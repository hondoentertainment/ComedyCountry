import { prisma } from "./prisma";
import { computeDynamicPrice, getDemandMultiplier } from "./dynamic-pricing";

/**
 * AI Pricing with Social Signals
 *
 * Enhances demand-based dynamic pricing with social data:
 * - Comedian's total social following
 * - Fan engagement rate
 * - Previous event sell-through history
 * - Waitlist demand pressure
 * - Discovery buzz level
 *
 * Produces a smarter price recommendation that factors in real
 * audience demand signals beyond just current ticket sales.
 */

// ── Signal weights ───────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS = {
  demandMultiplier: 0.35, // Current sell-through (existing system)
  socialFollowing: 0.20, // Comedian's total followers
  historicalPerformance: 0.20, // Past events' sell-through
  waitlistPressure: 0.10, // Active waitlist size relative to capacity
  engagementRate: 0.10, // Fan engagement across platforms
  buzzLevel: 0.05, // Discovery engine buzz signal
};

// ── Social signal computation ────────────────────────────────────────────────

interface SocialSignals {
  totalFollowers: number;
  avgEngagementRate: number;
  historicalSellThrough: number;
  waitlistRatio: number;
  buzzMultiplier: number;
  signalStrength: number; // 0-1 confidence in signal quality
}

async function computeSocialSignals(eventId: string): Promise<SocialSignals> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      comedians: {
        include: {
          comedian: {
            include: {
              _count: { select: { followers: true } },
            },
          },
        },
      },
      venue: { select: { id: true, capacity: true } },
    },
  });

  if (!event) throw new Error("Event not found");

  // 1. Total social following across all performing comedians
  const comedianIds = event.comedians.map((ec) => ec.comedianId);
  let totalFollowers = event.comedians.reduce(
    (sum, ec) => sum + ec.comedian._count.followers,
    0
  );

  // Add audience unification data (TikTok, Instagram, YouTube, etc.)
  const audienceData = await prisma.audienceUnification.findMany({
    where: { comedianId: { in: comedianIds } },
    select: { followerCount: true, engagementRate: true },
  });

  const externalFollowers = audienceData.reduce(
    (sum, a) => sum + (a.followerCount ?? 0),
    0
  );
  totalFollowers += externalFollowers;

  // 2. Average engagement rate
  const engagementRates = audienceData
    .filter((a) => a.engagementRate !== null)
    .map((a) => a.engagementRate!);
  const avgEngagementRate =
    engagementRates.length > 0
      ? engagementRates.reduce((s, r) => s + r, 0) / engagementRates.length
      : 0;

  // 3. Historical sell-through for comedians at similar venues
  const pastEvents = await prisma.event.findMany({
    where: {
      comedians: { some: { comedianId: { in: comedianIds } } },
      date: { lt: event.date },
    },
    include: {
      ticketTypes: { select: { capacity: true, sold: true } },
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  const historicalSellThroughs = pastEvents.map((e) => {
    const cap = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
    const sold = e.ticketTypes.reduce((s, t) => s + t.sold, 0);
    return cap > 0 ? sold / cap : 0;
  });
  const historicalSellThrough =
    historicalSellThroughs.length > 0
      ? historicalSellThroughs.reduce((s, v) => s + v, 0) / historicalSellThroughs.length
      : 0.5; // Default assumption: 50% sell-through

  // 4. Waitlist pressure
  const waitlistCount = await prisma.ticketWaitlistQueue.count({
    where: { eventId, status: "WAITING" },
  });
  const venueCapacity = event.venue.capacity ?? 200;
  const waitlistRatio = waitlistCount / Math.max(venueCapacity, 1);

  // 5. Buzz level from discovery engine
  let buzzMultiplier = 1.0;
  try {
    const socialProof = await prisma.socialProof.findFirst({
      where: { entityType: "EVENT", entityId: eventId },
    });
    if (socialProof) {
      const buzzMap: Record<string, number> = {
        VIRAL: 1.4,
        HIGH: 1.2,
        MEDIUM: 1.1,
        LOW: 1.0,
      };
      buzzMultiplier = buzzMap[socialProof.buzzLevel] ?? 1.0;
    }
  } catch {
    // SocialProof table may not be available
  }

  // Signal strength: how much data do we have?
  const dataPoints = [
    totalFollowers > 0 ? 1 : 0,
    engagementRates.length > 0 ? 1 : 0,
    pastEvents.length > 0 ? 1 : 0,
    waitlistCount > 0 ? 1 : 0,
    buzzMultiplier > 1.0 ? 1 : 0,
  ];
  const signalStrength = dataPoints.reduce((s, v) => s + v, 0) / dataPoints.length;

  return {
    totalFollowers,
    avgEngagementRate,
    historicalSellThrough,
    waitlistRatio,
    buzzMultiplier,
    signalStrength,
  };
}

// ── Composite price calculation ──────────────────────────────────────────────

export interface SocialPricingResult {
  recommendedPrice: number;
  basePrice: number;
  demandMultiplier: number;
  socialMultiplier: number;
  compositeMultiplier: number;
  signals: SocialSignals;
  breakdown: {
    demandComponent: number;
    socialFollowingComponent: number;
    historicalComponent: number;
    waitlistComponent: number;
    engagementComponent: number;
    buzzComponent: number;
  };
  confidence: number; // 0-1
}

/**
 * Calculate a price recommendation using both demand data and social signals.
 */
export async function computeSocialPrice(
  ticketTypeId: string,
  options?: { floor?: number; ceiling?: number }
): Promise<SocialPricingResult> {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) throw new Error("Ticket type not found");

  const basePrice = Number(ticketType.price);
  const signals = await computeSocialSignals(ticketType.eventId);

  // 1. Demand multiplier (existing system)
  const demandMult = getDemandMultiplier(ticketType.sold, ticketType.capacity);

  // 2. Social following multiplier (logarithmic scale)
  // 1K followers = 1.0x, 10K = 1.05x, 100K = 1.1x, 1M = 1.15x
  const followerMult =
    signals.totalFollowers > 0
      ? 1.0 + Math.log10(signals.totalFollowers / 1000) * 0.05
      : 1.0;
  const clampedFollowerMult = Math.max(0.95, Math.min(followerMult, 1.2));

  // 3. Historical sell-through multiplier
  // <30% = 0.9x, 30-60% = 1.0x, 60-80% = 1.1x, >80% = 1.2x
  let historicalMult = 1.0;
  if (signals.historicalSellThrough >= 0.8) historicalMult = 1.2;
  else if (signals.historicalSellThrough >= 0.6) historicalMult = 1.1;
  else if (signals.historicalSellThrough < 0.3) historicalMult = 0.9;

  // 4. Waitlist pressure multiplier
  // Ratio > 0.5 means more than half capacity on waitlist → strong demand
  const waitlistMult = 1.0 + Math.min(signals.waitlistRatio, 1.0) * 0.15;

  // 5. Engagement rate multiplier
  // >5% engagement = premium, <1% = discount
  const engagementMult =
    signals.avgEngagementRate > 0.05
      ? 1.1
      : signals.avgEngagementRate > 0.02
        ? 1.05
        : signals.avgEngagementRate < 0.01
          ? 0.95
          : 1.0;

  // 6. Buzz multiplier (already computed)
  const buzzMult = signals.buzzMultiplier;

  // Weighted composite multiplier
  const compositeMultiplier =
    demandMult * SIGNAL_WEIGHTS.demandMultiplier +
    clampedFollowerMult * SIGNAL_WEIGHTS.socialFollowing +
    historicalMult * SIGNAL_WEIGHTS.historicalPerformance +
    waitlistMult * SIGNAL_WEIGHTS.waitlistPressure +
    engagementMult * SIGNAL_WEIGHTS.engagementRate +
    buzzMult * SIGNAL_WEIGHTS.buzzLevel;

  // The social multiplier is everything except demand
  const socialMultiplier =
    clampedFollowerMult * SIGNAL_WEIGHTS.socialFollowing +
    historicalMult * SIGNAL_WEIGHTS.historicalPerformance +
    waitlistMult * SIGNAL_WEIGHTS.waitlistPressure +
    engagementMult * SIGNAL_WEIGHTS.engagementRate +
    buzzMult * SIGNAL_WEIGHTS.buzzLevel;

  let recommendedPrice = Math.round(basePrice * compositeMultiplier * 100) / 100;

  // Apply floor/ceiling
  if (options?.floor && recommendedPrice < options.floor) {
    recommendedPrice = options.floor;
  }
  if (options?.ceiling && recommendedPrice > options.ceiling) {
    recommendedPrice = options.ceiling;
  }

  return {
    recommendedPrice,
    basePrice,
    demandMultiplier: demandMult,
    socialMultiplier: Math.round(socialMultiplier * 100) / 100,
    compositeMultiplier: Math.round(compositeMultiplier * 100) / 100,
    signals,
    breakdown: {
      demandComponent: Math.round(demandMult * SIGNAL_WEIGHTS.demandMultiplier * 100) / 100,
      socialFollowingComponent:
        Math.round(clampedFollowerMult * SIGNAL_WEIGHTS.socialFollowing * 100) / 100,
      historicalComponent:
        Math.round(historicalMult * SIGNAL_WEIGHTS.historicalPerformance * 100) / 100,
      waitlistComponent:
        Math.round(waitlistMult * SIGNAL_WEIGHTS.waitlistPressure * 100) / 100,
      engagementComponent:
        Math.round(engagementMult * SIGNAL_WEIGHTS.engagementRate * 100) / 100,
      buzzComponent: Math.round(buzzMult * SIGNAL_WEIGHTS.buzzLevel * 100) / 100,
    },
    confidence: signals.signalStrength,
  };
}

/**
 * Get social pricing for all ticket types of an event.
 */
export async function getEventSocialPricing(
  eventId: string,
  options?: { floor?: number; ceiling?: number }
): Promise<SocialPricingResult[]> {
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
  });

  const results: SocialPricingResult[] = [];
  for (const tt of ticketTypes) {
    const result = await computeSocialPrice(tt.id, options);
    results.push(result);
  }

  return results;
}
