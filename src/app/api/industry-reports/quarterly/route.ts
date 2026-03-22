import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateQuarterlyReport,
  saveQuarterlyReport,
  getQuarterlyReports,
} from "@/lib/quarterly-reports";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`industry-reports-quarterly:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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

    const reports = await getQuarterlyReports({ city, state, year });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("GET /api/industry-reports/quarterly error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quarterly reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`industry-reports-quarterly:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { city, state, quarter, year } = body;

    if (!city || !state || !quarter || !year) {
      return NextResponse.json(
        { error: "city, state, quarter, and year are required" },
        { status: 400 }
      );
    }

    const quarterNum = parseInt(quarter, 10);
    if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      return NextResponse.json(
        { error: "quarter must be 1, 2, 3, or 4" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: "year must be between 2000 and 2100" },
        { status: 400 }
      );
    }

    const report = await generateQuarterlyReport({
      city,
      state,
      quarter: quarterNum as 1 | 2 | 3 | 4,
      year: yearNum,
    });

    const saved = await saveQuarterlyReport(report);

    return NextResponse.json(
      { report: { ...report, id: saved.id } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/industry-reports/quarterly error:", error);
    return NextResponse.json(
      { error: "Failed to generate quarterly report" },
      { status: 500 }
    );
  }
}
