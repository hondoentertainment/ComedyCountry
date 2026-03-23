import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateEventNotifications } from "@/lib/notifications";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const rl = await checkRateLimit(`admin-events:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
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
            { title: { contains: search, mode: "insensitive" as const } },
            { venue: { name: { contains: search, mode: "insensitive" as const } } },
            { comedians: { some: { comedian: { name: { contains: search, mode: "insensitive" as const } } } } },
          ],
        }
      : {};

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        take,
        skip,
        orderBy: { date: "desc" },
        include: {
          venue: { select: { id: true, name: true, city: true, state: true } },
          comedians: { include: { comedian: { select: { id: true, name: true } } } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, pages: Math.ceil(total / take) });
  } catch (err) {
    logger.requestError(request, "Failed to list events", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit(`admin-events:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, date, showtime, ticketUrl, priceMin, priceMax, showType, title, comedianIds } = body;

    if (!venueId || !date) {
      return NextResponse.json({ error: "Venue and date are required" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        venueId,
        date: new Date(date),
        showtime: showtime || null,
        ticketUrl: ticketUrl || null,
        priceMin: priceMin ? parseFloat(priceMin) : null,
        priceMax: priceMax ? parseFloat(priceMax) : null,
        showType: showType || "HEADLINE",
        title: title || null,
        ...(comedianIds?.length > 0 && {
          comedians: {
            create: comedianIds.map((cId: string, i: number) => ({
              comedianId: cId,
              role: i === 0 ? "headline" : "feature",
            })),
          },
        }),
      },
      include: {
        venue: true,
        comedians: { include: { comedian: true } },
      },
    });

    // Generate notifications for followers (fire-and-forget)
    generateEventNotifications(event).catch(() => {});

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    logger.requestError(request, "Failed to create event", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
