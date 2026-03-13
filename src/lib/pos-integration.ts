import { prisma } from "./prisma";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export const POS_PROVIDERS = ["square", "toast", "clover"] as const;
export type POSProvider = (typeof POS_PROVIDERS)[number];

export interface POSConnectionConfig {
  apiKey: string;
  locationId?: string;
  merchantId?: string;
  webhookUrl?: string;
  environment?: "sandbox" | "production";
}

export interface POSTransaction {
  externalId: string;
  amount: number;
  currency?: string;
  status: string;
  itemName?: string;
  quantity?: number;
  timestamp: Date;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
}

export interface ReconciliationResult {
  matched: number;
  unmatched: number;
  discrepancies: Array<{
    externalId: string;
    posAmount: number;
    localAmount: number;
    difference: number;
  }>;
  totalPOS: number;
  totalLocal: number;
  reconciled: boolean;
}

/* ─── Register a POS connection ──────────────────────────────────────────── */

export async function registerPOSConnection(
  venueId: string,
  provider: string,
  config: POSConnectionConfig
) {
  if (!POS_PROVIDERS.includes(provider as POSProvider)) {
    throw new Error(`Unsupported POS provider: ${provider}. Supported: ${POS_PROVIDERS.join(", ")}`);
  }

  if (!config.apiKey || config.apiKey.trim() === "") {
    throw new Error("API key is required for POS connection");
  }

  return prisma.pOSIntegration.upsert({
    where: {
      venueId_provider: { venueId, provider },
    },
    update: {
      apiKey: config.apiKey,
      locationId: config.locationId ?? null,
      merchantId: config.merchantId ?? null,
      webhookUrl: config.webhookUrl ?? null,
      environment: config.environment ?? "production",
      isActive: true,
      lastSyncAt: null,
    },
    create: {
      venueId,
      provider,
      apiKey: config.apiKey,
      locationId: config.locationId ?? null,
      merchantId: config.merchantId ?? null,
      webhookUrl: config.webhookUrl ?? null,
      environment: config.environment ?? "production",
      isActive: true,
    },
  });
}

/* ─── Get POS connections for a venue ────────────────────────────────────── */

export async function getPOSConnections(venueId: string) {
  return prisma.pOSIntegration.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Deactivate a POS connection ────────────────────────────────────────── */

export async function deactivatePOSConnection(
  venueId: string,
  provider: string
) {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  return prisma.pOSIntegration.update({
    where: { venueId_provider: { venueId, provider } },
    data: { isActive: false },
  });
}

/* ─── Sync transactions from POS system ──────────────────────────────────── */

export async function syncTransactions(
  venueId: string,
  provider: string,
  transactions: POSTransaction[]
) {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  if (!connection.isActive) {
    throw new Error("POS connection is not active");
  }

  const results = [];

  for (const tx of transactions) {
    if (tx.amount < 0) {
      throw new Error(`Transaction amount cannot be negative: ${tx.externalId}`);
    }

    const record = await prisma.pOSTransaction.upsert({
      where: {
        integrationId_externalId: {
          integrationId: connection.id,
          externalId: tx.externalId,
        },
      },
      update: {
        amount: tx.amount,
        currency: tx.currency ?? "USD",
        status: tx.status,
        itemName: tx.itemName ?? null,
        quantity: tx.quantity ?? 1,
        timestamp: tx.timestamp,
        paymentMethod: tx.paymentMethod ?? null,
        metadata: tx.metadata ? JSON.stringify(tx.metadata) : null,
      },
      create: {
        integrationId: connection.id,
        externalId: tx.externalId,
        amount: tx.amount,
        currency: tx.currency ?? "USD",
        status: tx.status,
        itemName: tx.itemName ?? null,
        quantity: tx.quantity ?? 1,
        timestamp: tx.timestamp,
        paymentMethod: tx.paymentMethod ?? null,
        metadata: tx.metadata ? JSON.stringify(tx.metadata) : null,
      },
    });
    results.push(record);
  }

  // Update last sync timestamp
  await prisma.pOSIntegration.update({
    where: { venueId_provider: { venueId, provider } },
    data: { lastSyncAt: new Date() },
  });

  return { synced: results.length, transactions: results };
}

/* ─── Get synced transactions ────────────────────────────────────────────── */

export async function getTransactions(
  venueId: string,
  provider: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    take?: number;
    skip?: number;
  } = {}
) {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  const where: Record<string, unknown> = { integrationId: connection.id };

  if (options.startDate || options.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (options.startDate) dateFilter.gte = options.startDate;
    if (options.endDate) dateFilter.lte = options.endDate;
    where.timestamp = dateFilter;
  }

  if (options.status) {
    where.status = options.status;
  }

  return prisma.pOSTransaction.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: options.take ?? 50,
    skip: options.skip ?? 0,
  });
}

