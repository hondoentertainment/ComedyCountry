import { prisma } from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Phase 12: Anti-Scalping & Fair Ticketing — Business Logic
 *
 * Addresses the #1 fan pain point: scalpers and hidden fees.
 * Provides transparent pricing, identity verification, fair waitlists,
 * and controlled resale with artist revenue sharing.
 */

// ── Fair Price Policy ────────────────────────────────────────────────────────

export interface FairPricePolicyConfig {
  showAllFees?: boolean;
  maxMarkupPercent?: number;
  allowResale?: boolean;
  resaleMaxPercent?: number;
  antiScalpingEnabled?: boolean;
}

/** Create or update a fair price policy for an event */
export async function createFairPricePolicy(
  eventId: string,
  config: FairPricePolicyConfig
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Event not found");
  }

  return prisma.fairPricePolicy.upsert({
    where: { eventId },
    create: {
      eventId,
      showAllFees: config.showAllFees ?? true,
      maxMarkupPercent: config.maxMarkupPercent ?? 0,
      allowResale: config.allowResale ?? false,
      resaleMaxPercent: config.resaleMaxPercent ?? 0,
      antiScalpingEnabled: config.antiScalpingEnabled ?? true,
    },
    update: {
      showAllFees: config.showAllFees,
      maxMarkupPercent: config.maxMarkupPercent,
      allowResale: config.allowResale,
      resaleMaxPercent: config.resaleMaxPercent,
      antiScalpingEnabled: config.antiScalpingEnabled,
    },
  });
}

/** Get the fair price policy for an event */
export async function getFairPricePolicy(eventId: string) {
  return prisma.fairPricePolicy.findUnique({ where: { eventId } });
}

// ── Transparent Pricing ──────────────────────────────────────────────────────

const SERVICE_FEE_RATE = 0.1; // 10% service fee
const PROCESSING_FEE_RATE = 0.029; // 2.9% payment processing
const PROCESSING_FEE_FLAT = 0.3; // $0.30 flat processing fee

/** Compute price with ALL fees shown upfront, log to PriceTransparencyLog */
export async function calculateTransparentPrice(
  ticketTypeId: string,
  eventId: string
) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found");
  }

  if (ticketType.eventId !== eventId) {
    throw new Error("Ticket type does not belong to this event");
  }

  const basePrice = Number(ticketType.price);
  const serviceFee = Math.round(basePrice * SERVICE_FEE_RATE * 100) / 100;
  const processingFee =
    Math.round((basePrice * PROCESSING_FEE_RATE + PROCESSING_FEE_FLAT) * 100) /
    100;
  const totalPrice =
    Math.round((basePrice + serviceFee + processingFee) * 100) / 100;
  const feePercentage =
    basePrice > 0
      ? Math.round(((totalPrice - basePrice) / basePrice) * 10000) / 100
      : 0;

  // Log for audit trail
  await prisma.priceTransparencyLog.create({
    data: {
      ticketTypeId,
      basePrice: new Decimal(basePrice.toFixed(2)),
      serviceFee: new Decimal(serviceFee.toFixed(2)),
      processingFee: new Decimal(processingFee.toFixed(2)),
      totalPrice: new Decimal(totalPrice.toFixed(2)),
      feePercentage,
    },
  });

  return {
    basePrice,
    serviceFee,
    processingFee,
    totalPrice,
    feePercentage,
  };
}

/** Get a detailed fee breakdown for transparency display (no logging) */
export async function getFeeBreakdown(
  ticketTypeId: string,
  eventId: string
) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found");
  }

  if (ticketType.eventId !== eventId) {
    throw new Error("Ticket type does not belong to this event");
  }

  const policy = await prisma.fairPricePolicy.findUnique({
    where: { eventId },
  });

  const basePrice = Number(ticketType.price);
  const serviceFee = Math.round(basePrice * SERVICE_FEE_RATE * 100) / 100;
  const processingFee =
    Math.round((basePrice * PROCESSING_FEE_RATE + PROCESSING_FEE_FLAT) * 100) /
    100;
  const totalPrice =
    Math.round((basePrice + serviceFee + processingFee) * 100) / 100;
  const feePercentage =
    basePrice > 0
      ? Math.round(((totalPrice - basePrice) / basePrice) * 10000) / 100
      : 0;

  return {
    ticketTypeName: ticketType.name,
    basePrice,
    serviceFee,
    processingFee,
    totalPrice,
    feePercentage,
    showAllFees: policy?.showAllFees ?? true,
    antiScalpingEnabled: policy?.antiScalpingEnabled ?? false,
  };
}

