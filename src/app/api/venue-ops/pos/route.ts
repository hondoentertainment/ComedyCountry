import { NextResponse } from "next/server";
import {
  registerPOSConnection,
  getPOSConnections,
  deactivatePOSConnection,
  syncTransactions,
  getTransactions,
  reconcileSales,
  syncMenuItemToPOS,
  getPOSMenuItems,
} from "@/lib/pos-integration";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`venue-ops-pos:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const provider = searchParams.get("provider");
    const action = searchParams.get("action");

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    // List connections
    if (!action || action === "connections") {
      const connections = await getPOSConnections(venueId);
      return NextResponse.json({ connections });
    }

    // Get transactions
    if (action === "transactions") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required for transactions" },
          { status: 400 },
        );
      }

      const startDate = searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined;
      const endDate = searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined;
      const status = searchParams.get("status") ?? undefined;
      const take = parseInt(searchParams.get("take") ?? "50", 10);
      const skip = parseInt(searchParams.get("skip") ?? "0", 10);

      const transactions = await getTransactions(venueId, provider, {
        startDate,
        endDate,
        status,
        take,
        skip,
      });
      return NextResponse.json({ transactions });
    }

    // Get POS menu items
    if (action === "menu-items") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required for menu items" },
          { status: 400 },
        );
      }

      const items = await getPOSMenuItems(venueId, provider);
      return NextResponse.json({ items });
    }

    // Reconcile sales
    if (action === "reconcile") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required for reconciliation" },
          { status: 400 },
        );
      }

      const eventId = searchParams.get("eventId");
      if (!eventId) {
        return NextResponse.json(
          { error: "eventId is required for reconciliation" },
          { status: 400 },
        );
      }

      const result = await reconcileSales(venueId, provider, eventId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    logger.error(
      "GET /api/venue-ops/pos error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`venue-ops-pos:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action, venueId, provider } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    // Register a POS connection
    if (action === "register" || !action) {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required" },
          { status: 400 },
        );
      }

      const { apiKey, locationId, merchantId, webhookUrl, environment } = body;

      if (!apiKey) {
        return NextResponse.json(
          { error: "apiKey is required" },
          { status: 400 },
        );
      }

      const connection = await registerPOSConnection(venueId, provider, {
        apiKey,
        locationId,
        merchantId,
        webhookUrl,
        environment,
      });
      return NextResponse.json(connection, { status: 201 });
    }

    // Deactivate a POS connection
    if (action === "deactivate") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required" },
          { status: 400 },
        );
      }

      const connection = await deactivatePOSConnection(venueId, provider);
      return NextResponse.json(connection);
    }

    // Sync transactions
    if (action === "sync") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required" },
          { status: 400 },
        );
      }

      const { transactions } = body;
      if (!transactions || !Array.isArray(transactions)) {
        return NextResponse.json(
          { error: "transactions array is required" },
          { status: 400 },
        );
      }

      // Parse timestamp strings to Dates
      const parsed = transactions.map(
        (tx: {
          externalId: string;
          amount: number;
          status: string;
          timestamp: string;
          currency?: string;
          itemName?: string;
          quantity?: number;
          paymentMethod?: string;
          metadata?: Record<string, unknown>;
        }) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
        }),
      );

      const result = await syncTransactions(venueId, provider, parsed);
      return NextResponse.json(result, { status: 201 });
    }

    // Sync a menu item to POS
    if (action === "sync-menu-item") {
      if (!provider) {
        return NextResponse.json(
          { error: "provider is required" },
          { status: 400 },
        );
      }

      const { menuItemId } = body;
      if (!menuItemId) {
        return NextResponse.json(
          { error: "menuItemId is required" },
          { status: 400 },
        );
      }

      const result = await syncMenuItemToPOS(venueId, provider, menuItemId);
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    logger.error(
      "POST /api/venue-ops/pos error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
