import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createTableLayout,
  getTableLayouts,
  updateTableLayout,
  deleteTableLayout,
} from "@/lib/venue-ops";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-tables:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  try {
    const layouts = await getTableLayouts(venueId);
    return NextResponse.json(layouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch table layouts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-tables:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { venueId, name, rows, columns, seats, isDefault } = body;

    if (!venueId || !name || !rows || !columns) {
      return NextResponse.json(
        { error: "venueId, name, rows, and columns are required" },
        { status: 400 },
      );
    }

    const layout = await createTableLayout(venueId, {
      name,
      rows,
      columns,
      seats: seats ?? [],
      isDefault: isDefault ?? false,
    });

    return NextResponse.json(layout, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create table layout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-tables:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const layout = await updateTableLayout(id, data);
    return NextResponse.json(layout);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update table layout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const rl = await checkRateLimit(`venue-ops-tables:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const result = await deleteTableLayout(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete table layout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
