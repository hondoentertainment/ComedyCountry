import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/**
 * Phase 17: Wallet Pass Generation & Management (Apple/Google)
 */

/* ─── Generate a wallet pass for a ticket ───────────────────────────── */

export async function generateWalletPass(
  userId: string,
  ticketId: string,
  platform: "apple" | "google",
) {
  if (!["apple", "google"].includes(platform)) {
    throw new Error("Platform must be 'apple' or 'google'");
  }

  // Fetch ticket with event and venue details
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: { venue: true },
      },
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

/* ─── Get wallet pass by serial number ──────────────────────────────── */

export async function getWalletPass(serialNumber: string) {
  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
  });

  if (!pass) {
    throw new Error("Wallet pass not found");
  }

  return pass;
}

/* ─── List all passes for a user ────────────────────────────────────── */

export async function getUserPasses(userId: string) {
  return prisma.walletPass.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Void a wallet pass ────────────────────────────────────────────── */

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

/* ─── Update pass status ────────────────────────────────────────────── */

export async function updatePassStatus(
  serialNumber: string,
  status: string,
) {
  const validStatuses = ["active", "voided", "expired"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`);
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

/* ─── Generate Apple PKPass payload structure ───────────────────────── */

export function generateApplePassPayload(
  ticket: { id: string; purchasedAt?: Date | null },
  event: { id: string; title?: string | null; date: Date; showtime?: string | null },
  venue: { name: string; city: string; state: string; address?: string | null },
) {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.punchlineatlas.ticket",
    teamIdentifier: "PUNCHLINE",
    organizationName: "Punchline Atlas",
    serialNumber: ticket.id,
    description: event.title || "Comedy Show Ticket",
    eventTicket: {
      primaryFields: [
        {
          key: "event",
          label: "EVENT",
          value: event.title || "Comedy Show",
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
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: ticket.id,
      messageEncoding: "iso-8859-1",
    },
    backgroundColor: "rgb(26, 26, 46)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 215, 0)",
  };
}

/* ─── Generate Google Pass payload structure ─────────────────────────── */

export function generateGooglePassPayload(
  ticket: { id: string; purchasedAt?: Date | null },
  event: { id: string; title?: string | null; date: Date; showtime?: string | null },
  venue: { name: string; city: string; state: string; address?: string | null },
) {
  return {
    id: `punchlineatlas.ticket.${ticket.id}`,
    classId: "punchlineatlas.comedy_ticket",
    eventName: {
      defaultValue: {
        language: "en-US",
        value: event.title || "Comedy Show",
      },
    },
    dateTime: {
      start: event.date.toISOString(),
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
      value: ticket.id,
    },
    hexBackgroundColor: "#1a1a2e",
    logo: {
      sourceUri: {
        uri: "https://punchlineatlas.com/logo.png",
      },
    },
    state: "ACTIVE",
  };
}
