import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/**
 * Wallet Pass Generation & Management (Apple & Google Wallet)
 *
 * Generates pass payloads and manages pass lifecycle.
 * In production, Apple .pkpass signing and Google Pay JWT signing
 * would use actual certificates. This implementation generates the
 * correct payload structures ready for signing.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApplePassPayload {
  formatVersion: number;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  serialNumber: string;
  description: string;
  eventTicket: {
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      value: string;
      dateStyle?: string;
    }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  barcode: {
    format: string;
    message: string;
    messageEncoding: string;
  };
  barcodes: Array<{
    format: string;
    message: string;
    messageEncoding: string;
  }>;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  relevantDate?: string;
  locations?: Array<{ latitude: number; longitude: number; relevantText?: string }>;
  webServiceURL?: string;
  authenticationToken?: string;
}

export interface GooglePassPayload {
  id: string;
  classId: string;
  eventName: { defaultValue: { language: string; value: string } };
  dateTime: { start: string; end?: string };
  venue: {
    name: { defaultValue: { language: string; value: string } };
    address: { defaultValue: { language: string; value: string } };
  };
  ticketNumber: string;
  barcode: { type: string; value: string };
  hexBackgroundColor: string;
  logo: { sourceUri: { uri: string } };
  state: string;
  ticketType?: { defaultValue: { language: string; value: string } };
  seatInfo?: {
    seat?: { defaultValue: { language: string; value: string } };
    section?: { defaultValue: { language: string; value: string } };
  };
  linksModuleData?: {
    uris: Array<{
      uri: string;
      description: string;
      id: string;
    }>;
  };
}

// ─── Generate a wallet pass for a ticket ────────────────────────────────────

export async function generateWalletPass(
  userId: string,
  ticketId: string,
  platform: "apple" | "google"
) {
  if (!["apple", "google"].includes(platform)) {
    throw new Error("Platform must be 'apple' or 'google'");
  }

  // Fetch ticket with event and venue details
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: {
          venue: true,
          comedians: {
            include: { comedian: { select: { name: true } } },
          },
        },
      },
      ticketType: { select: { name: true } },
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const serialNumber = `PASS-${randomBytes(12).toString("hex").toUpperCase()}`;

  // Generate platform-specific payload
  const passPayload =
    platform === "apple"
      ? generateApplePassPayload(ticket, ticket.event, ticket.event.venue)
      : generateGooglePassPayload(ticket, ticket.event, ticket.event.venue);

  // Generate a pass URL (in production this would be an actual signed pass file)
  const passUrl =
    platform === "apple"
      ? `https://passes.punchlineatlas.com/apple/${serialNumber}.pkpass`
      : `https://passes.punchlineatlas.com/google/${serialNumber}`;

  const walletPass = await prisma.walletPass.create({
    data: {
      userId,
      ticketId,
      platform,
      passUrl,
      serialNumber,
      status: "active",
    },
  });

  return { ...walletPass, payload: passPayload };
}

// ─── Get wallet pass by serial number ───────────────────────────────────────

export async function getWalletPass(serialNumber: string) {
  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
  });

  if (!pass) {
    throw new Error("Wallet pass not found");
  }

  return pass;
}

// ─── List all passes for a user ─────────────────────────────────────────────

export async function getUserPasses(userId: string) {
  return prisma.walletPass.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Void a wallet pass ─────────────────────────────────────────────────────

export async function voidWalletPass(serialNumber: string) {
  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
  });

  if (!pass) {
    throw new Error("Wallet pass not found");
  }

  if (pass.status === "voided") {
    throw new Error("Pass is already voided");
  }

  return prisma.walletPass.update({
    where: { serialNumber },
    data: {
      status: "voided",
      lastUpdated: new Date(),
    },
  });
}

// ─── Update pass status ─────────────────────────────────────────────────────

export async function updatePassStatus(
  serialNumber: string,
  status: string
) {
  const validStatuses = ["active", "voided", "expired"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
  });

  if (!pass) {
    throw new Error("Wallet pass not found");
  }

  return prisma.walletPass.update({
    where: { serialNumber },
    data: {
      status,
      lastUpdated: new Date(),
    },
  });
}

// ─── Update passes for an event (when event details change) ─────────────────

export async function updatePassesForEvent(eventId: string): Promise<number> {
  // Find all tickets for the event
  const tickets = await prisma.ticket.findMany({
    where: { eventId },
    select: { id: true },
  });

  if (tickets.length === 0) return 0;

  const ticketIds = tickets.map((t) => t.id);

  // Find all active passes for these tickets
  const passes = await prisma.walletPass.findMany({
    where: {
      ticketId: { in: ticketIds },
      status: "active",
    },
  });

  // Mark all as needing update
  if (passes.length > 0) {
    await prisma.walletPass.updateMany({
      where: {
        id: { in: passes.map((p) => p.id) },
      },
      data: {
        lastUpdated: new Date(),
      },
    });
  }

  return passes.length;
}

// ─── Void all passes for a cancelled event ──────────────────────────────────

export async function voidPassesForEvent(eventId: string): Promise<number> {
  const tickets = await prisma.ticket.findMany({
    where: { eventId },
    select: { id: true },
  });

  if (tickets.length === 0) return 0;

  const result = await prisma.walletPass.updateMany({
    where: {
      ticketId: { in: tickets.map((t) => t.id) },
      status: "active",
    },
    data: {
      status: "voided",
      lastUpdated: new Date(),
    },
  });

  return result.count;
}

// ─── Generate Apple PKPass payload structure ────────────────────────────────

export function generateApplePassPayload(
  ticket: {
    id: string;
    qrCode?: string;
    purchasedAt?: Date | null;
    purchasePrice?: unknown;
  },
  event: {
    id: string;
    title?: string | null;
    date: Date;
    showtime?: string | null;
    comedians?: Array<{ comedian: { name: string } }>;
  },
  venue: {
    name: string;
    city: string;
    state: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }
): ApplePassPayload {
  const siteUrl =
    process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const comedianNames =
    event.comedians?.map((ec) => ec.comedian.name).join(", ") ?? "";
  const eventTitle = event.title || comedianNames || "Comedy Show";
  const qrValue = ticket.qrCode ?? ticket.id;

  const payload: ApplePassPayload = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.punchlineatlas.ticket",
    teamIdentifier: "PUNCHLINE",
    organizationName: "Punchline Atlas",
    serialNumber: ticket.id,
    description: eventTitle,
    eventTicket: {
      primaryFields: [
        {
          key: "event",
          label: "EVENT",
          value: eventTitle,
        },
      ],
      secondaryFields: [
        {
          key: "date",
          label: "DATE",
          value: event.date.toISOString(),
          dateStyle: "PKDateStyleMedium",
        },
        {
          key: "time",
          label: "TIME",
          value: event.showtime || "TBD",
        },
      ],
      auxiliaryFields: [
        {
          key: "venue",
          label: "VENUE",
          value: venue.name,
        },
        {
          key: "location",
          label: "LOCATION",
          value: `${venue.city}, ${venue.state}`,
        },
      ],
      backFields: [
        {
          key: "address",
          label: "ADDRESS",
          value: venue.address || `${venue.city}, ${venue.state}`,
        },
        {
          key: "ticketId",
          label: "TICKET ID",
          value: ticket.id,
        },
        {
          key: "website",
          label: "WEBSITE",
          value: `${siteUrl}/events/${event.id}`,
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: qrValue,
      messageEncoding: "iso-8859-1",
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: qrValue,
        messageEncoding: "iso-8859-1",
      },
    ],
    backgroundColor: "rgb(26, 26, 46)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(212, 168, 67)",
    relevantDate: event.date.toISOString(),
  };

  // Add venue location for lock-screen relevance
  if (venue.latitude != null && venue.longitude != null) {
    payload.locations = [
      {
        latitude: venue.latitude,
        longitude: venue.longitude,
        relevantText: `You're near ${venue.name} — show starts ${event.showtime ?? "soon"}!`,
      },
    ];
  }

  return payload;
}

// ─── Generate Google Pass payload structure ─────────────────────────────────

export function generateGooglePassPayload(
  ticket: {
    id: string;
    qrCode?: string;
    purchasedAt?: Date | null;
    purchasePrice?: unknown;
  },
  event: {
    id: string;
    title?: string | null;
    date: Date;
    showtime?: string | null;
    comedians?: Array<{ comedian: { name: string } }>;
  },
  venue: {
    name: string;
    city: string;
    state: string;
    address?: string | null;
  }
): GooglePassPayload {
  const siteUrl =
    process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const comedianNames =
    event.comedians?.map((ec) => ec.comedian.name).join(", ") ?? "";
  const eventTitle = event.title || comedianNames || "Comedy Show";
  const qrValue = ticket.qrCode ?? ticket.id;

  // Estimate end time (2 hours after start)
  const endDate = new Date(event.date.getTime() + 2 * 60 * 60 * 1000);

  const payload: GooglePassPayload = {
    id: `punchlineatlas.ticket.${ticket.id}`,
    classId: "punchlineatlas.comedy_ticket",
    eventName: {
      defaultValue: {
        language: "en-US",
        value: eventTitle,
      },
    },
    dateTime: {
      start: event.date.toISOString(),
      end: endDate.toISOString(),
    },
    venue: {
      name: {
        defaultValue: {
          language: "en-US",
          value: venue.name,
        },
      },
      address: {
        defaultValue: {
          language: "en-US",
          value: venue.address || `${venue.city}, ${venue.state}`,
        },
      },
    },
    ticketNumber: ticket.id,
    barcode: {
      type: "QR_CODE",
      value: qrValue,
    },
    hexBackgroundColor: "#1a1a2e",
    logo: {
      sourceUri: {
        uri: `${siteUrl}/icons/icon-192x192.png`,
      },
    },
    state: "ACTIVE",
    linksModuleData: {
      uris: [
        {
          uri: `${siteUrl}/events/${event.id}`,
          description: "View event details",
          id: "event-link",
        },
        {
          uri: `${siteUrl}/tickets/${ticket.id}`,
          description: "View ticket",
          id: "ticket-link",
        },
      ],
    },
  };

  return payload;
}
