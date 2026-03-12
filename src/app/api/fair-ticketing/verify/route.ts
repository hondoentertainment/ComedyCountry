import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyTicketHolder, checkTicketVerification } from "@/lib/fair-ticketing";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ticketId?: string;
    method?: "EMAIL" | "PHONE" | "ID_SCAN";
    data?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketId, method, data } = body;
  if (!ticketId || !method) {
    return NextResponse.json(
      { error: "ticketId and method are required" },
      { status: 400 }
    );
  }

  const validMethods = ["EMAIL", "PHONE", "ID_SCAN"];
  if (!validMethods.includes(method)) {
    return NextResponse.json(
      { error: "Invalid verification method" },
      { status: 400 }
    );
  }

  try {
    const verification = await verifyTicketHolder(ticketId, method, data || {});
    return NextResponse.json(verification, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    const status = message === "Ticket not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  try {
    const result = await checkTicketVerification(ticketId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
