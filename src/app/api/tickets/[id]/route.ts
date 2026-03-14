import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refundTicket, transferTicket } from "@/lib/tickets";

// GET: Get single ticket details
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
            refundPolicy: true,
          },
        },
        ticketType: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json(
      { error: "Failed to load ticket" },
      { status: 500 }
    );
  }
}

// POST: Actions on ticket (refund, transfer)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    action?: string;
    recipientEmail?: string;
    giftMessage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (action === "refund") {
    try {
      const result = await refundTicket(id, session.user.id);
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refund failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === "transfer") {
    const { recipientEmail, giftMessage } = body;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "recipientEmail is required" },
        { status: 400 }
      );
    }

    try {
      const ticket = await transferTicket(
        id,
        session.user.id,
        recipientEmail,
        giftMessage
      );
      return NextResponse.json(ticket);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'refund' or 'transfer'" },
    { status: 400 }
  );
}
