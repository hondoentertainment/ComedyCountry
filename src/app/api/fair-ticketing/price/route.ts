import { NextResponse } from "next/server";
import { getFeeBreakdown, calculateTransparentPrice } from "@/lib/fair-ticketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`fair-ticketing-price:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const ticketTypeId = searchParams.get("ticketTypeId");
  const eventId = searchParams.get("eventId");

  if (!ticketTypeId || !eventId) {
    return NextResponse.json(
      { error: "ticketTypeId and eventId are required" },
      { status: 400 }
    );
  }

  try {
    const breakdown = await getFeeBreakdown(ticketTypeId, eventId);
    return NextResponse.json(breakdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get price";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`fair-ticketing-price:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: { ticketTypeId?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketTypeId, eventId } = body;
  if (!ticketTypeId || !eventId) {
    return NextResponse.json(
      { error: "ticketTypeId and eventId are required" },
      { status: 400 }
    );
  }

  try {
    const price = await calculateTransparentPrice(ticketTypeId, eventId);
    return NextResponse.json(price);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate price";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
