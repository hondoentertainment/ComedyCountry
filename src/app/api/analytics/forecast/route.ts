import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateRevenueForecast,
  getRevenueForecast,
} from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-forecast:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  try {
    const forecast = await getRevenueForecast(eventId);
    if (!forecast) {
      return NextResponse.json(
        { error: "No forecast found" },
        { status: 404 }
      );
    }
    return NextResponse.json(forecast);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get forecast" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-forecast:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const forecast = await generateRevenueForecast(eventId);
    return NextResponse.json(forecast, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate forecast";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
