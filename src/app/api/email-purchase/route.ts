import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generatePurchaseToken,
  generateCampaignTokens,
  validatePurchaseToken,
  redeemPurchaseToken,
  generateCampaignEmailBody,
} from "@/lib/email-purchase";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * In-Email Ticket Purchase API
 *
 * POST — generate purchase tokens or redeem them
 * GET  — validate a token (for checkout page)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "token parameter is required" },
      { status: 400 }
    );
  }

  try {
    const result = await validatePurchaseToken(token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request), { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "generate-token": {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { eventId, ticketTypeId, recipientEmail, maxQuantity, expiresInHours } = body;

        if (!eventId || !ticketTypeId || !recipientEmail) {
          return NextResponse.json(
            { error: "eventId, ticketTypeId, and recipientEmail are required" },
            { status: 400 }
          );
        }

        const token = await generatePurchaseToken(eventId, ticketTypeId, recipientEmail, {
          maxQuantity,
          expiresInHours,
        });

        return NextResponse.json(token, { status: 201 });
      }

      case "generate-campaign-tokens": {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { campaignId, eventId: cEventId, ticketTypeId: cTicketTypeId, recipientEmails, maxQuantity: cMax, expiresInHours: cExp } = body;

        if (!campaignId || !cEventId || !cTicketTypeId || !recipientEmails?.length) {
          return NextResponse.json(
            { error: "campaignId, eventId, ticketTypeId, and recipientEmails are required" },
            { status: 400 }
          );
        }

        const result = await generateCampaignTokens(
          campaignId,
          cEventId,
          cTicketTypeId,
          recipientEmails,
          { maxQuantity: cMax, expiresInHours: cExp }
        );

        return NextResponse.json(result, { status: 201 });
      }

      case "redeem": {
        const { token, quantity } = body;

        if (!token || !quantity) {
          return NextResponse.json(
            { error: "token and quantity are required" },
            { status: 400 }
          );
        }

        const result = await redeemPurchaseToken(token, quantity);
        return NextResponse.json(result);
      }

      case "generate-email-body": {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { campaignId: emailCampaignId, recipientEmail: emailRecipient, headerText, buttonColor } = body;

        if (!emailCampaignId || !emailRecipient) {
          return NextResponse.json(
            { error: "campaignId and recipientEmail are required" },
            { status: 400 }
          );
        }

        const html = await generateCampaignEmailBody(
          emailCampaignId,
          emailRecipient,
          { headerText, buttonColor }
        );

        return NextResponse.json({ html });
      }

      default:
        return NextResponse.json(
          { error: "action must be generate-token, generate-campaign-tokens, redeem, or generate-email-body" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
