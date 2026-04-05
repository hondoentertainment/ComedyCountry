import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCalendarSync,
  listCalendarSyncs,
  deleteCalendarSync,
  generateUserCalendarFeed,
  syncToProvider,
} from "@/lib/calendar-sync";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/calendar-sync
 *
 * List all calendar syncs for the authenticated user.
 * If ?format=ical is passed, returns the iCal feed instead.
 */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`calendar-sync:${getRateLimitKey(req)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = req.nextUrl.searchParams.get("format");

    if (format === "ical") {
      const feed = await generateUserCalendarFeed(session.user.id);
      return new NextResponse(feed, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="comedy-shows.ics"',
        },
      });
    }

    const syncs = await listCalendarSyncs(session.user.id);
    return NextResponse.json({ syncs });
  } catch (err) {
    logger.error(
      "Calendar sync GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch calendar syncs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/calendar-sync
 *
 * Create or update a calendar sync.
 * Body: { provider: string, calendarId?: string, accessToken?: string, refreshToken?: string }
 *
 * Or trigger a sync with: { action: "sync", syncId: string }
 */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`calendar-sync:${getRateLimitKey(req)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Handle sync action
    if (body.action === "sync" && body.syncId) {
      const result = await syncToProvider(session.user.id, body.syncId);
      return NextResponse.json(result);
    }

    // Create/update a calendar sync
    const { provider, calendarId, accessToken, refreshToken } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 },
      );
    }

    const sync = await createCalendarSync(session.user.id, provider, {
      calendarId,
      accessToken,
      refreshToken,
    });

    return NextResponse.json(sync, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create calendar sync";
    const status = message.includes("Invalid provider") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/calendar-sync?id=<syncId>
 *
 * Delete a calendar sync.
 */
export async function DELETE(req: NextRequest) {
  const rl = await checkRateLimit(`calendar-sync:${getRateLimitKey(req)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const syncId = req.nextUrl.searchParams.get("id");
    if (!syncId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 },
      );
    }

    await deleteCalendarSync(session.user.id, syncId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete calendar sync";
    const status =
      message === "Calendar sync not found"
        ? 404
        : message === "Not your calendar sync"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
