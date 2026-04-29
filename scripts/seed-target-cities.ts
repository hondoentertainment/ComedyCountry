import "dotenv/config";
import { PrismaClient, type VenueType, type ShowType } from "@prisma/client";

const prisma = new PrismaClient();

const comedians = [
  {
    slug: "maya-ramirez",
    name: "Maya Ramirez",
    bio: "Observational comic with sharp city-specific crowd work.",
    touringStatus: "TOURING" as const,
    genres: ["observational", "crowd-work"],
  },
  {
    slug: "darius-brooks",
    name: "Darius Brooks",
    bio: "Story-driven stand-up with late-night club energy.",
    touringStatus: "REGIONAL" as const,
    genres: ["storyteller", "club"],
  },
  {
    slug: "nina-kapoor",
    name: "Nina Kapoor",
    bio: "Alt-room favorite with a smart, conversational set.",
    touringStatus: "LOCAL" as const,
    genres: ["alternative", "conversational"],
  },
  {
    slug: "elliot-ward",
    name: "Elliot Ward",
    bio: "Road-tested clean comic with theater crossover appeal.",
    touringStatus: "TOURING" as const,
    genres: ["clean", "storyteller"],
  },
  {
    slug: "tasha-nguyen",
    name: "Tasha Nguyen",
    bio: "Fast-paced comic known for podcast-to-stage fan conversion.",
    touringStatus: "TOURING" as const,
    genres: ["observational", "podcast-live"],
  },
];

