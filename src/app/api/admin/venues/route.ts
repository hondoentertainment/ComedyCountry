import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const rl = await checkRateLimit(`admin-venues:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const take = 50;
    const skip = (page - 1) * take;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { state: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        take,
        skip,
        orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
        include: { _count: { select: { events: true } } },
      }),
      prisma.venue.count({ where }),
    ]);

    return NextResponse.json({ venues, total, page, pages: Math.ceil(total / take) });
  } catch (err) {
    logger.requestError(request, "Failed to list venues", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit(`admin-venues:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, city, state, latitude, longitude, capacity, website, type } = body;

    if (!name || !city || !state) {
      return NextResponse.json({ error: "Name, city, and state are required" }, { status: 400 });
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        address: address || null,
        city,
        state,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        website: website || null,
        type: type || "CLUB",
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (err) {
    logger.requestError(request, "Failed to create venue", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
