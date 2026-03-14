import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTalentListings,
  createTalentListing,
  applyToListing,
  getApplications,
  respondToApplication,
  getVenueCRMData,
  updateCRMRecord,
  getIndustryReport,
  generateIndustryMetrics,
  getVenueGroup,
  createVenueGroup,
  getAgentRoster,
  createApiKey,
} from "./marketplace";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    talentListing: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    talentApplication: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    venue: { findMany: vi.fn() },
    venueCRM: { findMany: vi.fn(), count: vi.fn(), upsert: vi.fn() },
    industryReport: { findUnique: vi.fn() },
    event: { findMany: vi.fn() },
    eventComedian: { findMany: vi.fn() },
    comedian: { findMany: vi.fn() },
    venueGroup: { findUnique: vi.fn(), create: vi.fn() },
    agentRoster: { findMany: vi.fn() },
    apiKey: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  talentListing: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  talentApplication: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  venue: { findMany: ReturnType<typeof vi.fn> };
  venueCRM: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  industryReport: { findUnique: ReturnType<typeof vi.fn> };
  event: { findMany: ReturnType<typeof vi.fn> };
  eventComedian: { findMany: ReturnType<typeof vi.fn> };
  comedian: { findMany: ReturnType<typeof vi.fn> };
  venueGroup: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  agentRoster: { findMany: ReturnType<typeof vi.fn> };
  apiKey: { create: ReturnType<typeof vi.fn> };
};

