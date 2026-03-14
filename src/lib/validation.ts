import { z } from "zod";

/**
 * Zod Validation Middleware
 *
 * Schema validation for API inputs — common schemas plus domain-specific
 * schemas for events, tickets, marketing, creator, analytics, and fair ticketing.
 */

// ---------------------------------------------------------------------------
// Common Schemas
// ---------------------------------------------------------------------------

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z
  .string()
  .regex(
    /^\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    "Invalid phone number",
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "endDate must be after startDate",
  });

export const idSchema = z.string().min(1, "ID is required");

// ---------------------------------------------------------------------------
// Event Schemas
// ---------------------------------------------------------------------------

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  venueId: idSchema,
  date: z.coerce.date(),
  description: z.string().max(5000).optional(),
  ticketPrice: z.number().min(0).optional(),
  capacity: z.number().int().min(1).optional(),
  comedianIds: z.array(idSchema).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(5000).optional(),
  ticketPrice: z.number().min(0).optional(),
  capacity: z.number().int().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Ticket Schemas
// ---------------------------------------------------------------------------

export const purchaseTicketSchema = z.object({
  eventId: idSchema,
  quantity: z.number().int().min(1).max(10),
  email: emailSchema,
  paymentMethodId: z.string().min(1).optional(),
});

export const transferTicketSchema = z.object({
  ticketId: idSchema,
  toEmail: emailSchema,
  message: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Marketing Schemas
// ---------------------------------------------------------------------------

export const createSMSCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  message: z
    .string()
    .min(1, "Message is required")
    .max(160, "SMS message must be 160 characters or fewer"),
  segmentId: idSchema.optional(),
});

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  criteria: z.record(z.string(), z.unknown()),
});

export const createReferralSchema = z.object({
  comedianId: idSchema,
  eventId: idSchema.optional(),
  rewardType: z.enum(["DISCOUNT", "FREE_TICKET", "MERCH"]),
  rewardValue: z.number().min(0),
});

// ---------------------------------------------------------------------------
// Creator Schemas
// ---------------------------------------------------------------------------

export const createContentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().max(10000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["video", "image", "text"]).optional(),
  embedUrl: z.string().url().optional(),
  isGated: z.boolean().optional(),
});

export const createTipSchema = z.object({
  comedianId: idSchema,
  amount: z.number().min(1, "Minimum tip is $1").max(1000),
  giftType: z.string().optional(),
  message: z.string().max(500).optional(),
});

export const bookingRequestSchema = z.object({
  venueId: idSchema,
  comedianId: idSchema,
  date: z.coerce.date(),
  showType: z.string().optional(),
  budget: z.number().min(0).optional(),
  message: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Analytics Schemas
// ---------------------------------------------------------------------------

export const recordMetricSchema = z.object({
  comedianId: idSchema,
  eventId: idSchema,
  bitTitle: z.string().min(1).max(200),
  laughScore: z.number().int().min(0).max(100),
  crowdReaction: z.enum([
    "SILENT",
    "CHUCKLES",
    "LAUGHING",
    "ROARING",
    "STANDING_OVATION",
  ]),
  audienceSize: z.number().int().min(0),
  city: z.string().min(1),
  date: z.coerce.date(),
});

export const forecastRequestSchema = z.object({
  eventId: idSchema,
  historicalDays: z.number().int().min(7).max(365).default(90),
});

// ---------------------------------------------------------------------------
// Fair Ticketing Schemas
// ---------------------------------------------------------------------------

export const fairPricePolicySchema = z.object({
  eventId: idSchema,
  showAllFees: z.boolean().default(true),
  maxMarkupPercent: z.number().min(0).max(100).default(0),
  allowResale: z.boolean().default(false),
  resaleMaxPercent: z.number().min(0).max(100).default(0),
  antiScalpingEnabled: z.boolean().default(true),
});

export const resaleRequestSchema = z.object({
  ticketId: idSchema,
  maxPrice: z.number().min(0),
  artistRevShare: z.number().min(0).max(100).default(0),
});

// ---------------------------------------------------------------------------
// Generic Validator Functions
// ---------------------------------------------------------------------------

export interface ZodIssue {
  code: string;
  message: string;
  path: (string | number)[];
  [key: string]: unknown;
}

export type ValidationResult<T> =
  | { success: true; data: T; errors: null }
  | { success: false; data: null; errors: ZodIssue[] };

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  const issues = (result.error.issues ?? result.error.errors ?? []) as ZodIssue[];
  return { success: false, data: null, errors: issues };
}

export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = (result.error.issues ?? result.error.errors ?? []) as ZodIssue[];
    throw new ValidationError(issues);
  }
  return result.data;
}

export class ValidationError extends Error {
  public errors: ZodIssue[];

  constructor(errors: ZodIssue[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.errors = errors;
  }
}
