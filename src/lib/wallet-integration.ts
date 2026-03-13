import { createHmac, randomBytes } from "crypto";
import { prisma } from "./prisma";

/**
 * Phase 17: Apple Wallet (PKPass) & Google Wallet pass generation for tickets.
 * Extends the base wallet-passes module with advanced pass generation,
 * JWT signing for Google Wallet, and event-change updates.
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface ApplePassJSON {
  formatVersion: number;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  serialNumber: string;
  description: string;
  relevantDate: string;
  expirationDate?: string;
  voided?: boolean;
  eventTicket: {
    headerFields: Array<{ key: string; label: string; value: string }>;
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      value: string;
      dateStyle?: string;
      timeStyle?: string;
    }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  barcode: {
    format: string;
    message: string;
    messageEncoding: string;
    altText: string;
  };
  locations?: Array<{
    latitude: number;
    longitude: number;
    relevantText: string;
  }>;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoText: string;
  webServiceURL?: string;
  authenticationToken?: string;
}

export interface GoogleWalletPassJWT {
  iss: string;
  aud: string;
  typ: string;
  iat: number;
  payload: {
    eventTicketObjects: Array<{
      id: string;
      classId: string;
      state: string;
      ticketNumber: string;
      eventName: { defaultValue: { language: string; value: string } };
      dateTime: { start: string; end?: string };
      venue: {
        name: { defaultValue: { language: string; value: string } };
        address: { defaultValue: { language: string; value: string } };
      };
      barcode: { type: string; value: string; alternateText: string };
      hexBackgroundColor: string;
      logo: { sourceUri: { uri: string }; description: string };
      ticketHolderName?: string;
      seatInfo?: {
        seat: { defaultValue: { language: string; value: string } };
        section: { defaultValue: { language: string; value: string } };
      };
    }>;
  };
}

export interface TicketData {
  id: string;
  userId: string;
  purchasedAt?: Date | null;
  seatNumber?: string | null;
  seatSection?: string | null;
}

export interface EventData {
  id: string;
  title?: string | null;
  date: Date;
  endDate?: Date | null;
  showtime?: string | null;
}

export interface VenueData {
  name: string;
  city: string;
  state: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/* ─── Constants ───────────────────────────────────────────────────────── */

const APPLE_PASS_TYPE_ID = "pass.com.punchlineatlas.ticket";
const APPLE_TEAM_ID = "PUNCHLINE";
const GOOGLE_ISSUER_ID = "punchlineatlas";
const GOOGLE_CLASS_ID = `${GOOGLE_ISSUER_ID}.comedy_ticket`;
const BASE_URL = "https://passes.punchlineatlas.com";

/* ─── Generate Apple Wallet Pass JSON ─────────────────────────────────── */

export function generateAppleWalletPassJSON(
  ticket: TicketData,
  event: EventData,
  venue: VenueData,
): ApplePassJSON {
  const serialNumber = `APPLE-${ticket.id}`;
  const eventTitle = event.title || "Comedy Show";
  const eventDate = event.date.toISOString();

  const passJSON: ApplePassJSON = {
    formatVersion: 1,
    passTypeIdentifier: APPLE_PASS_TYPE_ID,
    teamIdentifier: APPLE_TEAM_ID,
    organizationName: "Punchline Atlas",
    serialNumber,
    description: `Ticket: ${eventTitle}`,
    relevantDate: eventDate,
    eventTicket: {
      headerFields: [
        {
          key: "ticketType",
          label: "TICKET",
          value: "General Admission",
        },
      ],
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
          value: event.date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          dateStyle: "PKDateStyleMedium",
        },
        {
          key: "time",
          label: "TIME",
          value: event.showtime || "TBD",
          timeStyle: "PKTimeStyleShort",
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
          label: "VENUE ADDRESS",
          value: venue.address || `${venue.city}, ${venue.state}`,
        },
        {
          key: "ticketId",
          label: "TICKET ID",
          value: ticket.id,
        },
        {
          key: "purchaseDate",
          label: "PURCHASED",
          value: ticket.purchasedAt
            ? ticket.purchasedAt.toLocaleDateString("en-US")
            : "N/A",
        },
        {
          key: "support",
          label: "SUPPORT",
          value: "support@punchlineatlas.com",
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: `PUNCHLINE:${ticket.id}`,
      messageEncoding: "iso-8859-1",
      altText: ticket.id,
    },
    backgroundColor: "rgb(26, 26, 46)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 215, 0)",
    logoText: "Punchline Atlas",
    webServiceURL: `${BASE_URL}/api/apple`,
    authenticationToken: createHmac("sha256", process.env.WALLET_SECRET || "punchline-secret")
      .update(ticket.id)
      .digest("hex"),
  };

  // Add seat info if available
  if (ticket.seatNumber) {
    passJSON.eventTicket.auxiliaryFields.push({
      key: "seat",
      label: "SEAT",
      value: ticket.seatSection
        ? `${ticket.seatSection} - ${ticket.seatNumber}`
        : ticket.seatNumber,
    });
  }

  // Add location-based notification if venue has coordinates
  if (venue.latitude && venue.longitude) {
    passJSON.locations = [
      {
        latitude: venue.latitude,
        longitude: venue.longitude,
        relevantText: `Your show at ${venue.name} is nearby!`,
      },
    ];
  }

  // Set expiration to event end date or day after event
  if (event.endDate) {
    passJSON.expirationDate = event.endDate.toISOString();
  } else {
    const expiry = new Date(event.date);
    expiry.setDate(expiry.getDate() + 1);
    passJSON.expirationDate = expiry.toISOString();
  }

  return passJSON;
}

