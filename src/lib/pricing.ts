import { prisma } from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Phase 8.8: Dynamic Pricing & Early Bird Tiers
 */

/** Get the currently active pricing tier for a ticket type.
 *  Falls back to the TicketType base price if no tiers exist or none are active. */
export async function getCurrentPrice(ticketTypeId: string) {
  const now = new Date();

  // Get all pricing tiers for this ticket type, ordered by sortOrder
  const tiers = await prisma.pricingTier.findMany({
    where: { ticketTypeId },
    orderBy: { sortOrder: "asc" },
  });

  if (tiers.length === 0) {
    // Fall back to base price from TicketType
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });
    if (!ticketType) {
      throw new Error("Ticket type not found");
    }
    return {
      price: ticketType.price,
      tierName: null,
      tierId: null,
      isBaseFallback: true,
    };
  }

  // Find the active tier: startsAt <= now, (endsAt is null OR endsAt >= now), not sold out
  const activeTier = tiers.find((tier) => {
    const started = tier.startsAt <= now;
    const notEnded = !tier.endsAt || tier.endsAt >= now;
    const notSoldOut = tier.maxQuantity === null || tier.sold < tier.maxQuantity;
    return started && notEnded && notSoldOut;
  });

  if (activeTier) {
    return {
      price: activeTier.price,
      tierName: activeTier.name,
      tierId: activeTier.id,
      isBaseFallback: false,
    };
  }

  // No active tier found — fall back to base price
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });
  if (!ticketType) {
    throw new Error("Ticket type not found");
  }
  return {
    price: ticketType.price,
    tierName: null,
    tierId: null,
    isBaseFallback: true,
  };
}

/** Get all pricing tiers for a ticket type, ordered by sortOrder */
export async function getPricingTiers(ticketTypeId: string) {
  return prisma.pricingTier.findMany({
    where: { ticketTypeId },
    orderBy: { sortOrder: "asc" },
  });
}

/** Create a new pricing tier */
export async function createPricingTier(data: {
  ticketTypeId: string;
  name: string;
  price: number | Decimal;
  startsAt: Date;
  endsAt?: Date | null;
  maxQuantity?: number | null;
  sortOrder?: number;
}) {
  // Verify the ticket type exists
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: data.ticketTypeId },
  });
  if (!ticketType) {
    throw new Error("Ticket type not found");
  }

  // Get max sort order if not provided
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const maxSort = await prisma.pricingTier.aggregate({
      where: { ticketTypeId: data.ticketTypeId },
      _max: { sortOrder: true },
    });
    sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  }

  return prisma.pricingTier.create({
    data: {
      ticketTypeId: data.ticketTypeId,
      name: data.name,
      price: data.price,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      maxQuantity: data.maxQuantity ?? null,
      sortOrder,
    },
  });
}

/** Get pricing summary for all ticket types on an event */
export async function getEventPricingSummary(eventId: string) {
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
    include: {
      pricingTiers: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const now = new Date();

  return ticketTypes.map((tt) => {
    const tiers = tt.pricingTiers;

    // Find active tier
    const activeTier = tiers.find((tier) => {
      const started = tier.startsAt <= now;
      const notEnded = !tier.endsAt || tier.endsAt >= now;
      const notSoldOut =
        tier.maxQuantity === null || tier.sold < tier.maxQuantity;
      return started && notEnded && notSoldOut;
    });

    const currentPrice = activeTier ? activeTier.price : tt.price;
    const currentTierName = activeTier ? activeTier.name : null;

    // Find next upcoming tier (starts after now, or active tier's end)
    const nextTier = tiers.find((tier) => {
      return tier.startsAt > now;
    });

    // Calculate savings compared to next tier or base price
    let savings: Decimal | null = null;
    let savingsComparedTo: string | null = null;
    let savingsEndsAt: Date | null = null;

    if (activeTier) {
      if (nextTier) {
        const diff = nextTier.price.toNumber() - activeTier.price.toNumber();
        if (diff > 0) {
          savings = new Decimal(diff);
          savingsComparedTo = nextTier.name;
          savingsEndsAt = activeTier.endsAt ?? null;
        }
      } else {
        // Compare to base price
        const diff = tt.price.toNumber() - activeTier.price.toNumber();
        if (diff > 0) {
          savings = new Decimal(diff);
          savingsComparedTo = "regular price";
          savingsEndsAt = activeTier.endsAt ?? null;
        }
      }
    }

    return {
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      basePrice: tt.price,
      currentPrice,
      currentTierName,
      nextTier: nextTier
        ? {
            name: nextTier.name,
            price: nextTier.price,
            startsAt: nextTier.startsAt,
          }
        : null,
      savings: savings ? savings.toString() : null,
      savingsComparedTo,
      savingsEndsAt,
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        maxQuantity: t.maxQuantity,
        sold: t.sold,
        isActive:
          t.startsAt <= now &&
          (!t.endsAt || t.endsAt >= now) &&
          (t.maxQuantity === null || t.sold < t.maxQuantity),
        isSoldOut:
          t.maxQuantity !== null && t.sold >= t.maxQuantity,
      })),
    };
  });
}