// ── Identity Verification ────────────────────────────────────────────────────

/** Verify ticket holder identity */
export async function verifyTicketHolder(
  ticketId: string,
  method: "EMAIL" | "PHONE" | "ID_SCAN",
  data: Record<string, string | number | boolean>
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  return prisma.ticketVerification.create({
    data: {
      ticketId,
      verificationMethod: method,
      verifiedAt: new Date(),
      verifierData: data as Record<string, string | number | boolean>,
      isVerified: true,
    },
  });
}

/** Check if a ticket has been verified */
export async function checkTicketVerification(ticketId: string) {
  const verification = await prisma.ticketVerification.findFirst({
    where: { ticketId, isVerified: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    isVerified: !!verification,
    verification,
  };
}

// ── Waitlist Queue ───────────────────────────────────────────────────────────

const WAITLIST_OFFER_EXPIRY_HOURS = 24;

/** Join the FIFO waitlist queue for a sold-out event */
export async function joinWaitlistQueue(eventId: string, userId: string) {
  // Check if user is already in the queue
  const existing = await prisma.ticketWaitlistQueue.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (existing) {
    throw new Error("Already in waitlist");
  }

  // Get the next position
  const lastEntry = await prisma.ticketWaitlistQueue.findFirst({
    where: { eventId },
    orderBy: { position: "desc" },
  });

  const position = (lastEntry?.position ?? 0) + 1;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day waitlist expiry

  return prisma.ticketWaitlistQueue.create({
    data: {
      eventId,
      userId,
      position,
      expiresAt,
      status: "WAITING",
    },
  });
}

/** Get a user's current waitlist position */
export async function getWaitlistPosition(eventId: string, userId: string) {
  const entry = await prisma.ticketWaitlistQueue.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!entry) {
    return null;
  }

  // Count how many people are ahead (smaller position, still WAITING)
  const aheadCount = await prisma.ticketWaitlistQueue.count({
    where: {
      eventId,
      position: { lt: entry.position },
      status: "WAITING",
    },
  });

  return {
    position: entry.position,
    effectivePosition: aheadCount + 1,
    status: entry.status,
    joinedAt: entry.joinedAt,
    expiresAt: entry.expiresAt,
  };
}

/** Release tickets to the next N people in the waitlist */
export async function processWaitlistQueue(
  eventId: string,
  availableTickets: number
) {
  const waiting = await prisma.ticketWaitlistQueue.findMany({
    where: { eventId, status: "WAITING" },
    orderBy: { position: "asc" },
    take: availableTickets,
  });

  const offerExpiry = new Date();
  offerExpiry.setHours(offerExpiry.getHours() + WAITLIST_OFFER_EXPIRY_HOURS);

  const offered = [];
  for (const entry of waiting) {
    const updated = await prisma.ticketWaitlistQueue.update({
      where: { id: entry.id },
      data: {
        status: "OFFERED",
        notifiedAt: new Date(),
        expiresAt: offerExpiry,
      },
    });
    offered.push(updated);
  }

  return { offered: offered.length, entries: offered };
}

/** Claim an offered waitlist ticket before expiry */
export async function claimWaitlistTicket(eventId: string, userId: string) {
  const entry = await prisma.ticketWaitlistQueue.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!entry) {
    throw new Error("Not in waitlist");
  }

  if (entry.status !== "OFFERED") {
    throw new Error("No offer available");
  }

  if (new Date() > entry.expiresAt) {
    // Auto-expire
    await prisma.ticketWaitlistQueue.update({
      where: { id: entry.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Offer has expired");
  }

  return prisma.ticketWaitlistQueue.update({
    where: { id: entry.id },
    data: {
      status: "CLAIMED",
      claimedAt: new Date(),
    },
  });
}

// ── Controlled Resale ────────────────────────────────────────────────────────

/** Request to list a ticket for resale (only if policy allows, enforces max markup) */
export async function requestResale(
  ticketId: string,
  userId: string,
  maxPrice: number
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: { include: { fairPricePolicy: true } } },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new Error("Not your ticket");
  }

  if (ticket.status !== "VALID") {
    throw new Error("Ticket cannot be resold");
  }

  const policy = ticket.event.fairPricePolicy;
  if (!policy || !policy.allowResale) {
    throw new Error("Resale is not allowed for this event");
  }

  // Enforce maximum markup
  const purchasePrice = Number(ticket.purchasePrice);
  const maxAllowed =
    purchasePrice * (1 + policy.resaleMaxPercent / 100);

  if (maxPrice > maxAllowed) {
    throw new Error(
      `Max resale price cannot exceed $${maxAllowed.toFixed(2)} (${policy.resaleMaxPercent}% above face value)`
    );
  }

  return prisma.resaleListingRequest.create({
    data: {
      ticketId,
      sellerId: userId,
      maxPrice: new Decimal(maxPrice.toFixed(2)),
      listingStatus: "PENDING",
      artistRevShare: policy.maxMarkupPercent > 0 ? policy.maxMarkupPercent : 0,
    },
  });
}

/** Venue approves a resale listing */
export async function approveResale(requestId: string) {
  const request = await prisma.resaleListingRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Resale request not found");
  }

  if (request.listingStatus !== "PENDING") {
    throw new Error("Request is not in pending status");
  }

  return prisma.resaleListingRequest.update({
    where: { id: requestId },
    data: { listingStatus: "LISTED" },
  });
}

