import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, parseBody, badRequest, serverError, rateLimited } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import {
  generatePurchaseToken,
  generateCampaignTokens,
  validatePurchaseToken,
  redeemPurchaseToken,
  generateCampaignEmailBody,
} from "@/lib/email-purchase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) return badRequest("token parameter is required");

  try {
    const result = await validatePurchaseToken(token);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("Token validation failed", {}, err instanceof Error ? err : undefined);
    return serverError();
  }
}

const generateTokenSchema = z.object({
  action: z.literal("generate-token"),
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  recipientEmail: z.email(),
  maxQuantity: z.number().int().min(1).max(10).optional(),
  expiresInHours: z.number().int().min(1).max(168).optional(),
});

const campaignTokensSchema = z.object({
  action: z.literal("generate-campaign-tokens"),
  campaignId: z.string().min(1),
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  recipientEmails: z.array(z.email()).min(1).max(1000),
  maxQuantity: z.number().int().min(1).max(10).optional(),
  expiresInHours: z.number().int().min(1).max(168).optional(),
});

const redeemSchema = z.object({
  action: z.literal("redeem"),
  token: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

const emailBodySchema = z.object({
  action: z.literal("generate-email-body"),
  campaignId: z.string().min(1),
  recipientEmail: z.email(),
  headerText: z.string().optional(),
  buttonColor: z.string().optional(),
});

const postSchema = z.discriminatedUnion("action", [
  generateTokenSchema,
  campaignTokensSchema,
  redeemSchema,
  emailBodySchema,
]);

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(getRateLimitKey(request), { limit: 30, windowSeconds: 60 });
  if (!rl.success) return rateLimited();

  const { data, error: valErr } = await parseBody(request, postSchema);
  if (valErr) return valErr;

  try {
    switch (data.action) {
      case "generate-token": {
        const { session, error } = await requireAuth();
        if (error) return error;

        const token = await generatePurchaseToken(data.eventId, data.ticketTypeId, data.recipientEmail, {
          maxQuantity: data.maxQuantity,
          expiresInHours: data.expiresInHours,
        });
        return NextResponse.json(token, { status: 201 });
      }

      case "generate-campaign-tokens": {
        const { session, error } = await requireAuth();
        if (error) return error;

        const result = await generateCampaignTokens(
          data.campaignId,
          data.eventId,
          data.ticketTypeId,
          data.recipientEmails,
          { maxQuantity: data.maxQuantity, expiresInHours: data.expiresInHours }
        );
        return NextResponse.json(result, { status: 201 });
      }

      case "redeem": {
        const result = await redeemPurchaseToken(data.token, data.quantity);
        return NextResponse.json(result);
      }

      case "generate-email-body": {
        const { session, error } = await requireAuth();
        if (error) return error;

        const html = await generateCampaignEmailBody(data.campaignId, data.recipientEmail, {
          headerText: data.headerText,
          buttonColor: data.buttonColor,
        });
        return NextResponse.json({ html });
      }
    }
  } catch (err) {
    logger.error("Email purchase request failed", { action: data.action }, err instanceof Error ? err : undefined);
    const message = err instanceof Error ? err.message : "Request failed";
    return badRequest(message);
  }
}
