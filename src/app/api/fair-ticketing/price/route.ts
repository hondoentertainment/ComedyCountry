import { NextResponse } from "next/server";
import { getFeeBreakdown, calculateTransparentPrice } from "@/lib/fair-ticketing";

export async function GET(request: Request) {
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
