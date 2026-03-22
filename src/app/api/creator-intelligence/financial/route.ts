import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getFinancialSummary, generateFinancialSummary } from "@/lib/creator-intelligence";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-financial:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? undefined;

    const data = await getFinancialSummary(comedian.id, period);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch financial summary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-financial:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { period } = body;

    if (!period || typeof period !== "string") {
      return NextResponse.json({ error: "period is required" }, { status: 400 });
    }

    const summary = await generateFinancialSummary(comedian.id, period);
    return NextResponse.json(summary, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
