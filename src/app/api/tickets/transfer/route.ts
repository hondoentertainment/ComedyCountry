import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await checkRateLimit(`tickets-transfer:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ticketId?: string; toEmail?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketId, toEmail, message } = body;

  if (!ticketId) {
    return NextResponse.json(
      { error: "ticketId is required" },
      { status: 400 }
    );
  }

  if (!toEmail) {
    return NextResponse.json(
      { error: "toEmail is required" },
      { status: 400 }
    );
  }

  // Validate the user owns the ticket
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Ticket not found or not owned by you" },
      { status: 404 }
    );
  }

  if (ticket.status !== "VALID") {
    return NextResponse.json(
      { error: "Ticket is not eligible for transfer" },
      { status: 400 }
    );
  }

  // Check if recipient has an account
  const recipient = await prisma.user.findUnique({
    where: { email: toEmail },
  });

  // Create transfer with 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const transfer = await prisma.ticketTransfer.create({
    data: {
      ticketId,
      fromUserId: session.user.id,
      toEmail,
      toUserId: recipient?.id ?? null,
      message: message || null,
      expiresAt,
    },
    include: {
      ticket: {
        include: {
          event: {
            include: {
              venue: true,
            },
          },
          ticketType: true,
        },
      },
    },
  });

  return NextResponse.json(transfer, { status: 201 });
}

export async function GET(request: Request) {
  const rl = await checkRateLimit(`tickets-transfer:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [sent, received] = await Promise.all([
    prisma.ticketTransfer.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        ticket: {
          include: {
            event: { include: { venue: true } },
            ticketType: true,
          },
        },
      },
    }),
    prisma.ticketTransfer.findMany({
      where: {
        OR: [
          { toUserId: userId },
          { toEmail: session.user.email ?? "" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        ticket: {
          include: {
            event: { include: { venue: true } },
            ticketType: true,
          },
        },
        fromUser: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
  ]);

  return NextResponse.json({ sent, received });
}
