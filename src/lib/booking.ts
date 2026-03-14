import { prisma } from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Booking Request System — Complete venue-to-comedian booking pipeline.
 * Handles the full lifecycle: request → negotiate → confirm → cancel.
 */

// ── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "NEGOTIATING" | "CONFIRMED" | "CANCELLED";

export interface CreateBookingInput {
  venueId: string;
  comedianId: string;
  requesterId: string;
  date: Date;
  showType?: string;
  budget?: number;
  message?: string;
}

export interface BookingResponse {
  id: string;
  venueId: string;
  comedianId: string;
  requesterId: string;
  date: Date;
  showType: string | null;
  budget: Decimal | null;
  message: string | null;
  status: BookingStatus;
  responseNote: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Create booking request ───────────────────────────────────────────────────

export async function createBookingRequest(
  input: CreateBookingInput
): Promise<BookingResponse> {
  // Verify comedian exists
  const comedian = await prisma.comedian.findUnique({
    where: { id: input.comedianId },
  });
  if (!comedian) {
    throw new Error("Comedian not found");
  }

  // Check for duplicate pending requests (same venue + comedian + date)
  const existing = await prisma.bookingRequest.findFirst({
    where: {
      venueId: input.venueId,
      comedianId: input.comedianId,
      date: input.date,
      status: { in: ["PENDING", "NEGOTIATING", "ACCEPTED"] },
    },
  });
  if (existing) {
    throw new Error("A booking request already exists for this comedian on this date");
  }

  // Check comedian availability — ensure no confirmed booking on same date
  const startOfDay = new Date(input.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(input.date);
  endOfDay.setHours(23, 59, 59, 999);

  const conflicting = await prisma.bookingRequest.findFirst({
    where: {
      comedianId: input.comedianId,
      date: { gte: startOfDay, lte: endOfDay },
      status: "CONFIRMED",
    },
  });
  if (conflicting) {
    throw new Error("Comedian already has a confirmed booking on this date");
  }

  const booking = await prisma.bookingRequest.create({
    data: {
      venueId: input.venueId,
      comedianId: input.comedianId,
      requesterId: input.requesterId,
      date: input.date,
      showType: input.showType ?? null,
      budget: input.budget ? new Decimal(input.budget.toFixed(2)) : null,
      message: input.message ?? null,
      status: "PENDING",
    },
  });

  return booking as BookingResponse;
}

// ── Get booking requests ─────────────────────────────────────────────────────

export async function getBookingRequestsForComedian(
  comedianId: string,
  status?: BookingStatus
) {
  const where: Record<string, unknown> = { comedianId };
  if (status) where.status = status;

  return prisma.bookingRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      comedian: {
        select: { id: true, name: true, slug: true, headshotUrl: true },
      },
    },
  });
}

export async function getBookingRequestsForVenue(
  venueId: string,
  status?: BookingStatus
) {
  const where: Record<string, unknown> = { venueId };
  if (status) where.status = status;

  return prisma.bookingRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      comedian: {
        select: { id: true, name: true, slug: true, headshotUrl: true },
      },
    },
  });
}

export async function getBookingRequest(id: string) {
  return prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      comedian: {
        select: { id: true, name: true, slug: true, headshotUrl: true },
      },
    },
  });
}

// ── Status transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["ACCEPTED", "DECLINED", "NEGOTIATING", "CANCELLED"],
  NEGOTIATING: ["ACCEPTED", "DECLINED", "CANCELLED"],
  ACCEPTED: ["CONFIRMED", "CANCELLED"],
  DECLINED: [],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

export async function respondToBooking(
  id: string,
  newStatus: BookingStatus,
  responseNote?: string
) {
  const booking = await prisma.bookingRequest.findUnique({ where: { id } });
  if (!booking) {
    throw new Error("Booking request not found");
  }

  const currentStatus = booking.status as BookingStatus;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(", ") || "none"}`
    );
  }

  // If confirming, check for date conflicts one more time
  if (newStatus === "CONFIRMED") {
    const startOfDay = new Date(booking.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(booking.date);
    endOfDay.setHours(23, 59, 59, 999);

    const conflict = await prisma.bookingRequest.findFirst({
      where: {
        comedianId: booking.comedianId,
        date: { gte: startOfDay, lte: endOfDay },
        status: "CONFIRMED",
        id: { not: id },
      },
    });
    if (conflict) {
      throw new Error("Comedian already has a confirmed booking on this date");
    }
  }

  return prisma.bookingRequest.update({
    where: { id },
    data: {
      status: newStatus,
      responseNote: responseNote ?? booking.responseNote,
      respondedAt: new Date(),
    },
  });
}

// ── Negotiate (update budget/message) ────────────────────────────────────────

export async function negotiateBooking(
  id: string,
  updates: { budget?: number; message?: string; responseNote?: string }
) {
  const booking = await prisma.bookingRequest.findUnique({ where: { id } });
  if (!booking) {
    throw new Error("Booking request not found");
  }

  if (!["PENDING", "NEGOTIATING"].includes(booking.status)) {
    throw new Error("Booking is not in a negotiable state");
  }

  return prisma.bookingRequest.update({
    where: { id },
    data: {
      status: "NEGOTIATING",
      budget: updates.budget ? new Decimal(updates.budget.toFixed(2)) : booking.budget,
      message: updates.message ?? booking.message,
      responseNote: updates.responseNote ?? booking.responseNote,
      respondedAt: new Date(),
    },
  });
}

// ── Comedian availability ────────────────────────────────────────────────────

export async function getComedianAvailability(
  comedianId: string,
  month: number,
  year: number
): Promise<
  Array<{ date: string; status: "available" | "booked" | "pending" }>
> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const bookings = await prisma.bookingRequest.findMany({
    where: {
      comedianId,
      date: { gte: startDate, lte: endDate },
      status: { in: ["CONFIRMED", "ACCEPTED", "PENDING", "NEGOTIATING"] },
    },
    select: { date: true, status: true },
  });

  // Also check events
  const events = await prisma.event.findMany({
    where: {
      comedians: { some: { comedianId } },
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true },
  });

  const dateMap = new Map<string, "available" | "booked" | "pending">();

  // Mark booked dates from confirmed bookings and events
  for (const b of bookings) {
    const key = b.date.toISOString().split("T")[0];
    if (b.status === "CONFIRMED") {
      dateMap.set(key, "booked");
    } else if (!dateMap.has(key)) {
      dateMap.set(key, "pending");
    }
  }

  for (const e of events) {
    const key = e.date.toISOString().split("T")[0];
    dateMap.set(key, "booked");
  }

  // Build calendar
  const calendar: Array<{ date: string; status: "available" | "booked" | "pending" }> = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendar.push({
      date: dateStr,
      status: dateMap.get(dateStr) ?? "available",
    });
  }

  return calendar;
}

// ── Booking stats ────────────────────────────────────────────────────────────

export async function getBookingStats(comedianId: string) {
  const [total, pending, confirmed, declined, cancelled] = await Promise.all([
    prisma.bookingRequest.count({ where: { comedianId } }),
    prisma.bookingRequest.count({ where: { comedianId, status: "PENDING" } }),
    prisma.bookingRequest.count({ where: { comedianId, status: "CONFIRMED" } }),
    prisma.bookingRequest.count({ where: { comedianId, status: "DECLINED" } }),
    prisma.bookingRequest.count({ where: { comedianId, status: "CANCELLED" } }),
  ]);

  return {
    total,
    pending,
    confirmed,
    declined,
    cancelled,
    acceptanceRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
  };
}
