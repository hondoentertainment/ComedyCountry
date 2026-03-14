import { prisma } from "./prisma";

/**
 * Phase 14: Smart Venue Operations & POS
 */

// ── Table Layouts ──────────────────────────────────────────────────────────────

export async function createTableLayout(
  venueId: string,
  data: {
    name: string;
    rows: number;
    columns: number;
    seats: Array<{ row: number; col: number; type: string; label?: string }>;
    isDefault?: boolean;
  }
) {
  // If this layout is set as default, clear any existing default
  if (data.isDefault) {
    await prisma.tableLayout.updateMany({
      where: { venueId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.tableLayout.create({
    data: {
      venueId,
      name: data.name,
      rows: data.rows,
      columns: data.columns,
      seats: data.seats,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function getTableLayouts(venueId: string) {
  return prisma.tableLayout.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
  });
}

// ── Drink Minimums ─────────────────────────────────────────────────────────────

export async function setDrinkMinimum(
  eventId: string,
  ticketType: string,
  config: {
    minimumCount?: number;
    minimumSpend?: number | null;
    enforceAt?: string;
  }
) {
  // Upsert: check if one already exists for this event+ticketType
  const existing = await prisma.drinkMinimum.findFirst({
    where: { eventId, ticketType },
  });

  if (existing) {
    return prisma.drinkMinimum.update({
      where: { id: existing.id },
      data: {
        minimumCount: config.minimumCount ?? existing.minimumCount,
        minimumSpend: config.minimumSpend !== undefined ? config.minimumSpend : existing.minimumSpend,
        enforceAt: config.enforceAt ?? existing.enforceAt,
      },
    });
  }

  return prisma.drinkMinimum.create({
    data: {
      eventId,
      ticketType,
      minimumCount: config.minimumCount ?? 2,
      minimumSpend: config.minimumSpend ?? null,
      enforceAt: config.enforceAt ?? "door",
    },
  });
}

export async function getDrinkMinimums(eventId: string) {
  return prisma.drinkMinimum.findMany({
    where: { eventId },
    orderBy: { ticketType: "asc" },
  });
}

// ── Walk-Up Sales ──────────────────────────────────────────────────────────────

export async function processWalkUpSale(
  eventId: string,
  data: {
    ticketType: string;
    quantity?: number;
    amount: number;
    paymentMethod: string;
    soldBy?: string;
    customerName?: string;
    customerEmail?: string;
  }
) {
  if (data.amount < 0) {
    throw new Error("Amount cannot be negative");
  }

  const validMethods = ["cash", "card", "comp"];
  if (!validMethods.includes(data.paymentMethod)) {
    throw new Error(`Invalid payment method: ${data.paymentMethod}`);
  }

  return prisma.walkUpSale.create({
    data: {
      eventId,
      ticketType: data.ticketType,
      quantity: data.quantity ?? 1,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      soldBy: data.soldBy ?? null,
      customerName: data.customerName ?? null,
      customerEmail: data.customerEmail ?? null,
    },
  });
}

export async function getWalkUpSales(eventId: string) {
  return prisma.walkUpSale.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}

// ── Comp List ──────────────────────────────────────────────────────────────────

export async function addToCompList(
  eventId: string,
  data: {
    guestName: string;
    guestEmail?: string;
    tickets?: number;
    reason?: string;
    approvedBy?: string;
  }
) {
  // Check for duplicate: same event + guest name + guest email
  if (data.guestEmail) {
    const existing = await prisma.compListEntry.findFirst({
      where: {
        eventId,
        guestEmail: data.guestEmail,
        status: { not: "denied" },
      },
    });
    if (existing) {
      throw new Error("Guest already on comp list for this event");
    }
  }

  return prisma.compListEntry.create({
    data: {
      eventId,
      guestName: data.guestName,
      guestEmail: data.guestEmail ?? null,
      tickets: data.tickets ?? 2,
      reason: data.reason ?? null,
      approvedBy: data.approvedBy ?? null,
      status: data.approvedBy ? "approved" : "pending",
    },
  });
}

export async function updateCompStatus(
  id: string,
  status: string,
  approvedBy?: string
) {
  const validStatuses = ["pending", "approved", "denied", "used"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const entry = await prisma.compListEntry.findUnique({ where: { id } });
  if (!entry) {
    throw new Error("Comp list entry not found");
  }

  // Validate status transitions
  const invalidTransitions: Record<string, string[]> = {
    used: ["pending", "approved", "denied"],
    denied: ["approved"],
  };

  if (invalidTransitions[entry.status]?.includes(status)) {
    throw new Error(
      `Cannot transition from ${entry.status} to ${status}`
    );
  }

  return prisma.compListEntry.update({
    where: { id },
    data: {
      status,
      approvedBy: approvedBy ?? entry.approvedBy,
      checkedIn: status === "used" ? true : entry.checkedIn,
    },
  });
}

export async function getCompList(eventId: string) {
  return prisma.compListEntry.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}

// ── Staff Schedule ─────────────────────────────────────────────────────────────

export async function createStaffShift(
  venueId: string,
  data: {
    staffName: string;
    role: string;
    startTime: Date;
    endTime: Date;
    userId?: string;
    eventId?: string;
    notes?: string;
  }
) {
  if (data.endTime <= data.startTime) {
    throw new Error("End time must be after start time");
  }

  const validRoles = ["door", "bar", "manager", "sound", "host"];
  if (!validRoles.includes(data.role)) {
    throw new Error(`Invalid role: ${data.role}`);
  }

  return prisma.staffShift.create({
    data: {
      venueId,
      staffName: data.staffName,
      role: data.role,
      startTime: data.startTime,
      endTime: data.endTime,
      userId: data.userId ?? null,
      eventId: data.eventId ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function getStaffSchedule(
  venueId: string,
  dateRange: { start: Date; end: Date }
) {
  return prisma.staffShift.findMany({
    where: {
      venueId,
      startTime: { gte: dateRange.start },
      endTime: { lte: dateRange.end },
    },
    orderBy: { startTime: "asc" },
  });
}

// ── POS Integration ────────────────────────────────────────────────────────────

export async function registerPOSIntegration(
  venueId: string,
  provider: string,
  config: {
    apiKey: string;
    locationId?: string;
    webhookUrl?: string;
  }
) {
  const validProviders = ["square", "toast", "clover"];
  if (!validProviders.includes(provider)) {
    throw new Error(`Invalid POS provider: ${provider}`);
  }

  return prisma.pOSIntegration.upsert({
    where: {
      venueId_provider: { venueId, provider },
    },
    update: {
      apiKey: config.apiKey,
      locationId: config.locationId ?? null,
      webhookUrl: config.webhookUrl ?? null,
      isActive: true,
    },
    create: {
      venueId,
      provider,
      apiKey: config.apiKey,
      locationId: config.locationId ?? null,
      webhookUrl: config.webhookUrl ?? null,
    },
  });
}

// ── Capacity Tracking ──────────────────────────────────────────────────────────

export async function logCapacity(
  venueId: string,
  eventId: string | null,
  count: number,
  source: string
) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { capacity: true },
  });

  if (!venue) {
    throw new Error("Venue not found");
  }

  const maxCapacity = venue.capacity ?? 0;

  if (maxCapacity > 0 && count > maxCapacity) {
    throw new Error("Capacity exceeded");
  }

  return prisma.venueCapacityLog.create({
    data: {
      venueId,
      eventId: eventId ?? null,
      currentCount: count,
      maxCapacity,
      source,
    },
  });
}

export async function getCapacityStatus(venueId: string, eventId?: string) {
  const latest = await prisma.venueCapacityLog.findFirst({
    where: {
      venueId,
      ...(eventId ? { eventId } : {}),
    },
    orderBy: { timestamp: "desc" },
  });

  if (!latest) {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { capacity: true },
    });
    return {
      currentCount: 0,
      maxCapacity: venue?.capacity ?? 0,
      percentFull: 0,
      lastUpdated: null,
    };
  }

  const percentFull =
    latest.maxCapacity > 0
      ? Math.round((latest.currentCount / latest.maxCapacity) * 100)
      : 0;

  return {
    currentCount: latest.currentCount,
    maxCapacity: latest.maxCapacity,
    percentFull,
    lastUpdated: latest.timestamp,
  };
}

// ── Menu Items ─────────────────────────────────────────────────────────────────

export async function createMenuItem(
  venueId: string,
  data: {
    category: string;
    name: string;
    description?: string;
    price: number;
    isAvailable?: boolean;
    sortOrder?: number;
    imageUrl?: string;
    allergens?: string;
  }
) {
  if (data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  return prisma.menuItem.create({
    data: {
      venueId,
      category: data.category,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
      imageUrl: data.imageUrl ?? null,
      allergens: data.allergens ?? null,
    },
  });
}

export async function getMenu(venueId: string) {
  const items = await prisma.menuItem.findMany({
    where: { venueId, isAvailable: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  // Group by category
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}

// ── Pre-Orders ─────────────────────────────────────────────────────────────────

export async function createPreOrder(
  eventId: string,
  data: {
    customerName: string;
    userId?: string;
    items: Array<{ menuItemId: string; quantity: number; specialInstructions?: string }>;
    totalAmount: number;
    pickupTime?: Date;
  }
) {
  if (data.items.length === 0) {
    throw new Error("Pre-order must contain at least one item");
  }

  if (data.totalAmount < 0) {
    throw new Error("Total amount cannot be negative");
  }

  return prisma.preOrder.create({
    data: {
      eventId,
      customerName: data.customerName,
      userId: data.userId ?? null,
      items: data.items,
      totalAmount: data.totalAmount,
      pickupTime: data.pickupTime ?? null,
    },
  });
}

export async function getPreOrders(eventId: string) {
  return prisma.preOrder.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}
