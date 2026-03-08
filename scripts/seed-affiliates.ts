/**
 * Seed affiliate partner configurations for ticket revenue tracking.
 * Run: npx tsx scripts/seed-affiliates.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const partners = [
  {
    name: "Ticketmaster",
    slug: "ticketmaster",
    baseUrl: "ticketmaster.com",
    affiliateTag: "punchlineatlas",
    commissionPct: 5.0,
  },
  {
    name: "AXS",
    slug: "axs",
    baseUrl: "axs.com",
    affiliateTag: "punchlineatlas",
    commissionPct: 4.5,
  },
  {
    name: "Eventbrite",
    slug: "eventbrite",
    baseUrl: "eventbrite.com",
    affiliateTag: "aff_punchlineatlas",
    commissionPct: 3.0,
  },
  {
    name: "SeatGeek",
    slug: "seatgeek",
    baseUrl: "seatgeek.com",
    affiliateTag: "punchlineatlas",
    commissionPct: 4.0,
  },
  {
    name: "StubHub",
    slug: "stubhub",
    baseUrl: "stubhub.com",
    affiliateTag: "punchlineatlas",
    commissionPct: 3.5,
  },
  {
    name: "Dice",
    slug: "dice",
    baseUrl: "dice.fm",
    affiliateTag: "punchlineatlas",
    commissionPct: 5.0,
  },
];

async function main() {
  console.log("Seeding affiliate partners...");

  for (const partner of partners) {
    await prisma.affiliatePartner.upsert({
      where: { slug: partner.slug },
      update: {
        name: partner.name,
        baseUrl: partner.baseUrl,
        affiliateTag: partner.affiliateTag,
        commissionPct: partner.commissionPct,
        isActive: true,
      },
      create: partner,
    });
    console.log(`  + ${partner.name} (${partner.baseUrl}) @ ${partner.commissionPct}%`);
  }

  console.log(`\nSeeded ${partners.length} affiliate partners.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
