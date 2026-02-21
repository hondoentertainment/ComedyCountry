import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Venues
  const venue1 = await prisma.venue.upsert({
    where: { id: "seed-venue-1" },
    update: {
      address: "117 MacDougal St",
      latitude: 40.7304,
      longitude: -73.9982,
    },
    create: {
      id: "seed-venue-1",
      name: "The Comedy Cellar",
      address: "117 MacDougal St",
      city: "New York",
      state: "NY",
      latitude: 40.7304,
      longitude: -73.9982,
      capacity: 150,
      website: "https://comedycellar.com",
      type: "CLUB",
    },
  });

  const venue2 = await prisma.venue.upsert({
    where: { id: "seed-venue-2" },
    update: {
      address: "8001 Sunset Blvd",
      latitude: 34.0901,
      longitude: -118.3615,
    },
    create: {
      id: "seed-venue-2",
      name: "Laugh Factory",
      address: "8001 Sunset Blvd",
      city: "Los Angeles",
      state: "CA",
      latitude: 34.0901,
      longitude: -118.3615,
      capacity: 300,
      website: "https://laughfactory.com",
      type: "CLUB",
    },
  });

  const venue3 = await prisma.venue.upsert({
    where: { id: "seed-venue-3" },
    update: {
      address: "1548 N Wells St",
      latitude: 41.9103,
      longitude: -87.6369,
    },
    create: {
      id: "seed-venue-3",
      name: "Zanies Comedy Club",
      address: "1548 N Wells St",
      city: "Chicago",
      state: "IL",
      latitude: 41.9103,
      longitude: -87.6369,
      capacity: 200,
      website: "https://zanies.com",
      type: "CLUB",
    },
  });

  const venue4 = await prisma.venue.upsert({
    where: { id: "seed-venue-4" },
    update: {},
    create: {
      id: "seed-venue-4",
      name: "Cap City Comedy Club",
      address: "8120 Research Blvd",
      city: "Austin",
      state: "TX",
      latitude: 30.4013,
      longitude: -97.7544,
      capacity: 350,
      website: "https://capcitycomedy.com",
      type: "CLUB",
    },
  });

  // Comedians
  const comedian1 = await prisma.comedian.upsert({
    where: { slug: "louis-ck" },
    update: {},
    create: {
      name: "Louis C.K.",
      slug: "louis-ck",
      bio: "Stand-up comedian, writer, and filmmaker.",
      yearsActiveFrom: 1984,
      touringStatus: "TOURING",
      genres: {
        create: [{ genre: "observational" }, { genre: "dark" }],
      },
    },
  });

  const comedian2 = await prisma.comedian.upsert({
    where: { slug: "ali-wong" },
    update: {},
    create: {
      name: "Ali Wong",
      slug: "ali-wong",
      bio: "Comedian, actress, and writer known for her Netflix specials.",
      yearsActiveFrom: 2005,
      touringStatus: "TOURING",
      genres: {
        create: [{ genre: "observational" }, { genre: "storyteller" }],
      },
    },
  });

  const comedian3 = await prisma.comedian.upsert({
    where: { slug: "nate-bargatze" },
    update: {},
    create: {
      name: "Nate Bargatze",
      slug: "nate-bargatze",
      bio: "Clean comedian known for deadpan delivery.",
      yearsActiveFrom: 2002,
      touringStatus: "TOURING",
      website: "https://natebargatze.com",
      genres: {
        create: [{ genre: "observational" }, { genre: "absurdist" }],
      },
    },
  });

  // YouTube channels (channelId can be handle for sync to resolve via forHandle)
  await prisma.youTubeChannel.upsert({
    where: { comedianId: comedian3.id },
    update: {},
    create: {
      comedianId: comedian3.id,
      channelId: "NateBargatzeComedy",
      channelUrl: "https://www.youtube.com/@NateBargatzeComedy",
    },
  });

  // Specials
  await prisma.comedianSpecial.upsert({
    where: { id: "seed-special-1" },
    update: {},
    create: {
      id: "seed-special-1",
      comedianId: comedian1.id,
      title: "Oh My God",
      platform: "self-released",
      releaseYear: 2020,
      url: "https://louisck.net/",
    },
  });
  await prisma.comedianSpecial.upsert({
    where: { id: "seed-special-2" },
    update: {},
    create: {
      id: "seed-special-2",
      comedianId: comedian2.id,
      title: "Don Wong",
      platform: "Netflix",
      releaseYear: 2022,
      url: "https://www.netflix.com/title/81034902",
    },
  });
  await prisma.comedianSpecial.upsert({
    where: { id: "seed-special-3" },
    update: {},
    create: {
      id: "seed-special-3",
      comedianId: comedian3.id,
      title: "Hello World",
      platform: "Netflix",
      releaseYear: 2023,
      url: "https://www.netflix.com/title/81034902",
    },
  });

  // Events
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  const eventDates = [1, 7, 14, 21, 3, 10, 17, 5, 12];
  const eventConfigs = [
    { venue: venue1, comedian: comedian1, dayOffset: 1 },
    { venue: venue1, comedian: comedian2, dayOffset: 7 },
    { venue: venue2, comedian: comedian1, dayOffset: 14 },
    { venue: venue2, comedian: comedian3, dayOffset: 21 },
    { venue: venue2, comedian: comedian2, dayOffset: 3 },
    { venue: venue3, comedian: comedian3, dayOffset: 10 },
    { venue: venue3, comedian: comedian1, dayOffset: 17 },
    { venue: venue3, comedian: comedian2, dayOffset: 5 },
    { venue: venue1, comedian: comedian3, dayOffset: 12 },
    { venue: venue4, comedian: comedian3, dayOffset: 4 },
    { venue: venue4, comedian: comedian2, dayOffset: 15 },
  ];

  for (let i = 0; i < eventConfigs.length; i++) {
    const { venue, comedian, dayOffset } = eventConfigs[i];
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + dayOffset);
    eventDate.setHours(19, 30, 0, 0);

    await prisma.event.upsert({
      where: { id: `seed-event-${i + 1}` },
      update: {},
      create: {
        id: `seed-event-${i + 1}`,
        venueId: venue.id,
        date: eventDate,
        showtime: "7:30 PM & 10:00 PM",
        ticketUrl: venue.website ? `${venue.website}/tickets` : null,
        showType: "HEADLINE",
        comedians: {
          create: {
            comedianId: comedian.id,
            role: "headline",
          },
        },
      },
    });
  }

  console.log(
    "Seed completed: 4 venues, 3 comedians, 11 events, 1 YouTube channel, 3 specials"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
