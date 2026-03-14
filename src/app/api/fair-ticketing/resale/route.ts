import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestResale, getResaleListings } from "@/lib/fair-ticketing";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const listings = await getResaleListings(eventId);
    return NextResponse.json(listings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get listings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ticketId?: string; maxPrice?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketId, maxPrice } = body;
  if (!ticketId || maxPrice === undefined) {
    return NextResponse.json(
      { error: "ticketId and maxPrice are required" },
      { status: 400 }
    );
  }

  try {
    const listing = await requestResale(ticketId, session.user.id, maxPrice);
    return NextResponse.json(listing, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to request resale";
    const status =
      message === "Ticket not found"
        ? 404
        : message === "Not your ticket"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