const venues: Array<{
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  website: string;
  type: VenueType;
  socials: Array<{ platform: string; url: string }>;
  accessibility: Array<{ type: string; description: string; verifiedBy: string }>;
}> = [
  {
    id: "target-city-venue-nyc-underground",
    name: "West Village Underground",
    city: "New York",
    state: "NY",
    address: "118 MacDougal St",
    latitude: 40.7304,
    longitude: -73.9984,
    capacity: 145,
    website: "https://example.com/west-village-underground",
    type: "CLUB",
    socials: [{ platform: "instagram", url: "https://instagram.com/westvillageunderground" }],
    accessibility: [{ type: "wheelchair", description: "Street-level accessible entrance", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-nyc-brooklyn",
    name: "Brooklyn Punch Room",
    city: "New York",
    state: "NY",
    address: "240 Wythe Ave",
    latitude: 40.7219,
    longitude: -73.9574,
    capacity: 110,
    website: "https://example.com/brooklyn-punch-room",
    type: "BAR",
    socials: [{ platform: "instagram", url: "https://instagram.com/brooklynpunchroom" }],
    accessibility: [{ type: "captioned", description: "Caption screens available on request", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-la-hollywood",
    name: "Hollywood Stand-Up Lab",
    city: "Los Angeles",
    state: "CA",
    address: "7712 Santa Monica Blvd",
    latitude: 34.0907,
    longitude: -118.3588,
    capacity: 180,
    website: "https://example.com/hollywood-standup-lab",
    type: "CLUB",
    socials: [{ platform: "instagram", url: "https://instagram.com/hollywoodstanduplab" }],
    accessibility: [{ type: "wheelchair", description: "Accessible seating at every show", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-la-eastside",
    name: "Eastside Laugh Loft",
    city: "Los Angeles",
    state: "CA",
    address: "1717 Sunset Blvd",
    latitude: 34.0776,
    longitude: -118.259,
    capacity: 90,
    website: "https://example.com/eastside-laugh-loft",
    type: "BAR",
    socials: [{ platform: "instagram", url: "https://instagram.com/eastsidelaughloft" }],
    accessibility: [{ type: "assistive_listening", description: "Assistive listening devices available", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-chi-river",
    name: "River North Punchline",
    city: "Chicago",
    state: "IL",
    address: "411 N State St",
    latitude: 41.8899,
    longitude: -87.6278,
    capacity: 170,
    website: "https://example.com/river-north-punchline",
    type: "CLUB",
    socials: [{ platform: "instagram", url: "https://instagram.com/rivernorthpunchline" }],
    accessibility: [{ type: "wheelchair", description: "Main room seating is fully accessible", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-chi-logan",
    name: "Logan Square Joke House",
    city: "Chicago",
    state: "IL",
    address: "2620 N Milwaukee Ave",
    latitude: 41.9296,
    longitude: -87.7112,
    capacity: 95,
    website: "https://example.com/logan-square-joke-house",
    type: "BAR",
    socials: [{ platform: "instagram", url: "https://instagram.com/logansquarejokehouse" }],
    accessibility: [{ type: "captioned", description: "Captioning supported for scheduled accessible nights", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-aus-downtown",
    name: "Downtown Austin Comedy Hall",
    city: "Austin",
    state: "TX",
    address: "318 E 5th St",
    latitude: 30.2662,
    longitude: -97.7394,
    capacity: 160,
    website: "https://example.com/downtown-austin-comedy-hall",
    type: "CLUB",
    socials: [{ platform: "instagram", url: "https://instagram.com/downtownaustincomedyhall" }],
    accessibility: [{ type: "wheelchair", description: "Accessible entrance and restroom", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-aus-east",
    name: "East Austin Open Mic House",
    city: "Austin",
    state: "TX",
    address: "1200 E 6th St",
    latitude: 30.2644,
    longitude: -97.7303,
    capacity: 85,
    website: "https://example.com/east-austin-open-mic-house",
    type: "OPEN_MIC",
    socials: [{ platform: "instagram", url: "https://instagram.com/eastaustinopenmichouse" }],
    accessibility: [{ type: "assistive_listening", description: "Portable assistive listening available", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-phl-center",
    name: "Center City Stand-Up Club",
    city: "Philadelphia",
    state: "PA",
    address: "1316 Sansom St",
    latitude: 39.9498,
    longitude: -75.1638,
    capacity: 135,
    website: "https://example.com/center-city-standup-club",
    type: "CLUB",
    socials: [{ platform: "instagram", url: "https://instagram.com/centercitystandupclub" }],
    accessibility: [{ type: "wheelchair", description: "Front-of-house and mezzanine seating are accessible", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-venue-phl-fishtown",
    name: "Fishtown Laugh Exchange",
    city: "Philadelphia",
    state: "PA",
    address: "1225 Frankford Ave",
    latitude: 39.9698,
    longitude: -75.1346,
    capacity: 92,
    website: "https://example.com/fishtown-laugh-exchange",
    type: "BAR",
    socials: [{ platform: "instagram", url: "https://instagram.com/fishtownlaughexchange" }],
    accessibility: [{ type: "captioned", description: "Captioning available at front tables", verifiedBy: "ops-seed" }],
  },
];

const events: Array<{
  id: string;
  venueId: string;
  dayOffset: number;
  showtime: string;
  title: string;
  showType: ShowType;
  priceMin: number;
  priceMax: number;
  comedians: Array<{ slug: string; role: string }>;
  fairPolicy: { maxMarkupPercent: number; resaleMaxPercent: number };
  accessibility: Array<{ type: string; description: string; verifiedBy: string }>;
}> = [
  {
    id: "target-city-event-nyc-1",
    venueId: "target-city-venue-nyc-underground",
    dayOffset: 2,
    showtime: "7:30 PM",
    title: "Fresh Lineups Tonight",
    showType: "HEADLINE",
    priceMin: 22,
    priceMax: 35,
    comedians: [{ slug: "maya-ramirez", role: "headline" }, { slug: "nina-kapoor", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 0, resaleMaxPercent: 0 },
    accessibility: [{ type: "wheelchair", description: "ADA seating confirmed for this performance", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-nyc-2",
    venueId: "target-city-venue-nyc-brooklyn",
    dayOffset: 6,
    showtime: "9:00 PM",
    title: "Late Set in Williamsburg",
    showType: "FEATURE",
    priceMin: 18,
    priceMax: 28,
    comedians: [{ slug: "tasha-nguyen", role: "headline" }],
    fairPolicy: { maxMarkupPercent: 5, resaleMaxPercent: 5 },
    accessibility: [{ type: "captioned", description: "Reserved captioned seating available", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-la-1",
    venueId: "target-city-venue-la-hollywood",
    dayOffset: 3,
    showtime: "8:00 PM",
    title: "Hollywood Club Set",
    showType: "HEADLINE",
    priceMin: 24,
    priceMax: 40,
    comedians: [{ slug: "elliot-ward", role: "headline" }, { slug: "maya-ramirez", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 0, resaleMaxPercent: 0 },
    accessibility: [{ type: "wheelchair", description: "Accessible seating is held at box office", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-la-2",
    venueId: "target-city-venue-la-eastside",
    dayOffset: 9,
    showtime: "7:00 PM",
    title: "Eastside Alt Night",
    showType: "FEATURE",
    priceMin: 15,
    priceMax: 24,
    comedians: [{ slug: "nina-kapoor", role: "headline" }],
    fairPolicy: { maxMarkupPercent: 10, resaleMaxPercent: 10 },
    accessibility: [{ type: "assistive_listening", description: "Assistive listening available by request", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-chi-1",
    venueId: "target-city-venue-chi-river",
    dayOffset: 4,
    showtime: "8:30 PM",
    title: "River North Weekend Warm-Up",
    showType: "HEADLINE",
    priceMin: 20,
    priceMax: 32,
    comedians: [{ slug: "darius-brooks", role: "headline" }],
    fairPolicy: { maxMarkupPercent: 0, resaleMaxPercent: 0 },
    accessibility: [{ type: "wheelchair", description: "Accessible seating is guaranteed with advance notice", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-chi-2",
    venueId: "target-city-venue-chi-logan",
    dayOffset: 11,
    showtime: "9:15 PM",
    title: "Neighborhood Showcase",
    showType: "FEATURE",
    priceMin: 14,
    priceMax: 22,
    comedians: [{ slug: "maya-ramirez", role: "headline" }, { slug: "nina-kapoor", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 12, resaleMaxPercent: 10 },
    accessibility: [{ type: "captioned", description: "Captioning available at front-of-room monitors", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-aus-1",
    venueId: "target-city-venue-aus-downtown",
    dayOffset: 5,
    showtime: "8:00 PM",
    title: "Downtown Headliner Set",
    showType: "HEADLINE",
    priceMin: 19,
    priceMax: 30,
    comedians: [{ slug: "tasha-nguyen", role: "headline" }, { slug: "elliot-ward", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 0, resaleMaxPercent: 0 },
    accessibility: [{ type: "wheelchair", description: "Accessible route confirmed for performance night", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-aus-2",
    venueId: "target-city-venue-aus-east",
    dayOffset: 8,
    showtime: "7:30 PM",
    title: "Open Mic With a Working Room",
    showType: "OPEN_MIC",
    priceMin: 10,
    priceMax: 15,
    comedians: [{ slug: "darius-brooks", role: "host" }],
    fairPolicy: { maxMarkupPercent: 5, resaleMaxPercent: 0 },
    accessibility: [{ type: "assistive_listening", description: "Portable listening support available", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-phl-1",
    venueId: "target-city-venue-phl-center",
    dayOffset: 7,
    showtime: "8:00 PM",
    title: "Center City Saturday Showcase",
    showType: "HEADLINE",
    priceMin: 21,
    priceMax: 34,
    comedians: [{ slug: "elliot-ward", role: "headline" }, { slug: "maya-ramirez", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 0, resaleMaxPercent: 0 },
    accessibility: [{ type: "wheelchair", description: "Accessible seating reserved in advance", verifiedBy: "ops-seed" }],
  },
  {
    id: "target-city-event-phl-2",
    venueId: "target-city-venue-phl-fishtown",
    dayOffset: 12,
    showtime: "9:30 PM",
    title: "Fishtown Late Room",
    showType: "FEATURE",
    priceMin: 16,
    priceMax: 24,
    comedians: [{ slug: "nina-kapoor", role: "headline" }, { slug: "tasha-nguyen", role: "feature" }],
    fairPolicy: { maxMarkupPercent: 8, resaleMaxPercent: 8 },
    accessibility: [{ type: "captioned", description: "Caption display available in first rows", verifiedBy: "ops-seed" }],
  },
];

async function upsertComedians() {
  for (const comedian of comedians) {
    await prisma.comedian.upsert({
      where: { slug: comedian.slug },
      update: {
        name: comedian.name,
        bio: comedian.bio,
        touringStatus: comedian.touringStatus,
      },
      create: {
        name: comedian.name,
        slug: comedian.slug,
        bio: comedian.bio,
        touringStatus: comedian.touringStatus,
        genres: {
          create: comedian.genres.map((genre) => ({ genre })),
        },
      },
    });
  }
}

async function upsertVenues() {
  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: venue.id },
      update: {
        name: venue.name,
        city: venue.city,
        state: venue.state,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        capacity: venue.capacity,
        website: venue.website,
        type: venue.type,
      },
      create: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        capacity: venue.capacity,
        website: venue.website,
        type: venue.type,
      },
    });

    await prisma.venueSocialLink.deleteMany({ where: { venueId: venue.id } });
    await prisma.venueSocialLink.createMany({
      data: venue.socials.map((social) => ({
        venueId: venue.id,
        platform: social.platform,
        url: social.url,
      })),
    });

    await prisma.accessibilityTag.deleteMany({
      where: { venueId: venue.id, eventId: null },
    });
    await prisma.accessibilityTag.createMany({
      data: venue.accessibility.map((tag) => ({
        venueId: venue.id,
        type: tag.type,
        description: tag.description,
        verifiedBy: tag.verifiedBy,
        verifiedAt: new Date(),
      })),
    });
  }
}

async function upsertEvents() {
  const comedianMap = new Map(
    (
      await prisma.comedian.findMany({
        where: { slug: { in: comedians.map((comedian) => comedian.slug) } },
        select: { id: true, slug: true },
      })
    ).map((comedian) => [comedian.slug, comedian.id]),
  );
  const venueMap = new Map(
    (
      await prisma.venue.findMany({
        where: { id: { in: venues.map((venue) => venue.id) } },
        select: { id: true, website: true },
      })
    ).map((venue) => [venue.id, venue.website]),
  );

  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  for (const event of events) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + event.dayOffset);
    date.setHours(20, 0, 0, 0);
    const website = venueMap.get(event.venueId) ?? "https://example.com";
    const ticketUrl = `${website}/tickets`;

    await prisma.event.upsert({
      where: { id: event.id },
      update: {
        venueId: event.venueId,
        date,
        showtime: event.showtime,
        title: event.title,
        showType: event.showType,
        ticketUrl,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
      },
      create: {
        id: event.id,
        venueId: event.venueId,
        date,
        showtime: event.showtime,
        title: event.title,
        showType: event.showType,
        ticketUrl,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
      },
    });

    await prisma.eventComedian.deleteMany({ where: { eventId: event.id } });
    await prisma.eventComedian.createMany({
      data: event.comedians.map((comedian) => ({
        eventId: event.id,
        comedianId: comedianMap.get(comedian.slug) as string,
        role: comedian.role,
      })),
    });

    await prisma.fairPricePolicy.upsert({
      where: { eventId: event.id },
      update: {
        showAllFees: true,
        maxMarkupPercent: event.fairPolicy.maxMarkupPercent,
        allowResale: event.fairPolicy.resaleMaxPercent > 0,
        resaleMaxPercent: event.fairPolicy.resaleMaxPercent,
        antiScalpingEnabled: true,
      },
      create: {
        eventId: event.id,
        showAllFees: true,
        maxMarkupPercent: event.fairPolicy.maxMarkupPercent,
        allowResale: event.fairPolicy.resaleMaxPercent > 0,
        resaleMaxPercent: event.fairPolicy.resaleMaxPercent,
        antiScalpingEnabled: true,
      },
    });

    await prisma.accessibilityTag.deleteMany({
      where: { eventId: event.id },
    });
    await prisma.accessibilityTag.createMany({
      data: event.accessibility.map((tag) => ({
        eventId: event.id,
        type: tag.type,
        description: tag.description,
        verifiedBy: tag.verifiedBy,
        verifiedAt: new Date(),
      })),
    });
  }
}

async function main() {
  console.log("Seeding target-city operational footprint...");
  await upsertComedians();
  await upsertVenues();
  await upsertEvents();
  console.log(
    `Seeded ${comedians.length} comedians, ${venues.length} venues, and ${events.length} events across NYC, LA, Chicago, Austin, and Philly.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
