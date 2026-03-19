import { NextResponse } from "next/server";
import { processLocationAlerts } from "@/lib/location-alert-notify";

/**
 * Cron: Process location alerts and notify users about new shows in their radius.
 * Runs daily. Protected by CRON_SECRET.
 *
 * Uses geo-fencing: compares event venue coordinates against user-saved
 * location alert centers with configurable radii. Sends both in-app
 * notifications and push notifications for new events within range.
 *
 * POST /api/cron/location-alerts
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processLocationAlerts();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Location alerts cron error:", err);
    return NextResponse.json(
      { error: "Failed to process location alerts" },
      { status: 500 }
    );
  }
}
