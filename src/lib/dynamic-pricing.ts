import { prisma } from "./prisma";

/**
 * Phase 8.8: Dynamic Pricing & Early Bird Tiers
 *
 * Provides demand-based dynamic pricing, time-based early bird tiers,
 * and price suggestion logic for event ticket types.
 */

/** Demand multiplier thresholds */
const DEMAND_TIERS = [
  { threshold: 0.9, multiplier: 1.5 }, // >90% sold → 1.5x
  { threshold: 0.75, multiplier: 1.25 }, // >75% sold → 1.25x
  { threshold: 0.5, multiplier: 1.1 }, // >50% sold → 1.1x
  { threshold: 0.25, multiplier: 1.0 }, // >25% sold → base
  { threshold: 0, multiplier: 0.9 }, // <25% sold → 0.9x (discount)
];

/** Compute a demand multiplier based on sell-through rate */
export function getDemandMultiplier(sold: number, capacity: number): number {
  if (capacity <= 0) return 1.0;
  const sellThrough = sold / capacity;

  for (const tier of DEMAND_TIERS) {
    if (sellThrough >= tier.threshold) {
      return tier.multiplier;
    }
  }
  return 1.0;
}

/**
 * Compute the dynamic price for a ticket type based on current demand.
 * Takes the base price and adjusts it by the demand multiplier,
 * clamped between optional floor and ceiling.
 */
export function computeDynamicPrice(
  basePrice: number,
  sold: number,
  capacity: number,
  options?: { floor?: number; ceiling?: number }
): { price: number; multiplier: number; sellThrough: number } {
  const multiplier = getDemandMultiplier(sold, capacity);
  let price = Math.round(basePrice * multiplier * 100) / 100;

  if (options?.floor !== undefined && price < options.floor) {
    price = options.floor;
  }
  if (options?.ceiling !== undefined && price > options.ceiling) {
    price = options.ceiling;
  }

  return {
    price,
    multiplier,
    sellThrough: capacity > 0 ? sold / capacity : 0,
  };
}

/**
 * Get the currently active pricing tier for a ticket type.
 * Returns the tier whose time window includes "now" (or a provided date).
 * If no tier matches, returns null.
 */
export async function getActivePricingTier(
  ticketTypeId: string,
  asOf?: Date
) {
  const now = asOf ?? new Date();

  const tiers = await prisma.pricingTier.findMany({
    where: { ticketTypeId },
    orderBy: { sortOrder: "asc" },
  });

  // Find the tier whose window contains `now`
  for (const tier of tiers) {
    const starts = tier.startsAt <= now;
    const ends = !tier.endsAt || tier.endsAt >= now;
    const withinCap = tier.maxQuantity === null || tier.sold < tier.maxQuantity;

    if (starts && ends && withinCap) {
      return tier;
    }
  }

  return null;
}

/**
 * Get the effective price for a ticket type, considering:
 * 1. Active pricing tier (early bird, advance, door)
 * 2. Demand-based dynamic adjustment (optional)
 *
 * Returns the final price and metadata about how it was determined.
 */
export async function getEffectivePrice(
  ticketTypeId: string,
  options?: { enableDynamicPricing?: boolean; floor?: number; ceiling?: number }
) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found");
  }

  const basePrice = Number(ticketType.price);

  // Check for an active tier first
  const activeTier = await getActivePricingTier(ticketTypeId);
  const tierPrice = activeTier ? Number(activeTier.price) : basePrice;
  const tierName = activeTier?.name ?? "Standard";

  // Optionally apply demand-based adjustment on top of the tier price
  if (options?.enableDynamicPricing) {
    const dynamic = computeDynamicPrice(
      tierPrice,
      ticketType.sold,
      ticketType.capacity,
      { floor: options.floor, ceiling: options.ceiling }
    );
    return {
      price: dynamic.price,
      basePrice,
      tierName,
      tierPrice,
      dynamicMultiplier: dynamic.multiplier,
      sellThrough: dynamic.sellThrough,
      source: "dynamic" as const,
    };
  }

  return {
    price: tierPrice,
    basePrice,
    tierName,
    tierPrice,
    dynamicMultiplier: 1.0,
    sellThrough: ticketType.capacity > 0 ? ticketType.sold / ticketType.capacity : 0,
    source: "tier" as const,
  };
}

/**
 * Create early bird pricing tiers for a ticket type.
 * Generates tiers with progressively increasing prices leading up to the event.
 */
export async function createEarlyBirdTiers(
  ticketTypeId: string,
  eventDate: Date,
  tiers: Array<{
    name: string;
    price: number;
    daysBeforeEvent: number;
    maxQuantity?: number;
  }>
) {
  // Sort tiers by daysBeforeEvent descending (earliest first)
  const sorted = [...tiers].sort(
    (a, b) => b.daysBeforeEvent - a.daysBeforeEvent
  );

  const created = [];
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const startsAt =
      i === 0
        ? new Date(0) // first tier starts immediately
        : new Date(
            eventDate.getTime() -
              sorted[i].daysBeforeEvent * 24 * 60 * 60 * 1000
          );

    const endsAt =
      i < sorted.length - 1
        ? new Date(
            eventDate.getTime() -
              sorted[i + 1].daysBeforeEvent * 24 * 60 * 60 * 1000
          )
        : eventDate;

    const record = await prisma.pricingTier.create({
      data: {
        ticketTypeId,
        name: tier.name,
        price: tier.price,
        startsAt,
        endsAt,
        maxQuantity: tier.maxQuantity ?? null,
        sortOrder: i,
      },
    });

    created.push(record);
  }

  return created;
}

/**
 * Suggest prices for an event based on comparable events at the same venue.
 * Looks at recent events at the venue and computes percentile-based suggestions.
 */
export async function suggestPricing(
  venueId: string,
  options?: { months?: number }
) {
  const lookback = options?.months ?? 6;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - lookback);

  const ticketTypes = await prisma.ticketType.findMany({
    where: {
      event: {
        venueId,
        date: { gte: cutoff },
      },
    },
    select: {
      price: true,
      capacity: true,
      sold: true,
    },
  });

  if (ticketTypes.length === 0) {
    return null;
  }

  const prices = ticketTypes.map((tt) => Number(tt.price)).sort((a, b) => a - b);
  const sellThroughs = ticketTypes.map((tt) =>
    tt.capacity > 0 ? tt.sold / tt.capacity : 0
  );

  const avgSellThrough =
    sellThroughs.reduce((sum, st) => sum + st, 0) / sellThroughs.length;

  const median = prices[Math.floor(prices.length / 2)];
  const min = prices[0];
  const max = prices[prices.length - 1];
  const avg = Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100;

  return {
    suggested: median,
    earlyBird: Math.round(median * 0.8 * 100) / 100,
    lastMinute: Math.round(median * 1.3 * 100) / 100,
    stats: {
      min,
      max,
      avg,
      median,
      sampleSize: prices.length,
      avgSellThrough: Math.round(avgSellThrough * 100) / 100,
    },
  };
}

/**
 * List all pricing tiers for a ticket type, ordered by sortOrder.
 */
export async function getPricingTiers(ticketTypeId: string) {
  return prisma.pricingTier.findMany({
    where: { ticketTypeId },
    orderBy: { sortOrder: "asc" },
  });
}
