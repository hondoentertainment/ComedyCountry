import { prisma } from "./prisma";
import crypto from "crypto";

/**
 * Phase 5: Native Ticketing & Commerce — Business Logic
 */

/** List ticket types for an event with availability info */
export async function getTicketTypesForEvent(eventId: string) {
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });

  const now = new Date();

  return ticketTypes.map((tt) => ({
    ...tt,
    available: tt.capacity - tt.sold,
    onSale:
      (!tt.saleStart || tt.saleStart <= now) &&
      (!tt.saleEnd || tt.saleEnd >= now),
  }));
}

/** Purchase a ticket — checks capacity, creates ticket with QR code */
export async function purchaseTicket(
  userId: string,
  ticketTypeId: string,
  eventId: string
) {
  // Fetch ticket type and verify it belongs to the event
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    throw new Error("Ticket type not found");
  }

  if (ticketType.eventId !== eventId) {
    throw new Error("Ticket type does not belong to this event");
  }

  // Check sale window
  const now = new Date();
  if (ticketType.saleStart && ticketType.saleStart > now) {
    throw new Error("Tickets are not on sale yet");
  }
  if (ticketType.saleEnd && ticketType.saleEnd < now) {
    throw new Error("Ticket sales have ended");
  }

  // Check capacity
  if (ticketType.sold >= ticketType.capacity) {
    throw new Error("Sold out");
  }

  // Generate unique QR code
  const qrCode = crypto.randomUUID();

  // Create ticket and increment sold count in a transaction
  const ticket = await prisma.$transaction(async (tx) => {
    // Re-check capacity inside transaction to prevent race conditions
    const freshType = await tx.ticketType.findUnique({
      where: { id: ticketTypeId },
    });
    if (!freshType || freshType.sold >= freshType.capacity) {
      throw new Error("Sold out");
    }

    await tx.ticketType.update({
      where: { id: ticketTypeId },
      data: { sold: { increment: 1 } },
    });

    return tx.ticket.create({
      data: {
        eventId,
        userId,
        ticketTypeId,
        qrCode,
        purchasePrice: ticketType.price,
      },
      include: {
        event: {
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        },
        ticketType: true,
      },
    });
  });

  return ticket;
}

/** List all tickets for a user */
export async function getTicketsForUser(userId: string) {
  return prisma.ticket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });
}

/** Look up a ticket by QR code (for scanning) */
export async function getTicketByQR(qrCode: string) {
  return prisma.ticket.findUnique({
    where: { qrCode },
    include: {
      event: {
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });
}

/** Scan a ticket — mark as used */
export async function scanTicket(qrCode: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { qrCode },
    include: {
      event: {
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });

  if (!ticket) {
    return { valid: false, error: "Ticket not found" };
  }

  if (ticket.status === "USED") {
    return {
      valid: false,
      error: "Ticket already used",
      scannedAt: ticket.scannedAt,
      ticket,
    };
  }

  if (ticket.status !== "VALID") {
    return {
      valid: false,
      error: `Ticket status: ${ticket.status}`,
      ticket,
    };
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "USED", scannedAt: new Date() },
    include: {
      event: {
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });

  return { valid: true, ticket: updated };
}

/** Refund a ticket if within policy */
export async function refundTicket(ticketId: string, userId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: { refundPolicy: true },
      },
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new Error("Not your ticket");
  }

  if (ticket.status !== "VALID") {
    throw new Error("Ticket cannot be refunded");
  }

  // Check refund policy
  const policy = ticket.event.refundPolicy;
  if (!policy) {
    throw new Error("No refund policy for this event");
  }

  const now = new Date();
  if (now > policy.refundDeadline) {
    throw new Error("Refund deadline has passed");
  }

  // Process refund — mark ticket and decrement sold count
  const refunded = await prisma.$transaction(async (tx) => {
    await tx.ticketType.update({
      where: { id: ticket.ticketTypeId },
      data: { sold: { decrement: 1 } },
    });

    return tx.ticket.update({
      where: { id: ticketId },
      data: { status: "REFUNDED" },
      include: {
        event: {
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        },
        ticketType: true,
      },
    });
  });

  return {
    ticket: refunded,
    refundPercent: policy.refundPercent,
  };
}

/** Transfer a ticket to another user by email */
export async function transferTicket(
  ticketId: string,
  userId: string,
  recipientEmail: string,
  giftMessage?: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new Error("Not your ticket");
  }

  if (ticket.status !== "VALID") {
    throw new Error("Ticket cannot be transferred");
  }

  // Look up recipient — if they have an account, reassign
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
  });

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "TRANSFERRED",
      transferredTo: recipientEmail,
      giftMessage: giftMessage || null,
      // If recipient exists, create a new ticket for them
    },
    include: {
      event: {
        include: {
          venue: true,
          comedians: { include: { comedian: true } },
        },
      },
      ticketType: true,
    },
  });

  // If the recipient has an account, create a new valid ticket for them
  if (recipient) {
    const newQr = crypto.randomUUID();
    await prisma.ticket.create({
      data: {
        eventId: ticket.eventId,
        userId: recipient.id,
        ticketTypeId: ticket.ticketTypeId,
        qrCode: newQr,
        purchasePrice: ticket.purchasePrice,
        giftMessage: giftMessage || null,
      },
    });
  }

  return updated;
}