/* ─── Generate Google Wallet Pass JWT ─────────────────────────────────── */

export function generateGoogleWalletPassJWT(
  ticket: TicketData,
  event: EventData,
  venue: VenueData,
  holderName?: string,
): GoogleWalletPassJWT {
  const eventTitle = event.title || "Comedy Show";
  const now = Math.floor(Date.now() / 1000);

  const ticketObject: GoogleWalletPassJWT["payload"]["eventTicketObjects"][0] = {
    id: `${GOOGLE_ISSUER_ID}.ticket.${ticket.id}`,
    classId: GOOGLE_CLASS_ID,
    state: "ACTIVE",
    ticketNumber: ticket.id,
    eventName: {
      defaultValue: {
        language: "en-US",
        value: eventTitle,
      },
    },
    dateTime: {
      start: event.date.toISOString(),
      ...(event.endDate ? { end: event.endDate.toISOString() } : {}),
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
    barcode: {
      type: "QR_CODE",
      value: `PUNCHLINE:${ticket.id}`,
      alternateText: ticket.id,
    },
    hexBackgroundColor: "#1a1a2e",
    logo: {
      sourceUri: {
        uri: "https://punchlineatlas.com/logo.png",
      },
      description: "Punchline Atlas",
    },
  };

  // Add holder name if provided
  if (holderName) {
    ticketObject.ticketHolderName = holderName;
  }

  // Add seat info if available
  if (ticket.seatNumber) {
    ticketObject.seatInfo = {
      seat: {
        defaultValue: {
          language: "en-US",
          value: ticket.seatNumber,
        },
      },
      section: {
        defaultValue: {
          language: "en-US",
          value: ticket.seatSection || "General",
        },
      },
    };
  }

  return {
    iss: `${GOOGLE_ISSUER_ID}@punchlineatlas.iam.gserviceaccount.com`,
    aud: "google",
    typ: "savetowallet",
    iat: now,
    payload: {
      eventTicketObjects: [ticketObject],
    },
  };
}

/* ─── Sign JWT for Google Wallet ──────────────────────────────────────── */

export function signGoogleWalletJWT(jwt: GoogleWalletPassJWT): string {
  const secret = process.env.GOOGLE_WALLET_SECRET || "google-wallet-secret";

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");

  const payload = Buffer.from(JSON.stringify(jwt)).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/* ─── Update passes when events change ────────────────────────────────── */

export async function updatePassesForEvent(
  eventId: string,
  updates: {
    title?: string;
    date?: Date;
    showtime?: string;
    cancelled?: boolean;
  },
) {
  // Find all wallet passes linked to tickets for this event
  const passes = await prisma.walletPass.findMany({
    where: {
      ticket: {
        eventId,
      },
      status: "active",
    },
    include: {
      ticket: {
        include: {
          event: {
            include: { venue: true },
          },
        },
      },
    },
  });

  if (passes.length === 0) {
    return { updated: 0, passes: [] };
  }

  const updatedPasses = [];

  for (const pass of passes) {
    const ticket = pass.ticket;
    const event = ticket.event;
    const venue = event.venue;

    // Apply updates to event data for pass regeneration
    const updatedEvent: EventData = {
      id: event.id,
      title: updates.title ?? event.title,
      date: updates.date ?? event.date,
      showtime: updates.showtime ?? event.showtime,
    };

    let newStatus = pass.status;
    let passPayload: unknown;

    if (updates.cancelled) {
      newStatus = "voided";
    } else {
      // Regenerate pass payload based on platform
      if (pass.platform === "apple") {
        const applePass = generateAppleWalletPassJSON(
          {
            id: ticket.id,
            userId: pass.userId,
            purchasedAt: ticket.purchasedAt,
          },
          updatedEvent,
          venue,
        );
        if (updates.cancelled) {
          applePass.voided = true;
        }
        passPayload = applePass;
      } else {
        const googleJWT = generateGoogleWalletPassJWT(
          {
            id: ticket.id,
            userId: pass.userId,
            purchasedAt: ticket.purchasedAt,
          },
          updatedEvent,
          venue,
        );
        if (updates.cancelled) {
          googleJWT.payload.eventTicketObjects[0].state = "EXPIRED";
        }
        passPayload = googleJWT;
      }
    }

    const updatedPass = await prisma.walletPass.update({
      where: { id: pass.id },
      data: {
        status: newStatus,
        lastUpdated: new Date(),
      },
    });

    updatedPasses.push({
      ...updatedPass,
      payload: passPayload,
    });
  }

  return { updated: updatedPasses.length, passes: updatedPasses };
}

/* ─── Generate pass URL for download ──────────────────────────────────── */

export function generatePassDownloadURL(
  serialNumber: string,
  platform: "apple" | "google",
): string {
  const token = randomBytes(16).toString("hex");
  if (platform === "apple") {
    return `${BASE_URL}/apple/${serialNumber}.pkpass?token=${token}`;
  }
  return `${BASE_URL}/google/save?serial=${serialNumber}&token=${token}`;
}

/* ─── Batch generate passes for an event's attendees ──────────────────── */

export async function batchGeneratePassesForEvent(
  eventId: string,
  platform: "apple" | "google",
) {
  const tickets = await prisma.ticket.findMany({
    where: { eventId },
    include: {
      event: {
        include: { venue: true },
      },
      user: true,
    },
  });

  if (tickets.length === 0) {
    return { generated: 0, passes: [] };
  }

  const generatedPasses = [];

  for (const ticket of tickets) {
    // Check if pass already exists for this ticket + platform
    const existing = await prisma.walletPass.findFirst({
      where: {
        ticketId: ticket.id,
        platform,
        status: "active",
      },
    });

    if (existing) {
      continue;
    }

    const event = ticket.event;
    const venue = event.venue;
    const serialNumber = `PASS-${randomBytes(12).toString("hex").toUpperCase()}`;

    let passPayload: unknown;

    if (platform === "apple") {
      passPayload = generateAppleWalletPassJSON(
        {
          id: ticket.id,
          userId: ticket.userId,
          purchasedAt: ticket.purchasedAt,
        },
        {
          id: event.id,
          title: event.title,
          date: event.date,
          showtime: event.showtime,
        },
        venue,
      );
    } else {
      const jwt = generateGoogleWalletPassJWT(
        {
          id: ticket.id,
          userId: ticket.userId,
          purchasedAt: ticket.purchasedAt,
        },
        {
          id: event.id,
          title: event.title,
          date: event.date,
          showtime: event.showtime,
        },
        venue,
        ticket.user?.name || undefined,
      );
      passPayload = jwt;
    }

    const passUrl = generatePassDownloadURL(serialNumber, platform);

    const walletPass = await prisma.walletPass.create({
      data: {
        userId: ticket.userId,
        ticketId: ticket.id,
        platform,
        passUrl,
        serialNumber,
        status: "active",
      },
    });

    generatedPasses.push({ ...walletPass, payload: passPayload });
  }

  return { generated: generatedPasses.length, passes: generatedPasses };
}
