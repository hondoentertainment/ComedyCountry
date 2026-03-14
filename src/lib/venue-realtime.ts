import { prisma } from "./prisma";

/**
 * Real-Time Venue Dashboard — Server-Sent Events (SSE) powered live dashboard.
 *
 * Provides real-time data for:
 * - Live capacity tracking
 * - Ticket sales velocity
 * - Walk-up sales
 * - Check-in progress
 * - Revenue accumulation
 *
 * Uses SSE (Server-Sent Events) since Next.js doesn't natively support WebSockets.
 * For WebSocket support, a separate server or upgrade would be needed.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface VenueDashboardSnapshot {
  timestamp: string;
  eventId: string;
  capacity: {
    current: number;
    max: number;
    percentFull: number;
  };
  tickets: {
    totalSold: number;
    totalCapacity: number;
    percentSold: number;
    recentSales: number; // last 30 min
    salesVelocity: number; // tickets per hour
  };
  walkUps: {
    total: number;
    totalRevenue: number;
    cash: number;
    card: number;
    comp: number;
  };
  checkIns: {
    checkedIn: number;
    totalTickets: number;
    percentCheckedIn: number;
  };
  revenue: {
    ticketRevenue: number;
    walkUpRevenue: number;
    preOrderRevenue: number;
    totalRevenue: number;
  };
  waitlist: {
    waiting: number;
    offered: number;
    claimed: number;
  };
  staff: Array<{
    name: string;
    role: string;
    status: "on-shift" | "off-shift";
  }>;
}

// ── Snapshot builder ─────────────────────────────────────────────────────────

export async function buildVenueDashboardSnapshot(
  venueId: string,
  eventId: string
): Promise<VenueDashboardSnapshot> {
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const [
    venue,
    event,
    capacityLog,
    tickets,
    recentTickets,
    walkUpSales,
    scannedTickets,
    preOrders,
    waitlistStats,
    activeStaff,
  ] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: venueId },
      select: { capacity: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    }),
    prisma.venueCapacityLog.findFirst({
      where: { venueId, eventId },
      orderBy: { timestamp: "desc" },
    }),
    prisma.ticket.findMany({
      where: { eventId, status: { in: ["VALID", "USED"] } },
      select: { purchasePrice: true, createdAt: true, scannedAt: true },
    }),
    prisma.ticket.count({
      where: {
        eventId,
        status: { in: ["VALID", "USED"] },
        createdAt: { gte: thirtyMinAgo },
      },
    }),
    prisma.walkUpSale.findMany({
      where: { eventId },
      select: { amount: true, paymentMethod: true, quantity: true },
    }),
    prisma.ticket.count({
      where: { eventId, scannedAt: { not: null } },
    }),
    prisma.preOrder.findMany({
      where: { eventId },
      select: { totalAmount: true },
    }),
    Promise.all([
      prisma.ticketWaitlistQueue.count({ where: { eventId, status: "WAITING" } }),
      prisma.ticketWaitlistQueue.count({ where: { eventId, status: "OFFERED" } }),
      prisma.ticketWaitlistQueue.count({ where: { eventId, status: "CLAIMED" } }),
    ]),
    prisma.staffShift.findMany({
      where: {
        venueId,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      select: { staffName: true, role: true, startTime: true, endTime: true },
    }),
  ]);

  if (!event) {
    throw new Error("Event not found");
  }

  const maxCapacity = venue?.capacity ?? 0;
  const currentCount = capacityLog?.currentCount ?? 0;

  // Ticket stats
  const totalSold = tickets.length;
  const ticketRevenue = tickets.reduce(
    (s, t) => s + (t.purchasePrice ? Number(t.purchasePrice) : 0),
    0
  );

  // Get ticket type capacity for this event
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    select: { capacity: true },
  });
  const totalTicketCapacity = ticketTypes.reduce((s, t) => s + t.capacity, 0);

  // Sales velocity (tickets per hour based on last 30 min)
  const salesVelocity = recentTickets * 2; // extrapolate to hourly

  // Walk-up stats
  const walkUpTotal = walkUpSales.reduce((s, w) => s + w.quantity, 0);
  const walkUpRevenue = walkUpSales.reduce((s, w) => s + w.amount, 0);
  const walkUpCash = walkUpSales
    .filter((w) => w.paymentMethod === "cash")
    .reduce((s, w) => s + w.quantity, 0);
  const walkUpCard = walkUpSales
    .filter((w) => w.paymentMethod === "card")
    .reduce((s, w) => s + w.quantity, 0);
  const walkUpComp = walkUpSales
    .filter((w) => w.paymentMethod === "comp")
    .reduce((s, w) => s + w.quantity, 0);

  // Pre-order revenue
  const preOrderRevenue = preOrders.reduce((s, p) => s + p.totalAmount, 0);

  return {
    timestamp: now.toISOString(),
    eventId,
    capacity: {
      current: currentCount,
      max: maxCapacity,
      percentFull: maxCapacity > 0 ? Math.round((currentCount / maxCapacity) * 100) : 0,
    },
    tickets: {
      totalSold,
      totalCapacity: totalTicketCapacity,
      percentSold:
        totalTicketCapacity > 0
          ? Math.round((totalSold / totalTicketCapacity) * 100)
          : 0,
      recentSales: recentTickets,
      salesVelocity,
    },
    walkUps: {
      total: walkUpTotal,
      totalRevenue: walkUpRevenue,
      cash: walkUpCash,
      card: walkUpCard,
      comp: walkUpComp,
    },
    checkIns: {
      checkedIn: scannedTickets,
      totalTickets: totalSold,
      percentCheckedIn:
        totalSold > 0 ? Math.round((scannedTickets / totalSold) * 100) : 0,
    },
    revenue: {
      ticketRevenue: Math.round(ticketRevenue * 100) / 100,
      walkUpRevenue: Math.round(walkUpRevenue * 100) / 100,
      preOrderRevenue: Math.round(preOrderRevenue * 100) / 100,
      totalRevenue:
        Math.round((ticketRevenue + walkUpRevenue + preOrderRevenue) * 100) / 100,
    },
    waitlist: {
      waiting: waitlistStats[0],
      offered: waitlistStats[1],
      claimed: waitlistStats[2],
    },
    staff: activeStaff.map((s) => ({
      name: s.staffName,
      role: s.role,
      status: "on-shift" as const,
    })),
  };
}

// ── SSE stream helper ────────────────────────────────────────────────────────

export function createDashboardStream(
  venueId: string,
  eventId: string,
  intervalMs = 5000
): ReadableStream {
  let timer: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      async function sendSnapshot() {
        try {
          const snapshot = await buildVenueDashboardSnapshot(venueId, eventId);
          const data = `data: ${JSON.stringify(snapshot)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
        }
      }

      // Send initial snapshot immediately
      sendSnapshot();

      // Then send updates at the specified interval
      timer = setInterval(sendSnapshot, intervalMs);
    },
    cancel() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  });
}
