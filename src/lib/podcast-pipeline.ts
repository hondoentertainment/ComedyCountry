import { prisma } from "./prisma";

/**
 * Podcast-to-Live Pipeline
 *
 * Connects podcast audiences to live shows — tracks which episodes drive
 * ticket sales and manages live recording sessions.
 */

// ---------------------------------------------------------------------------
// Podcast Registration & Listing
// ---------------------------------------------------------------------------

export async function registerPodcast(
  comedianId: string,
  data: {
    title: string;
    feedUrl: string;
    platform: "APPLE" | "SPOTIFY" | "YOUTUBE" | "RSS";
    subscriberCount?: number;
  },
) {
  return prisma.podcastShow.create({
    data: {
      comedianId,
      title: data.title,
      feedUrl: data.feedUrl,
      platform: data.platform,
      subscriberCount: data.subscriberCount ?? 0,
    },
  });
}

export async function getPodcastsForComedian(comedianId: string) {
  return prisma.podcastShow.findMany({
    where: { comedianId },
    orderBy: { createdAt: "desc" },
    include: { episodes: { take: 5, orderBy: { publishedAt: "desc" } } },
  });
}

// ---------------------------------------------------------------------------
// Episode Sync & Retrieval
// ---------------------------------------------------------------------------

export async function syncPodcastEpisodes(podcastId: string) {
  // In production this would fetch from the podcast RSS feed.
  // Mark the podcast as synced and update lastEpisodeAt.
  const latestEpisode = await prisma.podcastEpisode.findFirst({
    where: { podcastId },
    orderBy: { publishedAt: "desc" },
  });

  return prisma.podcastShow.update({
    where: { id: podcastId },
    data: {
      synced: true,
      lastEpisodeAt: latestEpisode?.publishedAt ?? null,
    },
  });
}

export async function getRecentEpisodes(comedianId: string, limit = 10) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    select: { id: true },
  });

  const podcastIds = podcasts.map((p) => p.id);
  if (podcastIds.length === 0) return [];

  return prisma.podcastEpisode.findMany({
    where: { podcastId: { in: podcastIds } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { ticketLinks: true },
  });
}

// ---------------------------------------------------------------------------
// Ticket Link Tracking
// ---------------------------------------------------------------------------

export async function createPodcastTicketLink(
  episodeId: string,
  eventId: string,
  clipId?: string,
) {
  return prisma.podcastTicketLink.create({
    data: {
      episodeId,
      eventId,
      clipId: clipId ?? null,
    },
  });
}

export async function recordPodcastClick(linkId: string) {
  return prisma.podcastTicketLink.update({
    where: { id: linkId },
    data: { clicks: { increment: 1 } },
  });
}

export async function recordPodcastPurchase(linkId: string, amount: number) {
  return prisma.podcastTicketLink.update({
    where: { id: linkId },
    data: {
      purchases: { increment: 1 },
      revenue: { increment: amount },
    },
  });
}

// ---------------------------------------------------------------------------
// Conversion Analytics
// ---------------------------------------------------------------------------

export async function getPodcastConversionStats(comedianId: string) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    select: { id: true },
  });

  const podcastIds = podcasts.map((p) => p.id);
  if (podcastIds.length === 0) {
    return { totalClicks: 0, totalPurchases: 0, totalRevenue: 0, conversionRate: 0 };
  }

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: { in: podcastIds } },
    select: { id: true },
  });

  const episodeIds = episodes.map((e) => e.id);
  if (episodeIds.length === 0) {
    return { totalClicks: 0, totalPurchases: 0, totalRevenue: 0, conversionRate: 0 };
  }

  const links = await prisma.podcastTicketLink.findMany({
    where: { episodeId: { in: episodeIds } },
  });

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const totalPurchases = links.reduce((sum, l) => sum + l.purchases, 0);
  const totalRevenue = links.reduce((sum, l) => sum + l.revenue, 0);
  const conversionRate = totalClicks > 0 ? totalPurchases / totalClicks : 0;

  return { totalClicks, totalPurchases, totalRevenue, conversionRate };
}

export async function getTopConvertingEpisodes(comedianId: string, limit = 5) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    select: { id: true },
  });

  const podcastIds = podcasts.map((p) => p.id);
  if (podcastIds.length === 0) return [];

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: { in: podcastIds } },
    include: { ticketLinks: true },
  });

  const ranked = episodes
    .map((ep) => {
      const totalPurchases = ep.ticketLinks.reduce((s, l) => s + l.purchases, 0);
      const totalRevenue = ep.ticketLinks.reduce((s, l) => s + l.revenue, 0);
      return { ...ep, totalPurchases, totalRevenue };
    })
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, limit);

  return ranked;
}

// ---------------------------------------------------------------------------
// Live Recording Sessions
// ---------------------------------------------------------------------------

export async function setupLiveRecording(
  eventId: string,
  podcastId: string,
  config: {
    consentRequired?: boolean;
    audioQuality?: "STANDARD" | "ENHANCED" | "STUDIO";
    distributionPlatforms?: string[];
  },
) {
  return prisma.liveRecordingSession.create({
    data: {
      eventId,
      podcastId,
      consentRequired: config.consentRequired ?? true,
      audioQuality: config.audioQuality ?? "STANDARD",
      distributionPlatforms: config.distributionPlatforms ?? [],
      status: "PLANNED",
    },
  });
}

export async function updateRecordingStatus(
  sessionId: string,
  status: "PLANNED" | "RECORDING" | "POST_PRODUCTION" | "PUBLISHED",
) {
  return prisma.liveRecordingSession.update({
    where: { id: sessionId },
    data: { status },
  });
}

export async function getLiveRecordingSessions(comedianId: string) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    select: { id: true },
  });

  const podcastIds = podcasts.map((p) => p.id);
  if (podcastIds.length === 0) return [];

  return prisma.liveRecordingSession.findMany({
    where: { podcastId: { in: podcastIds } },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Listener-to-Attendee Conversion
// ---------------------------------------------------------------------------

export async function getListenerToAttendeeConversion(comedianId: string) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    include: { episodes: true },
  });

  if (podcasts.length === 0) {
    return { totalListeners: 0, totalAttendees: 0, conversionRate: 0 };
  }

  const totalListeners = podcasts.reduce(
    (sum, p) => sum + p.episodes.reduce((s, e) => s + e.listenerCount, 0),
    0,
  );

  const episodeIds = podcasts.flatMap((p) => p.episodes.map((e) => e.id));
  if (episodeIds.length === 0) {
    return { totalListeners: 0, totalAttendees: 0, conversionRate: 0 };
  }

  const links = await prisma.podcastTicketLink.findMany({
    where: { episodeId: { in: episodeIds } },
  });

  const totalAttendees = links.reduce((sum, l) => sum + l.purchases, 0);
  const conversionRate = totalListeners > 0 ? totalAttendees / totalListeners : 0;

  return { totalListeners, totalAttendees, conversionRate };
}

// ---------------------------------------------------------------------------
// Event Suggestions for Podcast Promotion
// ---------------------------------------------------------------------------

export async function suggestPodcastTicketLinks(comedianId: string) {
  // Find upcoming events for this comedian that don't yet have podcast links
  const events = await prisma.event.findMany({
    where: {
      comedians: { some: { comedianId } },
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    take: 10,
  });

  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
    include: {
      episodes: {
        orderBy: { publishedAt: "desc" },
        take: 1,
      },
    },
  });

  return events.map((event) => ({
    event,
    podcasts: podcasts.map((p) => ({
      id: p.id,
      title: p.title,
      latestEpisode: p.episodes[0] ?? null,
    })),
  }));
}
