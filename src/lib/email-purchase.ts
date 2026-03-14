import { prisma } from "./prisma";
import { randomBytes } from "crypto";

/**
 * In-Email Ticket Purchase — One-Click Buy Links
 *
 * Generates secure, time-limited purchase tokens that can be embedded
 * in email campaigns. When clicked, the token auto-authenticates
 * and takes the user straight to a pre-filled checkout.
 *
 * Flow:
 * 1. Venue creates email campaign with ticket offers
 * 2. System generates unique purchase tokens per recipient
 * 3. Email contains "Buy Now" links with tokens
 * 4. Clicking the link validates token and processes purchase
 * 5. Confirmation shown without requiring login
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmailPurchaseToken {
  id: string;
  token: string;
  eventId: string;
  ticketTypeId: string;
  recipientEmail: string;
  maxQuantity: number;
  expiresAt: Date;
  used: boolean;
  campaignId: string | null;
}

export interface EmailTicketOffer {
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  purchaseUrl: string;
  expiresAt: Date;
}

// ── Token generation ─────────────────────────────────────────────────────────

/**
 * Generate a secure purchase token for email embedding.
 * Token is valid for a limited time and single-use.
 */
export async function generatePurchaseToken(
  eventId: string,
  ticketTypeId: string,
  recipientEmail: string,
  options?: {
    maxQuantity?: number;
    expiresInHours?: number;
    campaignId?: string;
  }
): Promise<EmailPurchaseToken> {
  // Validate event and ticket type exist
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { event: { include: { venue: true } } },
  });

  if (!ticketType) throw new Error("Ticket type not found");
  if (ticketType.eventId !== eventId) throw new Error("Ticket type does not match event");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (options?.expiresInHours ?? 72));

  const record = await prisma.emailPurchaseToken.create({
    data: {
      token,
      eventId,
      ticketTypeId,
      recipientEmail,
      maxQuantity: options?.maxQuantity ?? 2,
      expiresAt,
      campaignId: options?.campaignId ?? null,
    },
  });

  return record as EmailPurchaseToken;
}

/**
 * Generate purchase tokens for all recipients of an email campaign.
 */
export async function generateCampaignTokens(
  campaignId: string,
  eventId: string,
  ticketTypeId: string,
  recipientEmails: string[],
  options?: { maxQuantity?: number; expiresInHours?: number }
): Promise<{ generated: number; tokens: EmailPurchaseToken[] }> {
  const tokens: EmailPurchaseToken[] = [];

  for (const email of recipientEmails) {
    const token = await generatePurchaseToken(eventId, ticketTypeId, email, {
      ...options,
      campaignId,
    });
    tokens.push(token);
  }

  return { generated: tokens.length, tokens };
}

// ── Token validation & redemption ────────────────────────────────────────────

/**
 * Validate a purchase token — checks expiry, usage, and availability.
 */
