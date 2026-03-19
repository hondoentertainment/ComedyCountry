/**
 * Phase 3: Ticketing & Payments Hardening — Comprehensive Types
 *
 * Provides TypeScript types for tickets, orders, refunds, season passes,
 * pricing tiers, checkout, and QR code validation.
 */

import type { Decimal } from "@prisma/client/runtime/library";

// =============================================================================
// Ticket Status & Core Types
// =============================================================================

export type TicketStatus = "VALID" | "USED" | "REFUNDED" | "TRANSFERRED" | "CANCELLED";

export interface TicketCore {
  id: string;
  eventId: string;
  userId: string;
  ticketTypeId: string;
  status: TicketStatus;
  qrCode: string;
  purchasePrice: Decimal;
  stripePaymentId: string | null;
  transferredTo: string | null;
  giftMessage: string | null;
  scannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketWithDetails extends TicketCore {
  event: {
    id: string;
    title: string | null;
    date: Date;
    showtime: string | null;
    venue: {
      id: string;
      name: string;
      address: string | null;
      city: string;
      state: string;
    };
    comedians: Array<{
      comedian: {
        id: string;
        name: string;
        slug: string;
        headshotUrl: string | null;
      };
      role: string;
    }>;
    refundPolicy: RefundPolicyData | null;
  };
  ticketType: TicketTypeData;
}

// =============================================================================
// Ticket Types (GA, VIP, etc.)
// =============================================================================

export interface TicketTypeData {
  id: string;
  eventId: string;
  name: string;
  price: Decimal;
  capacity: number;
  sold: number;
  description: string | null;
  sortOrder: number;
  saleStart: Date | null;
  saleEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTypeAvailability extends TicketTypeData {
  available: number;
  onSale: boolean;
}

// =============================================================================
// Pricing Tiers (Early Bird, Advance, Door)
// =============================================================================

export type PricingTierName = "Early Bird" | "Advance" | "Standard" | "Door" | "Premium" | string;

export interface PricingTierData {
  id: string;
  ticketTypeId: string;
  name: PricingTierName;
  price: Decimal;
  startsAt: Date;
  endsAt: Date | null;
  maxQuantity: number | null;
  sold: number;
  sortOrder: number;
  createdAt: Date;
}

export interface PricingTierStatus extends PricingTierData {
  isActive: boolean;
  isSoldOut: boolean;
}

export interface EffectivePrice {
  price: number;
  basePrice: number;
  tierName: string;
  tierPrice: number;
  dynamicMultiplier: number;
  sellThrough: number;
  source: "tier" | "dynamic";
}

// =============================================================================
// Dynamic Pricing
// =============================================================================

export interface DemandTier {
  threshold: number;
  multiplier: number;
  label: string;
}

export interface DynamicPriceResult {
  price: number;
  multiplier: number;
  sellThrough: number;
  demandLevel: "low" | "moderate" | "high" | "very_high" | "critical";
}

export interface PriceHistoryEntry {
  ticketTypeId: string;
  price: number;
  tierName: string | null;
  demandMultiplier: number;
  sellThrough: number;
  timestamp: Date;
}

// =============================================================================
// Orders & Checkout
// =============================================================================

export interface CartItem {
  ticketTypeId: string;
  ticketTypeName: string;
  eventId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  serviceFee: number;
  processingFee: number;
  tax: number;
  discount: number;
  promoCode: string | null;
  total: number;
}

export interface PromoCode {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: Date | null;
  minPurchase: number | null;
  applicableEventIds: string[] | null;
  isActive: boolean;
}

export interface PromoCodeValidation {
  valid: boolean;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  error?: string;
}

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  jurisdiction: string;
}

export interface OrderConfirmation {
  orderId: string;
  tickets: Array<{
    id: string;
    qrCode: string;
    ticketTypeName: string;
    eventTitle: string;
    venueName: string;
    eventDate: Date;
    showtime: string | null;
    purchasePrice: number;
  }>;
  subtotal: number;
  serviceFee: number;
  processingFee: number;
  tax: number;
  discount: number;
  total: number;
  promoCode: string | null;
  customerEmail: string;
  stripePaymentId: string | null;
  createdAt: Date;
}

export interface CheckoutSessionRequest {
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  eventId: string;
  promoCode?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  orderId: string;
}

// =============================================================================
// Refunds
// =============================================================================

export type RefundStatus = "pending" | "processing" | "completed" | "failed" | "denied";
export type RefundType = "full" | "partial";

export interface RefundPolicyData {
  id: string;
  eventId: string;
  refundDeadline: Date;
  refundPercent: number;
  description: string | null;
  createdAt: Date;
}

export interface RefundRequest {
  ticketId: string;
  type: RefundType;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  ticketId: string;
  status: RefundStatus;
  type: RefundType;
  originalAmount: number;
  refundAmount: number;
  refundPercent: number;
  stripeRefundId: string | null;
  reason: string | null;
  policyApplied: {
    refundDeadline: Date;
    maxRefundPercent: number;
    withinDeadline: boolean;
    eventStatus: string;
  };
  createdAt: Date;
}

export interface RefundEligibility {
  eligible: boolean;
  maxRefundPercent: number;
  maxRefundAmount: number;
  reason: string;
  deadlineDate: Date | null;
  daysUntilDeadline: number | null;
  eventStatus: "upcoming" | "today" | "past" | "cancelled";
}

// =============================================================================
// Season Passes
// =============================================================================

export interface SeasonPassData {
  id: string;
  venueId: string;
  userId: string;
  name: string;
  totalShows: number;
  usedShows: number;
  price: Decimal;
  expiresAt: Date;
  stripePaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonPassWithVenue extends SeasonPassData {
  venue: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
}

export interface SeasonPassRedemption {
  passId: string;
  eventId: string;
  redeemedAt: Date;
  showNumber: number;
  remainingShows: number;
}

export interface SeasonPassValidation {
  valid: boolean;
  passId: string;
  remainingShows: number;
  expired: boolean;
  error?: string;
}

export interface SeasonPassPurchaseRequest {
  venueId: string;
  name: string;
  totalShows: number;
  price: number;
  expiresAt?: string;
}

// =============================================================================
// QR Code & Ticket Validation
// =============================================================================

export interface QRCodeData {
  ticketId: string;
  qrCode: string;
  eventId: string;
  eventTitle: string;
  venueName: string;
  eventDate: string;
  showtime: string | null;
  ticketType: string;
  holderName: string | null;
}

export interface TicketValidationResult {
  valid: boolean;
  ticketId: string | null;
  status: TicketStatus | null;
  error?: string;
  ticket?: TicketWithDetails;
  scannedAt?: Date | null;
  checkinTimestamp?: Date;
  alreadyScanned?: boolean;
}

export interface ScanRequest {
  qrCode: string;
  scannerId?: string;
  location?: string;
}

export interface ScanResponse {
  valid: boolean;
  error?: string;
  ticket?: {
    id: string;
    eventTitle: string;
    ticketType: string;
    holderName: string | null;
    scannedAt: Date;
  };
  alreadyScanned?: boolean;
  previousScanAt?: Date;
}

// =============================================================================
// Stripe Webhook Events
// =============================================================================

export type StripeWebhookEventType =
  | "checkout.session.completed"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "charge.refunded"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

export interface ProcessedWebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: StripeWebhookEventType;
  processed: boolean;
  processedAt: Date | null;
  retryCount: number;
  lastError: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  error?: string;
  retryable?: boolean;
}

// =============================================================================
// Anti-Scalping & Fair Ticketing
// =============================================================================

export interface PurchaseLimitConfig {
  maxPerUser: number;
  maxPerTransaction: number;
  cooldownMinutes: number;
}

export interface ScalpingDetectionResult {
  isSuspicious: boolean;
  isBulkBuyer: boolean;
  isRapidReseller: boolean;
  recentPurchases: number;
  recentResales: number;
  thresholds: {
    bulkPurchase: number;
    rapidResale: number;
  };
}

export interface WaitlistEntry {
  id: string;
  eventId: string;
  userId: string;
  position: number;
  effectivePosition: number;
  status: "WAITING" | "OFFERED" | "CLAIMED" | "EXPIRED";
  joinedAt: Date;
  expiresAt: Date;
  notifiedAt: Date | null;
  claimedAt: Date | null;
}

export interface WaitlistOverview {
  eventId: string;
  total: number;
  byStatus: {
    waiting: number;
    offered: number;
    claimed: number;
    expired: number;
  };
  conversionRate: number;
}

// =============================================================================
// Fee Breakdown & Transparency
// =============================================================================

export interface FeeBreakdown {
  ticketTypeName: string;
  basePrice: number;
  serviceFee: number;
  processingFee: number;
  totalPrice: number;
  feePercentage: number;
  showAllFees: boolean;
  antiScalpingEnabled: boolean;
}

// =============================================================================
// Checkout Flow Component Types
// =============================================================================

export type CheckoutStep = "tickets" | "details" | "payment" | "confirmation";

export interface CheckoutState {
  step: CheckoutStep;
  eventId: string;
  cart: Cart;
  customerEmail: string;
  customerName: string;
  promoCode: string | null;
  promoValidation: PromoCodeValidation | null;
  isProcessing: boolean;
  error: string | null;
  confirmation: OrderConfirmation | null;
}

export interface TicketScannerConfig {
  cameraId?: string;
  eventId?: string;
  autoScan: boolean;
  soundEnabled: boolean;
}
