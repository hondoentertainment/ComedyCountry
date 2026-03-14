/**
 * Cross-Phase Integration Tests
 *
 * Tests that validate interactions between different phase features.
 * Uses the test harness utilities to verify the modules compose correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, factories, resetFactoryCounter } from "./index";

// ── Phase 14 + 15: Venue Ops meets Clips ─────────────────────────────────────
// A venue event's capacity and walk-up sales should be trackable alongside
// clips recorded at the same event.

describe("cross-phase: venue ops + clips data shapes", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("event factory links to venue for both venue-ops and clips", () => {
    const v = factories.venue();
    const e = factories.event({ venueId: v.id });
    const clip = factories.shortClip({ eventId: e.id });
    const sale = factories.walkUpSale({ eventId: e.id });

    expect(clip.eventId).toBe(e.id);
    expect(sale.eventId).toBe(e.id);
    expect(e.venueId).toBe(v.id);
  });
});

// ── Phase 16 + 15: Marketing referrals for clip challenges ───────────────────

describe("cross-phase: marketing + clips", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("referral code can be associated with a clip challenge", () => {
    const challenge = factories.clipChallenge();
    const refCode = factories.referralCode({ campaignId: challenge.id });

    expect(refCode.campaignId).toBe(challenge.id);
    expect(refCode.isActive).toBe(true);
  });

  it("SMS campaign can target clip viewers segment", () => {
    const segment = factories.audienceSegment({
      name: "Clip Viewers",
      criteria: { minClipViews: 10 },
    });
    const campaign = factories.smsCampaign({
      targetSegmentId: segment.id,
      message: "Watch the trending clips!",
    });

    expect(campaign.targetSegmentId).toBe(segment.id);
  });
});

// ── Phase 17 + 14: Accessibility in venue operations ─────────────────────────

describe("cross-phase: accessibility + venue ops", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("venue can have accessibility tags alongside table layouts", () => {
    const v = factories.venue({ capacity: 300 });
    const layout = factories.tableLayout({
      venueId: v.id,
      name: "Wheelchair Accessible Section",
    });
    const tag = factories.accessibilityTag({
      name: "Wheelchair Access",
      category: "mobility",
    });

    expect(layout.venueId).toBe(v.id);
    expect(tag.category).toBe("mobility");
  });

  it("comp list can include accessibility accommodation notes", () => {
    const entry = factories.compListEntry({
      guestName: "Jane Doe",
      reason: "accessibility-comp",
      notes: "Requires ASL interpreter",
    });

    expect(entry.reason).toBe("accessibility-comp");
    expect(entry.notes).toContain("ASL");
  });
});

// ── Phase 18 + 16: International marketing ───────────────────────────────────

describe("cross-phase: international + marketing", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("audience segment can target international scenes", () => {
    const scene = factories.internationalScene({ country: "AU", city: "Melbourne" });
    const segment = factories.audienceSegment({
      name: "Melbourne Comedy Fans",
      criteria: { location: { country: "AU", city: "Melbourne" } },
    });

    expect(segment.criteria.location.country).toBe(scene.country);
  });

  it("festival promotion via SMS campaign", () => {
    const festival = factories.festivalCircuit({ name: "Melbourne Comedy Festival" });
    const campaign = factories.smsCampaign({
      name: `Promote: ${festival.name}`,
      message: `${festival.name} apps open!`,
    });

    expect(campaign.name).toContain("Melbourne Comedy Festival");
  });
});

// ── Phase 18 + 15: International clips ───────────────────────────────────────

describe("cross-phase: international + clips", () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  it("clips can be tagged with comedy styles", () => {
    const style = factories.comedyStyle({ name: "Pantomime", region: "UK" });
    const clip = factories.shortClip({
      tags: ["pantomime", "physical"],
      styleId: style.id,
    });

    expect(clip.styleId).toBe(style.id);
    expect(clip.tags).toContain("pantomime");
  });
});

// ── Mock Prisma integration with factories ───────────────────────────────────

describe("mock prisma + factories integration", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
  });

  it("mock prisma returns factory-generated data", async () => {
    const events = factories.many(factories.event, 3);
    mockPrisma.event.findMany.mockResolvedValue(events);

    const result = await mockPrisma.event.findMany({
      where: { status: "published" },
    });

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe("published");
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { status: "published" },
    });
  });

  it("mock prisma handles create with factory data", async () => {
    const newClip = factories.shortClip();
    mockPrisma.shortClip.create.mockResolvedValue(newClip);

    const result = await mockPrisma.shortClip.create({
      data: { title: newClip.title, videoUrl: newClip.videoUrl },
    });

    expect(result.id).toBe(newClip.id);
    expect(result.title).toBe("Killer Bit");
  });

  it("$transaction works with multiple model operations", async () => {
    const venue = factories.venue();
    const tag = factories.accessibilityTag();

    mockPrisma.venue.create.mockResolvedValue(venue);
    mockPrisma.accessibilityTag.create.mockResolvedValue(tag);

    const [v, t] = await mockPrisma.$transaction([
      mockPrisma.venue.create({ data: venue }),
      mockPrisma.accessibilityTag.create({ data: tag }),
    ]);

    expect(v).toEqual(venue);
    expect(t).toEqual(tag);
  });

  it("handles error scenarios with factories", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    const result = await mockPrisma.event.findUnique({
      where: { id: "nonexistent" },
    });

    expect(result).toBeNull();
  });

  it("mock prisma works across all phase models", async () => {
    // Phase 14
    mockPrisma.tableLayout.findMany.mockResolvedValue([factories.tableLayout()]);
    // Phase 15
    mockPrisma.shortClip.findMany.mockResolvedValue([factories.shortClip()]);
    // Phase 16
    mockPrisma.sMSCampaign.findMany.mockResolvedValue([factories.smsCampaign()]);
    // Phase 17
    mockPrisma.accessibilityTag.findMany.mockResolvedValue([factories.accessibilityTag()]);
    // Phase 18
    mockPrisma.internationalScene.findMany.mockResolvedValue([factories.internationalScene()]);

    const [layouts, clips, campaigns, tags, scenes] = await Promise.all([
      mockPrisma.tableLayout.findMany(),
      mockPrisma.shortClip.findMany(),
      mockPrisma.sMSCampaign.findMany(),
      mockPrisma.accessibilityTag.findMany(),
      mockPrisma.internationalScene.findMany(),
    ]);

    expect(layouts).toHaveLength(1);
    expect(clips).toHaveLength(1);
    expect(campaigns).toHaveLength(1);
    expect(tags).toHaveLength(1);
    expect(scenes).toHaveLength(1);
  });
});
