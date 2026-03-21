import { prisma } from "./prisma";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface MenuCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  sortOrder?: number;
  imageUrl?: string;
  allergens?: string[];
  tags?: string[];
  prepTimeMinutes?: number;
  isPreOrderable?: boolean;
}

export interface PreOrderInput {
  eventId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
  pickupTime?: Date;
}

export interface DrinkMinimumFulfillment {
  customerId: string;
  eventId: string;
  currentSpend: number;
  currentCount: number;
  minimumSpend: number | null;
  minimumCount: number;
  isFulfilled: boolean;
  remainingSpend: number;
  remainingCount: number;
}

/* ─── Menu Category Management ───────────────────────────────────────────── */

export async function createMenuCategory(
  venueId: string,
  data: MenuCategoryInput
) {
  if (!data.name || data.name.trim() === "") {
    throw new Error("Category name is required");
  }

  // Check for duplicate category name at this venue
  const existing = await prisma.menuCategory.findFirst({
    where: {
      venueId,
      name: { equals: data.name, mode: "insensitive" },
    },
  });

  if (existing) {
    throw new Error(`Category "${data.name}" already exists for this venue`);
  }

  return prisma.menuCategory.create({
    data: {
      venueId,
      name: data.name.trim(),
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function getMenuCategories(venueId: string) {
  return prisma.menuCategory.findMany({
    where: { venueId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function updateMenuCategory(
  id: string,
  venueId: string,
  data: Partial<MenuCategoryInput>
) {
  const category = await prisma.menuCategory.findUnique({ where: { id } });

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.venueId !== venueId) {
    throw new Error("Category does not belong to this venue");
  }

  return prisma.menuCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteMenuCategory(id: string, venueId: string) {
  const category = await prisma.menuCategory.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.venueId !== venueId) {
    throw new Error("Category does not belong to this venue");
  }

  if (category._count.items > 0) {
    throw new Error("Cannot delete category with existing items. Remove items first.");
  }

  return prisma.menuCategory.delete({ where: { id } });
}

/* ─── Menu Item Management ───────────────────────────────────────────────── */

export async function addMenuItem(venueId: string, data: MenuItemInput) {
  if (!data.name || data.name.trim() === "") {
    throw new Error("Item name is required");
  }

  if (data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  // Verify category belongs to venue
  const category = await prisma.menuCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.venueId !== venueId) {
    throw new Error("Category does not belong to this venue");
  }

  return prisma.menuItem.create({
    data: {
      venueId,
      category: category.name,
      name: data.name.trim(),
      description: data.description ?? null,
      price: data.price,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
      imageUrl: data.imageUrl ?? null,
      allergens: data.allergens ? data.allergens.join(", ") : null,
      tags: data.tags ?? [],
      prepTimeMinutes: data.prepTimeMinutes ?? null,
      isPreOrderable: data.isPreOrderable ?? false,
      categoryId: data.categoryId,
    },
  });
}

export async function updateMenuItem(
  id: string,
  venueId: string,
  data: Partial<MenuItemInput>
) {
  const item = await prisma.menuItem.findUnique({ where: { id } });

  if (!item) {
    throw new Error("Menu item not found");
  }

  if (item.venueId !== venueId) {
    throw new Error("Menu item does not belong to this venue");
  }

  if (data.price !== undefined && data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  return prisma.menuItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.allergens !== undefined && {
        allergens: data.allergens.join(", "),
      }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.prepTimeMinutes !== undefined && {
        prepTimeMinutes: data.prepTimeMinutes,
      }),
      ...(data.isPreOrderable !== undefined && {
        isPreOrderable: data.isPreOrderable,
      }),
    },
  });
}

export async function deleteMenuItem(id: string, venueId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } });

  if (!item) {
    throw new Error("Menu item not found");
  }

  if (item.venueId !== venueId) {
    throw new Error("Menu item does not belong to this venue");
  }

  return prisma.menuItem.delete({ where: { id } });
}

export async function getMenuItemsByCategory(
  venueId: string,
  categoryId: string
) {
  return prisma.menuItem.findMany({
    where: { venueId, category: categoryId, isAvailable: true },
    orderBy: { sortOrder: "asc" },
  });
}

/* ─── Pre-Order Management ───────────────────────────────────────────────── */

export async function createPreOrderWithValidation(data: PreOrderInput) {
  if (data.items.length === 0) {
    throw new Error("Pre-order must contain at least one item");
  }

  // Validate all items exist and are pre-orderable
  const menuItemIds = data.items.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
  });

  if (menuItems.length !== menuItemIds.length) {
    const foundIds = new Set(menuItems.map((mi) => mi.id));
    const missing = menuItemIds.filter((id) => !foundIds.has(id));
    throw new Error(`Menu items not found: ${missing.join(", ")}`);
  }

  const nonPreOrderable = menuItems.filter((mi) => !mi.isPreOrderable);
  if (nonPreOrderable.length > 0) {
    throw new Error(
      `Items not available for pre-order: ${nonPreOrderable.map((mi) => mi.name).join(", ")}`
    );
  }

  // Calculate total amount from actual menu item prices
  let totalAmount = 0;
  for (const orderItem of data.items) {
    const menuItem = menuItems.find((mi) => mi.id === orderItem.menuItemId);
    if (menuItem) {
      totalAmount += menuItem.price * orderItem.quantity;
    }
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  return prisma.preOrder.create({
    data: {
      eventId: data.eventId,
      customerName: data.customerName,
      userId: data.customerId,
      items: data.items,
      totalAmount,
      pickupTime: data.pickupTime ?? null,
      status: "pending",
    },
  });
}

