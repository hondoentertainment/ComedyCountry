import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processReviewPrompts } from "@/lib/review-prompts";

/**
 * Cron endpoint: Send review prompts to users who attended events
 * that ended 18-30 hours ago but haven't left a review yet.
 * Should be called hourly or every few hours.
 * Protected by CRON_API_KEY.
 *
 * POST /api/cron/review-prompts
 */
export async function POST(request: Request) {
  // Verify API key
  const apiKey = request.headers.get("x-api-key");
  const cronApiKey = process.env.CRON_API_KEY;
  if (!cronApiKey || apiKey !== cronApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processReviewPrompts();

    return NextResponse.json({
      success: true,
      eventsProcessed: result.eventsProcessed,
      promptsSent: result.promptsSent,
    });
  } catch (err) {
    logger.error(
      "Review prompts cron error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process review prompts" },
      { status: 500 },
    );
  }
}
