import { describe, it, expect } from "vitest";
import {
  emailSchema,
  phoneSchema,
  paginationSchema,
  dateRangeSchema,
  idSchema,
  createEventSchema,
  updateEventSchema,
  purchaseTicketSchema,
  transferTicketSchema,
  createSMSCampaignSchema,
  createSegmentSchema,
  createReferralSchema,
  createContentSchema,
  createTipSchema,
  bookingRequestSchema,
  recordMetricSchema,
  forecastRequestSchema,
  fairPricePolicySchema,
  resaleRequestSchema,
  validateRequest,
  validateBody,
  ValidationError,
} from "./validation";

describe("validation", () => {
  // ─── Email Schema ───────────────────────────────────────────────────

  describe("emailSchema", () => {
    it("accepts valid email addresses", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
      expect(emailSchema.safeParse("name+tag@domain.co").success).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false);
      expect(emailSchema.safeParse("@no-user.com").success).toBe(false);
      expect(emailSchema.safeParse("").success).toBe(false);
    });

    it("rejects email without domain", () => {
      expect(emailSchema.safeParse("user@").success).toBe(false);
    });
  });

  // ─── Phone Schema ──────────────────────────────────────────────────

  describe("phoneSchema", () => {
    it("accepts US phone formats", () => {
      expect(phoneSchema.safeParse("(555) 123-4567").success).toBe(true);
      expect(phoneSchema.safeParse("555-123-4567").success).toBe(true);
      expect(phoneSchema.safeParse("5551234567").success).toBe(true);
    });

    it("accepts international format with +1", () => {
      expect(phoneSchema.safeParse("+1 (555) 123-4567").success).toBe(true);
      expect(phoneSchema.safeParse("+15551234567").success).toBe(true);
    });

    it("rejects invalid phone numbers", () => {
      expect(phoneSchema.safeParse("123").success).toBe(false);
      expect(phoneSchema.safeParse("abcdefghij").success).toBe(false);
      expect(phoneSchema.safeParse("").success).toBe(false);
    });
  });

  // ─── Pagination Schema ─────────────────────────────────────────────

  describe("paginationSchema", () => {
    it("applies default page=1 and limit=20", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("accepts valid pagination params", () => {
      const result = paginationSchema.parse({ page: 3, limit: 50 });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("rejects page less than 1", () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    });

    it("rejects limit greater than 100", () => {
      expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it("coerces string values to numbers", () => {
      const result = paginationSchema.parse({ page: "2", limit: "10" });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  // ─── Date Range Schema ─────────────────────────────────────────────

  describe("dateRangeSchema", () => {
    it("accepts valid date ranges", () => {
      const result = dateRangeSchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("rejects endDate before startDate", () => {
      const result = dateRangeSchema.safeParse({
        startDate: "2026-12-31",
        endDate: "2026-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts same start and end date", () => {
      const result = dateRangeSchema.safeParse({
        startDate: "2026-06-15",
        endDate: "2026-06-15",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── ID Schema ─────────────────────────────────────────────────────

  describe("idSchema", () => {
    it("accepts non-empty strings", () => {
      expect(idSchema.safeParse("abc123").success).toBe(true);
    });

    it("rejects empty strings", () => {
      expect(idSchema.safeParse("").success).toBe(false);
    });
  });

  // ─── Event Creation Schema ─────────────────────────────────────────

  describe("createEventSchema", () => {
    const validEvent = {
      title: "Comedy Night",
      venueId: "venue1",
      date: "2026-07-15T20:00:00Z",
    };

    it("accepts valid event data with required fields", () => {
      const result = createEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("accepts event with optional fields", () => {
      const result = createEventSchema.safeParse({
        ...validEvent,
        description: "A great show",
        ticketPrice: 25.0,
        capacity: 200,
        comedianIds: ["c1", "c2"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects event without title", () => {
      const result = createEventSchema.safeParse({
        venueId: "venue1",
        date: "2026-07-15",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative ticket price", () => {
      const result = createEventSchema.safeParse({
        ...validEvent,
        ticketPrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capacity of zero", () => {
      const result = createEventSchema.safeParse({
        ...validEvent,
        capacity: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Update Event Schema ───────────────────────────────────────────

  describe("updateEventSchema", () => {
    it("accepts partial updates", () => {
      const result = updateEventSchema.safeParse({ title: "New Title" });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (no fields to update)", () => {
      const result = updateEventSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ─── Ticket Purchase Schema ────────────────────────────────────────

  describe("purchaseTicketSchema", () => {
    it("accepts valid ticket purchase", () => {
      const result = purchaseTicketSchema.safeParse({
        eventId: "ev1",
        quantity: 2,
        email: "fan@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects quantity above 10", () => {
      const result = purchaseTicketSchema.safeParse({
        eventId: "ev1",
        quantity: 11,
        email: "fan@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects quantity of zero", () => {
      const result = purchaseTicketSchema.safeParse({
        eventId: "ev1",
        quantity: 0,
        email: "fan@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── SMS Campaign Schema ───────────────────────────────────────────

  describe("createSMSCampaignSchema", () => {
    it("accepts valid SMS campaign", () => {
      const result = createSMSCampaignSchema.safeParse({
        name: "Summer Promo",
        message: "Come to our show!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects message longer than 160 characters", () => {
      const result = createSMSCampaignSchema.safeParse({
        name: "Long",
        message: "x".repeat(161),
      });
      expect(result.success).toBe(false);
    });

    it("accepts message at exactly 160 characters", () => {
      const result = createSMSCampaignSchema.safeParse({
        name: "Max Length",
        message: "x".repeat(160),
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty campaign name", () => {
      const result = createSMSCampaignSchema.safeParse({
        name: "",
        message: "Hello",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Creator Content Schema ────────────────────────────────────────

  describe("createContentSchema", () => {
    it("accepts valid content", () => {
      const result = createContentSchema.safeParse({
        title: "Behind the Scenes",
        body: "Some text",
        isGated: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createContentSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("accepts valid media types", () => {
      expect(
        createContentSchema.safeParse({ title: "T", mediaType: "video" }).success,
      ).toBe(true);
      expect(
        createContentSchema.safeParse({ title: "T", mediaType: "image" }).success,
      ).toBe(true);
    });

    it("rejects invalid media type", () => {
      expect(
        createContentSchema.safeParse({ title: "T", mediaType: "audio" }).success,
      ).toBe(false);
    });
  });

  // ─── Tip Schema ────────────────────────────────────────────────────

  describe("createTipSchema", () => {
    it("accepts valid tip", () => {
      const result = createTipSchema.safeParse({
        comedianId: "c1",
        amount: 10,
      });
      expect(result.success).toBe(true);
    });

    it("rejects tip below $1", () => {
      const result = createTipSchema.safeParse({
        comedianId: "c1",
        amount: 0.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects tip above $1000", () => {
      const result = createTipSchema.safeParse({
        comedianId: "c1",
        amount: 1001,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Booking Request Schema ────────────────────────────────────────

  describe("bookingRequestSchema", () => {
    it("accepts valid booking request", () => {
      const result = bookingRequestSchema.safeParse({
        venueId: "v1",
        comedianId: "c1",
        date: "2026-08-01",
        budget: 500,
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── Record Metric Schema ─────────────────────────────────────────

  describe("recordMetricSchema", () => {
    it("accepts valid performance metric", () => {
      const result = recordMetricSchema.safeParse({
        comedianId: "c1",
        eventId: "ev1",
        bitTitle: "Airplane Food",
        laughScore: 85,
        crowdReaction: "ROARING",
        audienceSize: 200,
        city: "Austin",
        date: "2026-03-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects laugh score above 100", () => {
      const result = recordMetricSchema.safeParse({
        comedianId: "c1",
        eventId: "ev1",
        bitTitle: "Test",
        laughScore: 101,
        crowdReaction: "SILENT",
        audienceSize: 50,
        city: "NYC",
        date: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid crowd reaction", () => {
      const result = recordMetricSchema.safeParse({
        comedianId: "c1",
        eventId: "ev1",
        bitTitle: "Test",
        laughScore: 50,
        crowdReaction: "BOOING",
        audienceSize: 50,
        city: "NYC",
        date: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Forecast Request Schema ───────────────────────────────────────

  describe("forecastRequestSchema", () => {
    it("applies default historicalDays of 90", () => {
      const result = forecastRequestSchema.parse({ eventId: "ev1" });
      expect(result.historicalDays).toBe(90);
    });

    it("rejects historicalDays below 7", () => {
      const result = forecastRequestSchema.safeParse({
        eventId: "ev1",
        historicalDays: 3,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Fair Price Policy Schema ──────────────────────────────────────

  describe("fairPricePolicySchema", () => {
    it("accepts valid policy with defaults", () => {
      const result = fairPricePolicySchema.parse({ eventId: "ev1" });
      expect(result.showAllFees).toBe(true);
      expect(result.allowResale).toBe(false);
      expect(result.antiScalpingEnabled).toBe(true);
    });

    it("rejects maxMarkupPercent above 100", () => {
      const result = fairPricePolicySchema.safeParse({
        eventId: "ev1",
        maxMarkupPercent: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Resale Request Schema ────────────────────────────────────────

  describe("resaleRequestSchema", () => {
    it("accepts valid resale request", () => {
      const result = resaleRequestSchema.safeParse({
        ticketId: "t1",
        maxPrice: 50,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative maxPrice", () => {
      const result = resaleRequestSchema.safeParse({
        ticketId: "t1",
        maxPrice: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── validateRequest ──────────────────────────────────────────────

  describe("validateRequest", () => {
    it("returns typed data on success", () => {
      const result = validateRequest(emailSchema, "user@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
        expect(result.errors).toBeNull();
      }
    });

    it("returns errors on failure", () => {
      const result = validateRequest(emailSchema, "not-an-email");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data).toBeNull();
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe("Invalid email address");
      }
    });

    it("validates complex schemas", () => {
      const result = validateRequest(createEventSchema, {
        title: "Show",
        venueId: "v1",
        date: "2026-07-15",
      });
      expect(result.success).toBe(true);
    });

    it("returns multiple errors for multiple invalid fields", () => {
      const result = validateRequest(purchaseTicketSchema, {
        eventId: "",
        quantity: 0,
        email: "bad",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ─── validateBody ─────────────────────────────────────────────────

  describe("validateBody", () => {
    it("parses request body and returns typed data", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "Show", venueId: "v1", date: "2026-07-15" }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await validateBody(req, createEventSchema);
      expect(data.title).toBe("Show");
      expect(data.venueId).toBe("v1");
    });

    it("throws ValidationError on invalid body", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
        headers: { "Content-Type": "application/json" },
      });

      await expect(validateBody(req, createEventSchema)).rejects.toThrow(
        ValidationError,
      );
    });

    it("ValidationError contains error details", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      try {
        await validateBody(req, purchaseTicketSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── Transfer Ticket Schema ───────────────────────────────────────

  describe("transferTicketSchema", () => {
    it("accepts valid transfer", () => {
      const result = transferTicketSchema.safeParse({
        ticketId: "t1",
        toEmail: "friend@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid destination email", () => {
      const result = transferTicketSchema.safeParse({
        ticketId: "t1",
        toEmail: "not-email",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Segment Schema ──────────────────────────────────────────────

  describe("createSegmentSchema", () => {
    it("accepts valid segment", () => {
      const result = createSegmentSchema.safeParse({
        name: "VIPs",
        criteria: { minSpend: 100 },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createSegmentSchema.safeParse({
        name: "",
        criteria: {},
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Referral Schema ─────────────────────────────────────────────

  describe("createReferralSchema", () => {
    it("accepts valid referral", () => {
      const result = createReferralSchema.safeParse({
        comedianId: "c1",
        rewardType: "DISCOUNT",
        rewardValue: 10,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid reward type", () => {
      const result = createReferralSchema.safeParse({
        comedianId: "c1",
        rewardType: "CASH",
        rewardValue: 10,
      });
      expect(result.success).toBe(false);
    });
  });
});
