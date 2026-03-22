import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIndustryMetrics } from "@/lib/marketplace";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`industry-reports:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : undefined;

    const where: Record<string, unknown> = {};
    if (city) where.city = { equals: city, mode: "insensitive" };
    if (state) where.state = { equals: state, mode: "insensitive" };
    if (year) where.year = year;

    const reports = await prisma.industryReport.findMany({
      where,
      orderBy: [{ year: "desc" }, { quarter: "desc" }],
      take: 50,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("GET /api/industry-reports error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`industry-reports:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { city, state, quarter, year } = body;

    if (!city || !state || !quarter || !year) {
      return NextResponse.json(
        { error: "city, state, quarter, and year are required" },
        { status: 400 }
      );
    }

    const metrics = await generateIndustryMetrics(city, state);

    const report = await prisma.industryReport.upsert({
      where: { city_state_quarter: { city, state, quarter } },
      update: {
        year,
        metrics: JSON.stringify(metrics),
        publishedAt: new Date(),
      },
      create: {
        city,
        state,
        quarter,
        year,
        metrics: JSON.stringify(metrics),
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("POST /api/industry-reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
