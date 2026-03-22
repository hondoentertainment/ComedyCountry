import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createFairPricePolicy, getFairPricePolicy } from "@/lib/fair-ticketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`fair-ticketing-policy:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const policy = await getFairPricePolicy(eventId);
    if (!policy) {
      return NextResponse.json({ error: "No policy found" }, { status: 404 });
    }
    return NextResponse.json(policy);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`fair-ticketing-policy:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    eventId?: string;
    showAllFees?: boolean;
    maxMarkupPercent?: number;
    allowResale?: boolean;
    resaleMaxPercent?: number;
    antiScalpingEnabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, ...config } = body;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const policy = await createFairPricePolicy(eventId, config);
    return NextResponse.json(policy, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create policy";
    const status = message === "Event not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
