import { NextResponse } from "next/server";
import { createMenuItem, getMenu } from "@/lib/venue-ops";
import {
  createMenuCategory,
  getMenuCategories,
  updateMenuCategory,
  deleteMenuCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  createPreOrderWithValidation,
  updatePreOrderStatus,
  getPreOrdersByEvent,
  trackDrinkMinimumFulfillment,
  getDrinkMinimumStatus,
  getEventFulfillmentSummary,
} from "@/lib/menu-management";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`venue-ops-menu:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const action = searchParams.get("action");

    if (!venueId && action !== "pre-orders" && action !== "fulfillment-status" && action !== "fulfillment-summary") {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 }
      );
    }

    // Get full menu (backward compatible default)
    if (!action || action === "menu") {
      const menu = await getMenu(venueId!);
      return NextResponse.json(menu);
    }

    // Get categories with items
    if (action === "categories") {
      const categories = await getMenuCategories(venueId!);
      return NextResponse.json({ categories });
    }

    // Get items by category
    if (action === "items-by-category") {
      const categoryId = searchParams.get("categoryId");
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }
      const items = await getMenuItemsByCategory(venueId!, categoryId);
      return NextResponse.json({ items });
    }

    // Get pre-orders for an event
    if (action === "pre-orders") {
      const eventId = searchParams.get("eventId");
      if (!eventId) {
        return NextResponse.json(
          { error: "eventId is required" },
          { status: 400 }
        );
      }
      const status = searchParams.get("status") ?? undefined;
      const preOrders = await getPreOrdersByEvent(eventId, { status });
      return NextResponse.json({ preOrders });
    }

    // Get drink minimum fulfillment status
    if (action === "fulfillment-status") {
      const eventId = searchParams.get("eventId");
      const customerId = searchParams.get("customerId");
      if (!eventId || !customerId) {
        return NextResponse.json(
          { error: "eventId and customerId are required" },
          { status: 400 }
        );
      }
      const status = await getDrinkMinimumStatus(eventId, customerId);
      return NextResponse.json({ fulfillment: status });
    }

    // Get event fulfillment summary
    if (action === "fulfillment-summary") {
      const eventId = searchParams.get("eventId");
      if (!eventId) {
        return NextResponse.json(
          { error: "eventId is required" },
          { status: 400 }
        );
      }
      const summary = await getEventFulfillmentSummary(eventId);
      return NextResponse.json(summary);
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`venue-ops-menu:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action, venueId } = body;

    // Backward compatible: no action = create menu item (original behavior)
    if (!action || action === "create-item") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { action: _, venueId: __, ...data } = body;
      const item = await createMenuItem(venueId, data);
      return NextResponse.json(item, { status: 201 });
    }

    // Create a menu category
    if (action === "create-category") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { name, description, sortOrder, isActive } = body;
      const category = await createMenuCategory(venueId, {
        name,
        description,
        sortOrder,
        isActive,
      });
      return NextResponse.json(category, { status: 201 });
    }

    // Update a menu category
    if (action === "update-category") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { categoryId, name, description, sortOrder, isActive } = body;
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }
      const category = await updateMenuCategory(categoryId, venueId, {
        name,
        description,
        sortOrder,
        isActive,
      });
      return NextResponse.json(category);
    }

    // Delete a menu category
    if (action === "delete-category") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { categoryId } = body;
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }
      await deleteMenuCategory(categoryId, venueId);
      return NextResponse.json({ success: true });
    }

    // Add a menu item with category validation
    if (action === "add-item") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const {
        categoryId,
        name,
        description,
        price,
        isAvailable,
        sortOrder,
        imageUrl,
        allergens,
        tags,
        prepTimeMinutes,
        isPreOrderable,
      } = body;
      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }
      const item = await addMenuItem(venueId, {
        categoryId,
        name,
        description,
        price,
        isAvailable,
        sortOrder,
        imageUrl,
        allergens,
        tags,
        prepTimeMinutes,
        isPreOrderable,
      });
      return NextResponse.json(item, { status: 201 });
    }

    // Update a menu item
    if (action === "update-item") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { itemId, ...updateData } = body;
      if (!itemId) {
        return NextResponse.json(
          { error: "itemId is required" },
          { status: 400 }
        );
      }
      const { action: _a, venueId: _v, ...data } = updateData;
      const item = await updateMenuItem(itemId, venueId, data);
      return NextResponse.json(item);
    }

    // Delete a menu item
    if (action === "delete-item") {
      if (!venueId) {
        return NextResponse.json(
          { error: "venueId is required" },
          { status: 400 }
        );
      }
      const { itemId } = body;
      if (!itemId) {
        return NextResponse.json(
          { error: "itemId is required" },
          { status: 400 }
        );
      }
      await deleteMenuItem(itemId, venueId);
      return NextResponse.json({ success: true });
    }

    // Create a pre-order with validation
    if (action === "pre-order") {
      const { eventId, customerId, customerName, customerEmail, items, pickupTime } = body;
      if (!eventId || !customerId || !customerName) {
        return NextResponse.json(
          { error: "eventId, customerId, and customerName are required" },
          { status: 400 }
        );
      }
      const preOrder = await createPreOrderWithValidation({
        eventId,
        customerId,
        customerName,
        customerEmail,
        items: items ?? [],
        pickupTime: pickupTime ? new Date(pickupTime) : undefined,
      });
      return NextResponse.json(preOrder, { status: 201 });
    }

    // Update pre-order status
    if (action === "update-pre-order") {
      const { preOrderId, status, reason } = body;
      if (!preOrderId || !status) {
        return NextResponse.json(
          { error: "preOrderId and status are required" },
          { status: 400 }
        );
      }
      const preOrder = await updatePreOrderStatus(preOrderId, status, reason);
      return NextResponse.json(preOrder);
    }

    // Track drink minimum fulfillment
    if (action === "track-fulfillment") {
      const { eventId, customerId, purchaseAmount, purchaseCount } = body;
      if (!eventId || !customerId || purchaseAmount === undefined) {
        return NextResponse.json(
          { error: "eventId, customerId, and purchaseAmount are required" },
          { status: 400 }
        );
      }
      const fulfillment = await trackDrinkMinimumFulfillment(
        eventId,
        customerId,
        purchaseAmount,
        purchaseCount
      );
      return NextResponse.json(fulfillment);
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
