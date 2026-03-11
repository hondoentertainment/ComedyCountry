import { prisma } from "@/lib/prisma";

/**
 * Phase 7 – Creator Economy helpers
 */

// ---------------------------------------------------------------------------
// Comedian ↔ User ownership
// ---------------------------------------------------------------------------

export async function getComedianForUser(userId: string) {
  const claim = await prisma.comedianClaim.findFirst({
    where: { userId, status: "APPROVED" },
  });
  if (!claim) return null;
  return prisma.comedian.findUnique({ where: { id: claim.comedianId } });
}

// ---------------------------------------------------------------------------
// Exclusive Content
// ---------------------------------------------------------------------------

export async function getExclusiveContent(
  comedianId: string,
  userId?: string | null,
  limit = 20,
) {
  const items = await prisma.exclusiveContent.findMany({
    where: { comedianId },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  // If the viewer is the comedian owner, show everything.
  if (userId) {
    const owns = await prisma.comedianClaim.findFirst({
      where: { userId, comedianId, status: "APPROVED" },
    });
    if (owns) return items;
  }

  // Otherwise strip body / media from gated items
  return items.map((item) => {
    if (!item.isGated) return item;
    return {
      ...item,
      body: null,
      mediaUrl: null,
      embedUrl: null,
    };
  });
}

export async function createExclusiveContent(
  comedianId: string,
  data: {
    title: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: string;
    embedUrl?: string;
    isGated?: boolean;
  },
) {
  return prisma.exclusiveContent.create({
    data: {
      comedianId,
      title: data.title,
      body: data.body ?? null,
      mediaUrl: data.mediaUrl ?? null,
      mediaType: data.mediaType ?? null,
      embedUrl: data.embedUrl ?? null,
      isGated: data.isGated ?? false,
    },
  });
}

// ---------------------------------------------------------------------------
// Fan Tips
// ---------------------------------------------------------------------------

export async function getFanTipLeaderboard(comedianId: string, limit = 10) {
  const tips = await prisma.fanTip.findMany({
    where: { comedianId },
    orderBy: { amount: "desc" },
    take: limit,
  });
  return tips;
}

export async function createFanTip(
  comedianId: string,
  userId: string,
  amount: number,
  giftType?: string,
  message?: string,
) {
  return prisma.fanTip.create({
    data: {
      comedianId,
      userId,
      amount,
      giftType: giftType ?? null,
      message: message ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Booking Requests
// ---------------------------------------------------------------------------

export async function getBookingRequests(
  comedianId: string,
  status?: string,
) {
  return prisma.bookingRequest.findMany({
    where: {
      comedianId,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function respondToBooking(
  requestId: string,
  status: "ACCEPTED" | "DECLINED" | "NEGOTIATING",
  responseNote?: string,
) {
  return prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      status,
      responseNote: responseNote ?? null,
      respondedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Setlist Tracker
// ---------------------------------------------------------------------------

export async function getSetlist(comedianId: string, limit = 50) {
  return prisma.setlistEntry.findMany({
    where: { comedianId },
    orderBy: { performedAt: "desc" },
    take: limit,
  });
}

export async function addSetlistEntry(
  comedianId: string,
  data: {
    bitName: string;
    eventId?: string;
    durationMin?: number;
    notes?: string;
    crowdRating?: number;
  },
) {
  return prisma.setlistEntry.create({
    data: {
      comedianId,
      bitName: data.bitName,
      eventId: data.eventId ?? null,
      durationMin: data.durationMin ?? null,
      notes: data.notes ?? null,
      crowdRating: data.crowdRating ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Revenue Stats
// ---------------------------------------------------------------------------

export async function getRevenueStats(comedianId: string) {
  const [tipAgg, tipCount, merchCount, bookingCount] = await Promise.all([
    prisma.fanTip.aggregate({
      where: { comedianId },
      _sum: { amount: true },
    }),
    prisma.fanTip.count({ where: { comedianId } }),
    prisma.merchItem.count({ where: { comedianId } }),
    prisma.bookingRequest.count({
      where: { comedianId, status: "CONFIRMED" },
    }),
  ]);

  // Ticket revenue from events this comedian performed at
  let ticketRevenue = 0;
  let ticketsSold = 0;
  try {
    const events = await prisma.event.findMany({
      where: { comedians: { some: { comedianId } } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length > 0) {
      const ticketAgg = await prisma.ticket.aggregate({
        where: { eventId: { in: eventIds }, status: "VALID" },
        _sum: { purchasePrice: true },
        _count: true,
      });
      ticketRevenue = Number(ticketAgg._sum.purchasePrice ?? 0);
      ticketsSold = ticketAgg._count;
    }
  } catch {
    // Ticket table may not exist yet
  }

  return {
    totalTips: Number(tipAgg._sum.amount ?? 0),
    tipCount,
    ticketRevenue,
    ticketsSold,
    merchItemCount: merchCount,
    confirmedBookings: bookingCount,
  };
}