/** Purchase a resale ticket with artist revenue share */
export async function purchaseResaleTicket(
  requestId: string,
  buyerId: string
) {
  const request = await prisma.resaleListingRequest.findUnique({
    where: { id: requestId },
    include: { ticket: true },
  });

  if (!request) {
    throw new Error("Resale listing not found");
  }

  if (request.listingStatus !== "LISTED") {
    throw new Error("Listing is not available");
  }

  if (request.sellerId === buyerId) {
    throw new Error("Cannot buy your own ticket");
  }

  // Calculate artist revenue share
  const salePrice = Number(request.maxPrice);
  const originalPrice = Number(request.ticket.purchasePrice);
  const profit = salePrice - originalPrice;
  const artistShare =
    profit > 0 ? Math.round(profit * (request.artistRevShare / 100) * 100) / 100 : 0;

  // Update the listing
  const updated = await prisma.resaleListingRequest.update({
    where: { id: requestId },
    data: {
      listingStatus: "SOLD",
      buyerId,
      soldAt: new Date(),
    },
  });

  return {
    listing: updated,
    salePrice,
    originalPrice,
    profit,
    artistShare,
    sellerProceeds: salePrice - artistShare,
  };
}

// ── Waitlist Redistribution ───────────────────────────────────────────────────

/**
 * Auto-redistribute returned/cancelled tickets to the waitlist queue.
 * Called when a ticket is cancelled, refunded, or a resale listing expires.
 * Implements DICE-style fair redistribution: returned tickets automatically
 * go to the next person in the FIFO queue.
 */
export async function redistributeToWaitlist(
  eventId: string,
  returnedTicketCount: number
): Promise<{
  redistributed: number;
  offeredTo: Array<{ userId: string; position: number; expiresAt: Date }>;
  remainingAvailable: number;
}> {
  if (returnedTicketCount <= 0) {
    return { redistributed: 0, offeredTo: [], remainingAvailable: 0 };
  }

  // Get next N waiting users in FIFO order
  const waiting = await prisma.ticketWaitlistQueue.findMany({
    where: { eventId, status: "WAITING" },
    orderBy: { position: "asc" },
    take: returnedTicketCount,
  });

  const offerExpiry = new Date();
  offerExpiry.setHours(offerExpiry.getHours() + WAITLIST_OFFER_EXPIRY_HOURS);

  const offeredTo: Array<{ userId: string; position: number; expiresAt: Date }> = [];

  for (const entry of waiting) {
    await prisma.ticketWaitlistQueue.update({
      where: { id: entry.id },
      data: {
        status: "OFFERED",
        notifiedAt: new Date(),
        expiresAt: offerExpiry,
      },
    });

    offeredTo.push({
      userId: entry.userId,
      position: entry.position,
      expiresAt: offerExpiry,
    });
  }

  const remainingAvailable = returnedTicketCount - offeredTo.length;

  return {
    redistributed: offeredTo.length,
    offeredTo,
    remainingAvailable,
  };
}