describe("marketplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Talent Listings ─────────────────────────────────────────────── */

  describe("getTalentListings", () => {
    it("returns paginated listings with defaults", async () => {
      const listings = [{ id: "tl1", showType: "open_mic" }];
      mockPrisma.talentListing.findMany.mockResolvedValue(listings);
      mockPrisma.talentListing.count.mockResolvedValue(1);

      const result = await getTalentListings();

      expect(result).toEqual({ listings, total: 1, page: 1, pages: 1 });
      expect(mockPrisma.talentListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "open" },
          skip: 0,
          take: 20,
          orderBy: { date: "asc" },
        })
      );
    });

    it("filters by genre and showType", async () => {
      mockPrisma.talentListing.findMany.mockResolvedValue([]);
      mockPrisma.talentListing.count.mockResolvedValue(0);

      await getTalentListings({ genre: "standup", showType: "headliner" });

      expect(mockPrisma.talentListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            genre: "standup",
            showType: "headliner",
          }),
        })
      );
    });

    it("filters by city/state via venue lookup", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([{ id: "v1" }, { id: "v2" }]);
      mockPrisma.talentListing.findMany.mockResolvedValue([]);
      mockPrisma.talentListing.count.mockResolvedValue(0);

      await getTalentListings({ city: "Nashville", state: "TN" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { equals: "Nashville", mode: "insensitive" },
            state: { equals: "TN", mode: "insensitive" },
          }),
        })
      );
      expect(mockPrisma.talentListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venueId: { in: ["v1", "v2"] },
          }),
        })
      );
    });

    it("respects page and limit", async () => {
      mockPrisma.talentListing.findMany.mockResolvedValue([]);
      mockPrisma.talentListing.count.mockResolvedValue(100);

      const result = await getTalentListings({ page: 3, limit: 10 });

      expect(result.pages).toBe(10);
      expect(mockPrisma.talentListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });
  });

  describe("createTalentListing", () => {
    it("creates a listing for a venue", async () => {
      const listing = { id: "tl1", venueId: "v1", showType: "showcase" };
      mockPrisma.talentListing.create.mockResolvedValue(listing);

      const result = await createTalentListing("v1", {
        date: new Date("2025-06-01"),
        showType: "showcase",
        genre: "standup",
        budgetMin: 200,
        budgetMax: 500,
      });

      expect(result).toEqual(listing);
      expect(mockPrisma.talentListing.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          venueId: "v1",
          showType: "showcase",
          genre: "standup",
        }),
      });
    });
  });

  /* ── Talent Applications ─────────────────────────────────────────── */

  describe("applyToListing", () => {
    it("creates an application", async () => {
      const app = { id: "ta1", listingId: "tl1" };
      mockPrisma.talentApplication.create.mockResolvedValue(app);

      const result = await applyToListing("tl1", "c1", "u1", "Pick me!", 300);

      expect(result).toEqual(app);
      expect(mockPrisma.talentApplication.create).toHaveBeenCalledWith({
        data: {
          listingId: "tl1",
          comedianId: "c1",
          userId: "u1",
          message: "Pick me!",
          askingFee: 300,
        },
      });
    });
  });

  describe("getApplications", () => {
    it("returns applications for a listing", async () => {
      const apps = [{ id: "ta1" }, { id: "ta2" }];
      mockPrisma.talentApplication.findMany.mockResolvedValue(apps);

      const result = await getApplications("tl1");

      expect(result).toEqual(apps);
      expect(mockPrisma.talentApplication.findMany).toHaveBeenCalledWith({
        where: { listingId: "tl1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("respondToApplication", () => {
    it("updates application status", async () => {
      const updated = { id: "ta1", status: "accepted" };
      mockPrisma.talentApplication.update.mockResolvedValue(updated);

      const result = await respondToApplication("ta1", "accepted");

      expect(result).toEqual(updated);
      expect(mockPrisma.talentApplication.update).toHaveBeenCalledWith({
        where: { id: "ta1" },
        data: { status: "accepted" },
      });
    });
  });

  /* ── Venue CRM ───────────────────────────────────────────────────── */

  describe("getVenueCRMData", () => {
    it("returns paginated CRM records", async () => {
      const records = [{ id: "crm1", venueId: "v1" }];
      mockPrisma.venueCRM.findMany.mockResolvedValue(records);
      mockPrisma.venueCRM.count.mockResolvedValue(1);

      const result = await getVenueCRMData("v1");

      expect(result).toEqual({ records, total: 1, page: 1, pages: 1 });
    });
  });

  describe("updateCRMRecord", () => {
    it("upserts a CRM record", async () => {
      const record = { id: "crm1", tags: "vip", notes: "Regular" };
      mockPrisma.venueCRM.upsert.mockResolvedValue(record);

      const result = await updateCRMRecord("v1", "u1", { tags: "vip", notes: "Regular" });

      expect(result).toEqual(record);
      expect(mockPrisma.venueCRM.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { venueId_userId: { venueId: "v1", userId: "u1" } },
        })
      );
    });
  });

  /* ── Industry Reports ────────────────────────────────────────────── */

  describe("getIndustryReport", () => {
    it("returns report by city/state/quarter", async () => {
      const report = { id: "ir1", city: "Nashville", state: "TN", quarter: "Q1-2025" };
      mockPrisma.industryReport.findUnique.mockResolvedValue(report);

      const result = await getIndustryReport("Nashville", "TN", "Q1-2025");

      expect(result).toEqual(report);
      expect(mockPrisma.industryReport.findUnique).toHaveBeenCalledWith({
        where: { city_state_quarter: { city: "Nashville", state: "TN", quarter: "Q1-2025" } },
      });
    });

    it("returns null when no report exists", async () => {
      mockPrisma.industryReport.findUnique.mockResolvedValue(null);
      const result = await getIndustryReport("Nowhere", "XX", "Q1-2025");
      expect(result).toBeNull();
    });
  });

  describe("generateIndustryMetrics", () => {
    it("aggregates metrics for a city", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([{ id: "v1" }, { id: "v2" }]);
      mockPrisma.event.findMany.mockResolvedValue([
        { id: "e1", priceMin: 20, priceMax: 30 },
        { id: "e2", priceMin: 10, priceMax: 25 },
      ]);
      mockPrisma.eventComedian.findMany.mockResolvedValue([
        { comedianId: "c1" },
        { comedianId: "c1" },
        { comedianId: "c2" },
      ]);
      mockPrisma.comedian.findMany.mockResolvedValue([
        { id: "c1", name: "Dave" },
        { id: "c2", name: "Amy" },
      ]);

      const result = await generateIndustryMetrics("Nashville", "TN");

      expect(result.totalShows).toBe(2);
      expect(result.venueCount).toBe(2);
      expect(result.avgTicketPrice).toBe(15);
      expect(result.topComedians).toHaveLength(2);
      expect(result.topComedians[0]).toMatchObject({ name: "Dave", showCount: 2 });
    });

    it("handles zero events", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.eventComedian.findMany.mockResolvedValue([]);
      mockPrisma.comedian.findMany.mockResolvedValue([]);

      const result = await generateIndustryMetrics("Empty", "XX");

      expect(result.totalShows).toBe(0);
      expect(result.avgTicketPrice).toBe(0);
    });
  });

  /* ── Venue Groups ────────────────────────────────────────────────── */

  describe("getVenueGroup", () => {
    it("returns group with venues and staff", async () => {
      const group = { id: "vg1", venues: [], staff: [] };
      mockPrisma.venueGroup.findUnique.mockResolvedValue(group);

      const result = await getVenueGroup("vg1");

      expect(result).toEqual(group);
      expect(mockPrisma.venueGroup.findUnique).toHaveBeenCalledWith({
        where: { id: "vg1" },
        include: { venues: true, staff: true },
      });
    });
  });

  describe("createVenueGroup", () => {
    it("creates group with owner as staff", async () => {
      const group = { id: "vg1", name: "My Clubs", staff: [{ userId: "u1", role: "owner" }] };
      mockPrisma.venueGroup.create.mockResolvedValue(group);

      const result = await createVenueGroup("u1", "My Clubs");

      expect(result).toEqual(group);
      expect(mockPrisma.venueGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "My Clubs",
            ownerId: "u1",
            staff: { create: { userId: "u1", role: "owner" } },
          }),
        })
      );
    });
  });

  /* ── Agent Roster ────────────────────────────────────────────────── */

  describe("getAgentRoster", () => {
    it("returns roster with comedian includes", async () => {
      const roster = [{ id: "ar1", comedian: { name: "Dave" } }];
      mockPrisma.agentRoster.findMany.mockResolvedValue(roster);

      const result = await getAgentRoster("u1");

      expect(result).toEqual(roster);
      expect(mockPrisma.agentRoster.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        include: { comedian: true },
        orderBy: { startDate: "desc" },
      });
    });
  });

  /* ── API Keys ────────────────────────────────────────────────────── */

  describe("createApiKey", () => {
    it("creates API key with free tier defaults", async () => {
      const key = { id: "ak1", tier: "free", rateLimit: 100 };
      mockPrisma.apiKey.create.mockResolvedValue(key);

      const result = await createApiKey("u1", "My App");

      expect(result).toEqual(key);
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "u1",
          name: "My App",
          tier: "free",
          rateLimit: 100,
        }),
      });
    });

    it("creates pro tier API key with 1000 rate limit", async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: "ak1" });

      await createApiKey("u1", "Pro App", "pro");

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tier: "pro",
          rateLimit: 1000,
        }),
      });
    });

    it("creates enterprise tier API key with 10000 rate limit", async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: "ak1" });

      await createApiKey("u1", "Enterprise", "enterprise");

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tier: "enterprise",
          rateLimit: 10000,
        }),
      });
    });

    it("generates key with correct prefix", async () => {
      mockPrisma.apiKey.create.mockImplementation(({ data }: { data: { key: string } }) => {
        expect(data.key).toMatch(/^pa_pro_[a-f0-9]{48}$/);
        return Promise.resolve({ id: "ak1", key: data.key });
      });

      await createApiKey("u1", "Test", "pro");
    });
  });
});
