import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { purchaseTicket } from "@/lib/tickets";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await checkRateLimit(`tickets-purchase:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string; ticketTypeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, ticketTypeId } = body;
  if (!eventId || !ticketTypeId) {
    return NextResponse.json(
      { error: "eventId and ticketTypeId are required" },
      { status: 400 }
    );
  }

  try {
    const ticket = await purchaseTicket(session.user.id, ticketTypeId, eventId);
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    const status = message === "Sold out" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