/**
 * Expire stale offers and auto-advance the queue.
 * Should be called periodically (cron) or on waitlist access.
 */
export async function expireAndAdvanceWaitlist(eventId: string): Promise<{
  expired: number;
  advanced: number;
}> {
  const now = new Date();

  // Find expired offers
  const expiredEntries = await prisma.ticketWaitlistQueue.findMany({
    where: {
      eventId,
      status: "OFFERED",
      expiresAt: { lt: now },
    },
  });

  // Mark them expired
  let expired = 0;
  for (const entry of expiredEntries) {
    await prisma.ticketWaitlistQueue.update({
      where: { id: entry.id },
      data: { status: "EXPIRED" },
    });
    expired++;
  }

  // Redistribute expired offers to next in queue
  let advanced = 0;
  if (expired > 0) {
    const result = await redistributeToWaitlist(eventId, expired);
    advanced = result.redistributed;
  }

  return { expired, advanced };
}

/**
 * Handle ticket cancellation — automatically redistributes to waitlist.
 * This is the main entry point when a ticket is returned/cancelled.
 */
export async function handleTicketCancellation(
  eventId: string,
  ticketId: string,
  reason?: string
): Promise<{
  ticketCancelled: boolean;
  waitlistRedistribution: Awaited<ReturnType<typeof redistributeToWaitlist>>;
}> {
  // Mark ticket as cancelled
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.eventId !== eventId) {
    throw new Error("Ticket does not belong to this event");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CANCELLED" },
  });

  // First expire any stale offers
  await expireAndAdvanceWaitlist(eventId);

  // Then redistribute the cancelled ticket
  const redistribution = await redistributeToWaitlist(eventId, 1);

  return {
    ticketCancelled: true,
    waitlistRedistribution: redistribution,
  };
}

/**
 * Get waitlist status overview for an event.
 */
export async function getWaitlistOverview(eventId: string) {
  const [waiting, offered, claimed, expired, total] = await Promise.all([
    prisma.ticketWaitlistQueue.count({ where: { eventId, status: "WAITING" } }),
    prisma.ticketWaitlistQueue.count({ where: { eventId, status: "OFFERED" } }),
    prisma.ticketWaitlistQueue.count({ where: { eventId, status: "CLAIMED" } }),
    prisma.ticketWaitlistQueue.count({ where: { eventId, status: "EXPIRED" } }),
    prisma.ticketWaitlistQueue.count({ where: { eventId } }),
  ]);

  return {
    eventId,
    total,
    byStatus: { waiting, offered, claimed, expired },
    conversionRate: total > 0 ? Math.round((claimed / total) * 100) : 0,
  };
}

/** Get available resale listings for an event */
export async function getResaleListings(eventId: string) {
  return prisma.resaleListingRequest.findMany({
    where: {
      listingStatus: "LISTED",
      ticket: { eventId },
    },
    include: {
      ticket: {
        include: {
          ticketType: true,
        },
      },
    },
    orderBy: { maxPrice: "asc" },
  });
}

// ── Anti-Scalping Detection ──────────────────────────────────────────────────

const BULK_PURCHASE_THRESHOLD = 6; // tickets in 24 hours
const RAPID_RESALE_THRESHOLD = 3; // resale requests in 7 days

/** Check if a user has suspicious purchasing patterns */
export async function detectScalpingPattern(userId: string) {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Check for bulk purchases in last 24 hours
  const recentPurchases = await prisma.ticket.count({
    where: {
      userId,
      createdAt: { gte: oneDayAgo },
    },
  });

  // Check for rapid resale requests in last 7 days
  const recentResales = await prisma.resaleListingRequest.count({
    where: {
      sellerId: userId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const isBulkBuyer = recentPurchases >= BULK_PURCHASE_THRESHOLD;
  const isRapidReseller = recentResales >= RAPID_RESALE_THRESHOLD;

  return {
    isSuspicious: isBulkBuyer || isRapidReseller,
    isBulkBuyer,
    isRapidReseller,
    recentPurchases,
    recentResales,
    thresholds: {
      bulkPurchase: BULK_PURCHASE_THRESHOLD,
      rapidResale: RAPID_RESALE_THRESHOLD,
    },
  };
}