export async function validatePurchaseToken(token: string): Promise<{
  valid: boolean;
  reason?: string;
  offer?: EmailTicketOffer;
  tokenRecord?: EmailPurchaseToken;
}> {
  const record = await prisma.emailPurchaseToken.findUnique({
    where: { token },
    include: {
      ticketType: {
        include: {
          event: { include: { venue: { select: { name: true } } } },
        },
      },
    },
  });

  if (!record) {
    return { valid: false, reason: "Invalid token" };
  }

  if (record.used) {
    return { valid: false, reason: "Token already used" };
  }

  if (new Date() > record.expiresAt) {
    return { valid: false, reason: "Token expired" };
  }

  // Check ticket availability
  const available = record.ticketType.capacity - record.ticketType.sold;
  if (available <= 0) {
    return { valid: false, reason: "Tickets sold out" };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://comedycountry.com";

  return {
    valid: true,
    tokenRecord: record as unknown as EmailPurchaseToken,
    offer: {
      eventId: record.eventId,
      ticketTypeId: record.ticketTypeId,
      ticketTypeName: record.ticketType.name,
      price: Number(record.ticketType.price),
      eventTitle: record.ticketType.event.title ?? "Comedy Show",
      eventDate: record.ticketType.event.date.toISOString(),
      venueName: record.ticketType.event.venue.name,
      purchaseUrl: `${baseUrl}/checkout/email?token=${token}`,
      expiresAt: record.expiresAt,
    },
  };
}

/**
 * Redeem a purchase token — process the actual ticket purchase.
 */
export async function redeemPurchaseToken(
  token: string,
  quantity: number
): Promise<{
  success: boolean;
  ticketIds: string[];
  totalPrice: number;
}> {
  const validation = await validatePurchaseToken(token);

  if (!validation.valid || !validation.tokenRecord) {
    throw new Error(validation.reason ?? "Invalid token");
  }

  if (quantity > validation.tokenRecord.maxQuantity) {
    throw new Error(`Maximum ${validation.tokenRecord.maxQuantity} tickets per purchase`);
  }

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: validation.tokenRecord.ticketTypeId },
  });

  if (!ticketType) throw new Error("Ticket type not found");

  const available = ticketType.capacity - ticketType.sold;
  if (quantity > available) {
    throw new Error(`Only ${available} tickets available`);
  }

  const unitPrice = Number(ticketType.price);
  const totalPrice = unitPrice * quantity;

  // Find or create user by email
  let user = await prisma.user.findUnique({
    where: { email: validation.tokenRecord.recipientEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: validation.tokenRecord.recipientEmail,
        name: validation.tokenRecord.recipientEmail.split("@")[0],
      },
    });
  }

  // Create tickets
  const ticketIds: string[] = [];
  for (let i = 0; i < quantity; i++) {
    const qrCode = `EMAIL-${validation.tokenRecord.eventId.slice(0, 6)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ticket = await prisma.ticket.create({
      data: {
        eventId: validation.tokenRecord.eventId,
        userId: user.id,
        ticketTypeId: validation.tokenRecord.ticketTypeId,
        qrCode,
        purchasePrice: unitPrice,
        status: "VALID",
      },
    });
    ticketIds.push(ticket.id);
  }

  // Update sold count
  await prisma.ticketType.update({
    where: { id: validation.tokenRecord.ticketTypeId },
    data: { sold: { increment: quantity } },
  });

  // Mark token as used
  await prisma.emailPurchaseToken.update({
    where: { token },
    data: { used: true, usedAt: new Date() },
  });

  // Track campaign conversion if applicable
  if (validation.tokenRecord.campaignId) {
    await prisma.emailCampaign.update({
      where: { id: validation.tokenRecord.campaignId },
      data: { clickCount: { increment: 1 } },
    });
  }

  return { success: true, ticketIds, totalPrice };
}

// ── Email HTML generation ────────────────────────────────────────────────────

/**
 * Generate HTML for embedding a "Buy Now" button in email campaigns.
 */
export function generateEmailPurchaseButton(
  offer: EmailTicketOffer,
  options?: {
    buttonColor?: string;
    buttonText?: string;
  }
): string {
  const color = options?.buttonColor ?? "#059669";
  const text = options?.buttonText ?? `Buy Tickets - $${offer.price}`;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius: 8px; background: ${color};">
            <a href="${offer.purchaseUrl}" target="_blank"
               style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif;
                      font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;
                      border-radius: 8px;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #888; margin-top: 8px;">
        ${offer.eventTitle} &middot; ${new Date(offer.eventDate).toLocaleDateString()} &middot; ${offer.venueName}
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 11px; color: #aaa;">
        Offer expires ${new Date(offer.expiresAt).toLocaleDateString()}
      </p>
    </td>
  </tr>
</table>`.trim();
}

/**
 * Generate a complete email body with ticket offers for a campaign.
 */
export async function generateCampaignEmailBody(
  campaignId: string,
  recipientEmail: string,
  options?: {
    headerText?: string;
    buttonColor?: string;
  }
): Promise<string> {
  const tokens = await prisma.emailPurchaseToken.findMany({
    where: { campaignId, recipientEmail },
    include: {
      ticketType: {
        include: {
          event: { include: { venue: { select: { name: true } } } },
        },
      },
    },
  });

  if (tokens.length === 0) return "";

  const baseUrl = process.env.NEXTAUTH_URL || "https://comedycountry.com";

  const offerButtons = tokens.map((t) => {
    const offer: EmailTicketOffer = {
      eventId: t.eventId,
      ticketTypeId: t.ticketTypeId,
      ticketTypeName: t.ticketType.name,
      price: Number(t.ticketType.price),
      eventTitle: t.ticketType.event.title ?? "Comedy Show",
      eventDate: t.ticketType.event.date.toISOString(),
      venueName: t.ticketType.event.venue.name,
      purchaseUrl: `${baseUrl}/checkout/email?token=${t.token}`,
      expiresAt: t.expiresAt,
    };
    return generateEmailPurchaseButton(offer, {
      buttonColor: options?.buttonColor,
      buttonText: `${offer.ticketTypeName} - $${offer.price}`,
    });
  });

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #111; text-align: center;">
    ${options?.headerText ?? "Your Exclusive Ticket Offer"}
  </h2>
  ${offerButtons.join("\n")}
  <p style="font-size: 11px; color: #999; text-align: center; margin-top: 24px;">
    Powered by ComedyCountry Fair Ticketing
  </p>
</div>`.trim();
}
