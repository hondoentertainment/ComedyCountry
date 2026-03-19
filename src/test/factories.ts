/**
 * Test Data Factories
 *
 * Generate realistic test entities with sensible defaults.
 * Every factory returns a plain object — override any field via spread.
 *
 * Usage:
 *   import { factories } from "@/test/factories";
 *
 *   const event = factories.event();
 *   const event = factories.event({ title: "My Show" });
 *   const events = factories.many(factories.event, 5);
 */

let _counter = 0;
function nextId(prefix = "id"): string {
  return `${prefix}-${++_counter}`;
}

/** Reset the auto-increment counter between tests */
export function resetFactoryCounter(): void {
  _counter = 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(daysFromNow = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function date(daysFromNow = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

// ─── Core Entities ───────────────────────────────────────────────────────────

function user(overrides: Record<string, unknown> = {}) {
  const id = nextId("user");
  return {
    id,
    email: `${id}@test.com`,
    name: `Test User ${id}`,
    role: "user",
    image: null,
    createdAt: date(-30),
    updatedAt: date(),
    ...overrides,
  };
}

function comedian(overrides: Record<string, unknown> = {}) {
  const id = nextId("comedian");
  return {
    id,
    name: `Comedian ${id}`,
    slug: `comedian-${id}`,
    bio: "A very funny comedian",
    headshotUrl: `https://example.com/headshots/${id}.jpg`,
    touringStatus: "TOURING",
    website: `https://comedian-${id}.com`,
    yearsActiveFrom: 2010,
    yearsActiveTo: null,
    representation: null,
    genres: [],
    socialLinks: [],
    specialReleases: [],
    podcastLinks: [],
    youtubeChannel: null,
    _count: { events: 5, followers: 100 },
    createdAt: date(-30),
    updatedAt: date(),
    ...overrides,
  };
}

function comedianGenre(overrides: Record<string, unknown> = {}) {
  const id = nextId("cg");
  return {
    id,
    comedianId: "comedian-1",
    genre: "Observational",
    ...overrides,
  };
}

function eventComedian(overrides: Record<string, unknown> = {}) {
  const id = nextId("ec");
  return {
    id,
    eventId: "event-1",
    comedianId: "comedian-1",
    role: "headline",
    comedian: comedian(),
    ...overrides,
  };
}

function venue(overrides: Record<string, unknown> = {}) {
  const id = nextId("venue");
  return {
    id,
    name: `Comedy Club ${id}`,
    slug: `comedy-club-${id}`,
    address: "123 Laugh St",
    city: "Nashville",
    state: "TN",
    zip: "37201",
    capacity: 200,
    ownerId: "owner-1",
    createdAt: date(-60),
    updatedAt: date(),
    ...overrides,
  };
}

function event(overrides: Record<string, unknown> = {}) {
  const id = nextId("event");
  return {
    id,
    title: `Comedy Night ${id}`,
    slug: `comedy-night-${id}`,
    description: "A hilarious evening of stand-up comedy",
    venueId: "venue-1",
    date: date(7),
    startTime: "20:00",
    endTime: "22:00",
    ticketPrice: 25,
    capacity: 200,
    status: "published",
    createdAt: date(-10),
    updatedAt: date(),
    ...overrides,
  };
}

// ─── Phase 14: Venue Ops ─────────────────────────────────────────────────────

function tableLayout(overrides: Record<string, unknown> = {}) {
  const id = nextId("tl");
  return {
    id,
    venueId: "venue-1",
    name: "Main Room",
    rows: 10,
    columns: 8,
    seats: [],
    isDefault: false,
    createdAt: date(-5),
    ...overrides,
  };
}

function drinkMinimum(overrides: Record<string, unknown> = {}) {
  const id = nextId("dm");
  return {
    id,
    eventId: "event-1",
    ticketType: "GA",
    minimumCount: 2,
    minimumSpend: null,
    enforceAt: "door",
    createdAt: date(-3),
    ...overrides,
  };
}

function walkUpSale(overrides: Record<string, unknown> = {}) {
  const id = nextId("ws");
  return {
    id,
    eventId: "event-1",
    ticketType: "GA",
    amount: 25,
    paymentMethod: "cash",
    createdAt: date(),
    ...overrides,
  };
}

function compListEntry(overrides: Record<string, unknown> = {}) {
  const id = nextId("cl");
  return {
    id,
    eventId: "event-1",
    guestName: "John Doe",
    guestEmail: "john@example.com",
    tickets: 2,
    reason: "industry",
    status: "pending",
    approvedBy: null,
    checkedIn: false,
    createdAt: date(-1),
    ...overrides,
  };
}

function staffShift(overrides: Record<string, unknown> = {}) {
  const id = nextId("ss");
  return {
    id,
    venueId: "venue-1",
    staffName: "Alice",
    role: "door",
    startTime: date(1),
    endTime: new Date(date(1).getTime() + 5 * 60 * 60 * 1000),
    notes: null,
    createdAt: date(-2),
    ...overrides,
  };
}

function menuItem(overrides: Record<string, unknown> = {}) {
  const id = nextId("mi");
  return {
    id,
    venueId: "venue-1",
    category: "drinks",
    name: "Craft Beer",
    description: "Local IPA",
    price: 8.5,
    isAvailable: true,
    createdAt: date(-10),
    ...overrides,
  };
}

function preOrder(overrides: Record<string, unknown> = {}) {
  const id = nextId("po");
  return {
    id,
    eventId: "event-1",
    customerName: "Jane Smith",
    items: [{ menuItemId: "mi-1", quantity: 2 }],
    totalAmount: 17,
    status: "pending",
    createdAt: date(-1),
    ...overrides,
  };
}

// ─── Phase 15: Short-Form Clips ──────────────────────────────────────────────

function shortClip(overrides: Record<string, unknown> = {}) {
  const id = nextId("clip");
  return {
    id,
    comedianId: "comedian-1",
    title: "Killer Bit",
    videoUrl: "https://cdn.example.com/clip.mp4",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    duration: 45,
    views: 1000,
    likes: 150,
    shares: 30,
    tags: ["standup", "observational"],
    status: "published",
    createdAt: date(-3),
    updatedAt: date(),
    ...overrides,
  };
}

function clipChallenge(overrides: Record<string, unknown> = {}) {
  const id = nextId("challenge");
  return {
    id,
    title: "Best Crowd Work",
    description: "Show us your best crowd work moment",
    hashtag: "#BestCrowdWork",
    startDate: date(),
    endDate: date(7),
    prizeDescription: "Featured on homepage",
    status: "active",
    createdAt: date(-1),
    ...overrides,
  };
}

function trendingBit(overrides: Record<string, unknown> = {}) {
  const id = nextId("trend");
  return {
    id,
    clipId: "clip-1",
    score: 85.5,
    period: "daily",
    rank: 1,
    calculatedAt: date(),
    ...overrides,
  };
}

// ─── Phase 16: Marketing ─────────────────────────────────────────────────────

function smsCampaign(overrides: Record<string, unknown> = {}) {
  const id = nextId("sms");
  return {
    id,
    name: "Weekend Show Promo",
    message: "Don't miss our weekend comedy lineup! Tickets at comedy.co",
    targetSegmentId: "seg-1",
    scheduledAt: date(1),
    status: "scheduled",
    sentCount: 0,
    createdAt: date(-2),
    ...overrides,
  };
}

function smsSubscriber(overrides: Record<string, unknown> = {}) {
  const id = nextId("sub");
  return {
    id,
    phone: "+16155551234",
    userId: "user-1",
    optedInAt: date(-30),
    optedOutAt: null,
    tcpaConsentRecorded: true,
    createdAt: date(-30),
    ...overrides,
  };
}

function audienceSegment(overrides: Record<string, unknown> = {}) {
  const id = nextId("seg");
  return {
    id,
    name: "Frequent Attendees",
    criteria: { minVisits: 5, genres: ["standup"] },
    memberCount: 250,
    createdAt: date(-15),
    ...overrides,
  };
}

function referralCode(overrides: Record<string, unknown> = {}) {
  const id = nextId("ref");
  return {
    id,
    code: `COMEDY${id.toUpperCase()}`,
    ownerId: "user-1",
    discountPercent: 10,
    maxRedemptions: 100,
    currentRedemptions: 0,
    isActive: true,
    expiresAt: date(30),
    createdAt: date(-5),
    ...overrides,
  };
}

function abTest(overrides: Record<string, unknown> = {}) {
  const id = nextId("ab");
  return {
    id,
    name: "Ticket Page CTA",
    variantA: { label: "Buy Now", color: "blue" },
    variantB: { label: "Get Tickets", color: "green" },
    impressionsA: 500,
    impressionsB: 500,
    conversionsA: 50,
    conversionsB: 65,
    status: "running",
    startedAt: date(-7),
    endedAt: null,
    createdAt: date(-7),
    ...overrides,
  };
}

// ─── Phase 17: Accessibility ─────────────────────────────────────────────────

function accessibilityTag(overrides: Record<string, unknown> = {}) {
  const id = nextId("a11y");
  return {
    id,
    name: "ASL Interpreter",
    slug: "asl-interpreter",
    category: "hearing",
    icon: "hand-wave",
    description: "ASL interpreter available for this show",
    createdAt: date(-60),
    ...overrides,
  };
}

function walletPass(overrides: Record<string, unknown> = {}) {
  const id = nextId("pass");
  return {
    id,
    serialNumber: `SN-${id}`,
    userId: "user-1",
    eventId: "event-1",
    platform: "apple",
    passUrl: `https://passes.example.com/${id}`,
    createdAt: date(-1),
    ...overrides,
  };
}

// ─── Phase 18: International ─────────────────────────────────────────────────

function internationalScene(overrides: Record<string, unknown> = {}) {
  const id = nextId("scene");
  return {
    id,
    country: "UK",
    city: "London",
    name: "London Comedy Circuit",
    description: "The heart of British comedy",
    comedianCount: 500,
    venueCount: 50,
    primaryLanguage: "en",
    currency: "GBP",
    createdAt: date(-90),
    ...overrides,
  };
}

function festivalCircuit(overrides: Record<string, unknown> = {}) {
  const id = nextId("fest");
  return {
    id,
    name: "Edinburgh Fringe",
    country: "UK",
    city: "Edinburgh",
    startDate: date(60),
    endDate: date(90),
    applicationDeadline: date(30),
    description: "The world's largest arts festival",
    website: "https://www.edfringe.com",
    estimatedCost: 5000,
    currency: "GBP",
    createdAt: date(-180),
    ...overrides,
  };
}

function comedyStyle(overrides: Record<string, unknown> = {}) {
  const id = nextId("style");
  return {
    id,
    name: "Observational",
    region: "global",
    description: "Comedy based on everyday observations",
    examples: ["Jerry Seinfeld", "Michael McIntyre"],
    createdAt: date(-365),
    ...overrides,
  };
}

function touringInfo(overrides: Record<string, unknown> = {}) {
  const id = nextId("tour");
  return {
    id,
    country: "UK",
    visaRequired: false,
    workPermitInfo: "Tier 5 Creative Worker visa for extended stays",
    taxInfo: "20% withholding tax, reducible via treaty",
    unionRequirements: null,
    tipsAndNotes: "Strong pub comedy scene",
    updatedAt: date(-30),
    ...overrides,
  };
}

function promoterApplication(overrides: Record<string, unknown> = {}) {
  const id = nextId("promo");
  return {
    id,
    name: "Global Comedy Tours",
    country: "UK",
    city: "London",
    email: "booking@globalcomedytours.com",
    venueCount: 12,
    status: "pending",
    submittedAt: date(-5),
    ...overrides,
  };
}

// ─── Batch helper ────────────────────────────────────────────────────────────

/**
 * Generate N entities from a factory.
 * Usage: factories.many(factories.event, 5, { venueId: "v1" })
 */
function many<T>(
  factory: (overrides?: Record<string, unknown>) => T,
  count: number,
  overrides: Record<string, unknown> = {}
): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const factories = {
  // Helpers
  many,
  resetCounter: resetFactoryCounter,

  // Core
  user,
  comedian,
  comedianGenre,
  eventComedian,
  venue,
  event,

  // Phase 14: Venue Ops
  tableLayout,
  drinkMinimum,
  walkUpSale,
  compListEntry,
  staffShift,
  menuItem,
  preOrder,

  // Phase 15: Short-Form Clips
  shortClip,
  clipChallenge,
  trendingBit,

  // Phase 16: Marketing
  smsCampaign,
  smsSubscriber,
  audienceSegment,
  referralCode,
  abTest,

  // Phase 17: Accessibility
  accessibilityTag,
  walletPass,

  // Phase 18: International
  internationalScene,
  festivalCircuit,
  comedyStyle,
  touringInfo,
  promoterApplication,
} as const;