/* ─── Reconcile POS sales with local walk-up sales ───────────────────────── */

export async function reconcileSales(
  venueId: string,
  provider: string,
  eventId: string
): Promise<ReconciliationResult> {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  // Get POS transactions for the event timeframe
  const posTransactions = await prisma.pOSTransaction.findMany({
    where: {
      integrationId: connection.id,
      status: "completed",
    },
    orderBy: { timestamp: "asc" },
  });

  // Get local walk-up sales for the same event
  const localSales = await prisma.walkUpSale.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  // Build lookup of POS transactions by external ID
  const posMap = new Map(posTransactions.map((tx) => [tx.externalId, tx]));
  const matchedExternalIds = new Set<string>();
  const discrepancies: ReconciliationResult["discrepancies"] = [];

  // Try to match local sales to POS transactions by amount
  let matchedCount = 0;
  for (const sale of localSales) {
    // Look for a POS transaction with matching amount that hasn't been matched
    const match = posTransactions.find(
      (tx) =>
        !matchedExternalIds.has(tx.externalId) &&
        Math.abs(tx.amount - sale.amount) < 0.01
    );

    if (match) {
      matchedExternalIds.add(match.externalId);
      matchedCount++;
    }
  }

  // Find unmatched POS transactions (potential discrepancies)
  for (const [externalId, tx] of posMap) {
    if (!matchedExternalIds.has(externalId)) {
      discrepancies.push({
        externalId,
        posAmount: tx.amount,
        localAmount: 0,
        difference: tx.amount,
      });
    }
  }

  const totalPOS = posTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalLocal = localSales.reduce((sum, s) => sum + s.amount, 0);

  return {
    matched: matchedCount,
    unmatched: posTransactions.length - matchedCount,
    discrepancies,
    totalPOS: Math.round(totalPOS * 100) / 100,
    totalLocal: Math.round(totalLocal * 100) / 100,
    reconciled: Math.abs(totalPOS - totalLocal) < 0.01,
  };
}

/* ─── Manage POS menu items (sync menu to POS) ───────────────────────────── */

export async function syncMenuItemToPOS(
  venueId: string,
  provider: string,
  menuItemId: string
) {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  if (!connection.isActive) {
    throw new Error("POS connection is not active");
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem) {
    throw new Error("Menu item not found");
  }

  if (menuItem.venueId !== venueId) {
    throw new Error("Menu item does not belong to this venue");
  }

  // Create or update the POS menu item mapping
  return prisma.pOSMenuItem.upsert({
    where: {
      integrationId_menuItemId: {
        integrationId: connection.id,
        menuItemId,
      },
    },
    update: {
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      isActive: menuItem.isAvailable,
      lastSyncAt: new Date(),
    },
    create: {
      integrationId: connection.id,
      menuItemId,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      isActive: menuItem.isAvailable,
      lastSyncAt: new Date(),
    },
  });
}

/* ─── Get POS-synced menu items ──────────────────────────────────────────── */

export async function getPOSMenuItems(venueId: string, provider: string) {
  const connection = await prisma.pOSIntegration.findUnique({
    where: { venueId_provider: { venueId, provider } },
  });

  if (!connection) {
    throw new Error("POS connection not found");
  }

  return prisma.pOSMenuItem.findMany({
    where: { integrationId: connection.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