export async function updatePreOrderStatus(
  id: string,
  status: string,
  reason?: string
) {
  const validStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "picked_up",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const preOrder = await prisma.preOrder.findUnique({ where: { id } });

  if (!preOrder) {
    throw new Error("Pre-order not found");
  }

  // Validate status transitions
  const allowedTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["picked_up"],
    picked_up: [],
    cancelled: [],
  };

  const currentStatus = (preOrder as Record<string, unknown>).status as string;
  if (!allowedTransitions[currentStatus]?.includes(status)) {
    throw new Error(
      `Cannot transition from ${currentStatus} to ${status}`
    );
  }

  return prisma.preOrder.update({
    where: { id },
    data: {
      status,
      ...(reason && { cancellationReason: reason }),
      ...(status === "picked_up" && { pickedUpAt: new Date() }),
    },
  });
}

export async function getPreOrdersByEvent(
  eventId: string,
  options: { status?: string } = {}
) {
  const where: Record<string, unknown> = { eventId };
  if (options.status) where.status = options.status;

  return prisma.preOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Drink Minimum Fulfillment Tracking ─────────────────────────────────── */

export async function trackDrinkMinimumFulfillment(
  eventId: string,
  customerId: string,
  purchaseAmount: number,
  purchaseCount: number = 1
): Promise<DrinkMinimumFulfillment> {
  // Get the drink minimum for this event
  const drinkMinimum = await prisma.drinkMinimum.findFirst({
    where: { eventId },
  });

  if (!drinkMinimum) {
    throw new Error("No drink minimum set for this event");
  }

  // Get or create the fulfillment tracking record
  const existing = await prisma.drinkMinimumFulfillment.findFirst({
    where: { eventId, customerId },
  });

  const currentSpend = (existing?.currentSpend ?? 0) + purchaseAmount;
  const currentCount = (existing?.currentCount ?? 0) + purchaseCount;

  const minimumSpend = drinkMinimum.minimumSpend ? Number(drinkMinimum.minimumSpend) : null;
  const minimumCount = drinkMinimum.minimumCount;

  const spendFulfilled = minimumSpend === null || currentSpend >= minimumSpend;
  const countFulfilled = currentCount >= minimumCount;
  const isFulfilled = spendFulfilled && countFulfilled;

  const remainingSpend =
    minimumSpend !== null ? Math.max(0, minimumSpend - currentSpend) : 0;
  const remainingCount = Math.max(0, minimumCount - currentCount);

  if (existing) {
    await prisma.drinkMinimumFulfillment.update({
      where: { id: existing.id },
      data: {
        currentSpend,
        currentCount,
        isFulfilled,
      },
    });
  } else {
    await prisma.drinkMinimumFulfillment.create({
      data: {
        eventId,
        customerId,
        currentSpend,
        currentCount,
        isFulfilled,
      },
    });
  }

  return {
    customerId,
    eventId,
    currentSpend: Math.round(currentSpend * 100) / 100,
    currentCount,
    minimumSpend,
    minimumCount,
    isFulfilled,
    remainingSpend: Math.round(remainingSpend * 100) / 100,
    remainingCount,
  };
}

export async function getDrinkMinimumStatus(
  eventId: string,
  customerId: string
): Promise<DrinkMinimumFulfillment | null> {
  const drinkMinimum = await prisma.drinkMinimum.findFirst({
    where: { eventId },
  });

  if (!drinkMinimum) {
    return null;
  }

  const fulfillment = await prisma.drinkMinimumFulfillment.findFirst({
    where: { eventId, customerId },
  });

  const currentSpend = fulfillment?.currentSpend ?? 0;
  const currentCount = fulfillment?.currentCount ?? 0;
  const minimumSpend = drinkMinimum.minimumSpend ? Number(drinkMinimum.minimumSpend) : null;
  const minimumCount = drinkMinimum.minimumCount;

  const spendFulfilled = minimumSpend === null || currentSpend >= minimumSpend;
  const countFulfilled = currentCount >= minimumCount;

  return {
    customerId,
    eventId,
    currentSpend,
    currentCount,
    minimumSpend,
    minimumCount,
    isFulfilled: spendFulfilled && countFulfilled,
    remainingSpend:
      minimumSpend !== null
        ? Math.round(Math.max(0, minimumSpend - currentSpend) * 100) / 100
        : 0,
    remainingCount: Math.max(0, minimumCount - currentCount),
  };
}

export async function getEventFulfillmentSummary(eventId: string) {
  const fulfillments = await prisma.drinkMinimumFulfillment.findMany({
    where: { eventId },
  });

  const total = fulfillments.length;
  const fulfilled = fulfillments.filter((f: { isFulfilled: boolean }) => f.isFulfilled).length;
  const unfulfilled = total - fulfilled;
  const totalSpend = fulfillments.reduce(
    (sum: number, f: { currentSpend: number }) => sum + f.currentSpend,
    0
  );

  return {
    total,
    fulfilled,
    unfulfilled,
    fulfillmentRate: total > 0 ? Math.round((fulfilled / total) * 100) / 100 : 0,
    totalSpend: Math.round(totalSpend * 100) / 100,
  };
}
