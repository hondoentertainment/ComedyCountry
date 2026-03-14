import { prisma } from "./prisma";

/**
 * Podcast-to-Live Pipeline
 *
 * Connects podcast audiences to live shows — tracks which episodes drive
 * ticket sales and manages live recording sessions.
 *
 * Includes RSS feed sync for automatic episode discovery.
 */

// ---------------------------------------------------------------------------
// RSS Feed Parser
// ---------------------------------------------------------------------------

interface RSSEpisode {
  title: string;
  description: string;
  audioUrl: string;
  publishedAt: Date;
  durationSeconds: number;
  guid: string;
}

/**
 * Parse an RSS XML feed into structured episode data.
 * Handles standard podcast RSS (iTunes) feeds.
 */
function parseRSSFeed(xml: string): RSSEpisode[] {
  const episodes: RSSEpisode[] = [];

  // Extract <item> blocks
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    const title = extractTag(itemXml, "title") ?? "Untitled Episode";
    const description =
      extractTag(itemXml, "description") ??
      extractTag(itemXml, "itunes:summary") ??
      "";
    const guid = extractTag(itemXml, "guid") ?? title;
    const pubDate = extractTag(itemXml, "pubDate");
    const publishedAt = pubDate ? new Date(pubDate) : new Date();

    // Audio URL from <enclosure>
    const enclosureMatch = itemXml.match(
      /<enclosure[^>]+url\s*=\s*"([^"]+)"[^>]*>/i
    );
    const audioUrl = enclosureMatch?.[1] ?? "";

    // Duration from <itunes:duration> (can be HH:MM:SS, MM:SS, or seconds)
    const durationStr = extractTag(itemXml, "itunes:duration") ?? "0";
    const durationSeconds = parseDuration(durationStr);

    if (audioUrl) {
      episodes.push({
        title: stripCDATA(title),
        description: stripCDATA(description).slice(0, 2000),
        audioUrl,
        publishedAt,
        durationSeconds,
        guid,
      });
    }
  }

  return episodes;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}

function parseDuration(str: string): number {
  // Pure seconds
  if (/^\d+$/.test(str)) return parseInt(str, 10);

  // HH:MM:SS or MM:SS
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

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
// Episode Sync — Real RSS Feed Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch and sync episodes from the podcast's RSS feed.
 * - Fetches the feed URL
 * - Parses episodes from XML
 * - Deduplicates against existing episodes (by audio URL)
 * - Creates new episodes in the database
 * - Updates podcast sync status
 */
export async function syncPodcastEpisodes(podcastId: string): Promise<{
  podcast: string;
  newEpisodes: number;
  totalEpisodes: number;
  errors: string[];
}> {
  const podcast = await prisma.podcastShow.findUnique({
    where: { id: podcastId },
  });

  if (!podcast) {
    throw new Error("Podcast not found");
  }

  const errors: string[] = [];
  let newEpisodeCount = 0;

  try {
    // Fetch the RSS feed
    const response = await fetch(podcast.feedUrl, {
      headers: {
        "User-Agent": "ComedyCountry-PodcastSync/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Feed returned ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const parsedEpisodes = parseRSSFeed(xml);

    if (parsedEpisodes.length === 0) {
      errors.push("No episodes found in feed — may be an invalid RSS format");
    }

    // Get existing episode audio URLs for deduplication
    const existingEpisodes = await prisma.podcastEpisode.findMany({
      where: { podcastId },
      select: { audioUrl: true },
    });
    const existingUrls = new Set(existingEpisodes.map((e) => e.audioUrl));

    // Insert new episodes
    for (const ep of parsedEpisodes) {
      if (existingUrls.has(ep.audioUrl)) continue;

      try {
        await prisma.podcastEpisode.create({
          data: {
            podcastId,
            title: ep.title,
            description: ep.description,
            audioUrl: ep.audioUrl,
            publishedAt: ep.publishedAt,
            durationSeconds: ep.durationSeconds,
          },
        });
        newEpisodeCount++;
      } catch (err) {
        errors.push(
          `Failed to create episode "${ep.title}": ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // Extract subscriber/listener count from feed metadata if available
    const subscriberMatch = xml.match(
      /<itunes:new-feed-url>|<podcast:locked[^>]*>/i
    );
    const channelTitle = extractTag(xml, "title");

    // Update podcast sync status
    const latestEpisode = await prisma.podcastEpisode.findFirst({
      where: { podcastId },
      orderBy: { publishedAt: "desc" },
    });

    await prisma.podcastShow.update({
      where: { id: podcastId },
      data: {
        synced: true,
        lastEpisodeAt: latestEpisode?.publishedAt ?? null,
        ...(channelTitle && channelTitle !== podcast.title
          ? { title: stripCDATA(channelTitle) }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    errors.push(`Feed fetch failed: ${message}`);

    // Still mark as synced attempt even on failure
    await prisma.podcastShow.update({
      where: { id: podcastId },
      data: { synced: false },
    });
  }

  const totalEpisodes = await prisma.podcastEpisode.count({
    where: { podcastId },
  });

  return {
    podcast: podcast.title,
    newEpisodes: newEpisodeCount,
    totalEpisodes,
    errors,
  };
}

/**
 * Sync all podcasts for a comedian.
 */
export async function syncAllPodcastsForComedian(comedianId: string) {
  const podcasts = await prisma.podcastShow.findMany({
    where: { comedianId },
  });

  const results = [];
  for (const podcast of podcasts) {
    const result = await syncPodcastEpisodes(podcast.id);
    results.push(result);
  }

  return {
    podcastsSynced: results.length,
    totalNewEpisodes: results.reduce((s, r) => s + r.newEpisodes, 0),
    results,
  };
}

/**
 * Auto-detect guest comedians mentioned in episode descriptions
 * and link them to comedian records in the database.
 */
export async function detectGuestComedians(episodeId: string) {
  const episode = await prisma.podcastEpisode.findUnique({
    where: { id: episodeId },
  });

  if (!episode || !episode.description) return [];

  // Get all comedian names for matching
  const comedians = await prisma.comedian.findMany({
    select: { id: true, name: true },
  });

  const detectedGuests: Array<{ comedianId: string; comedianName: string }> = [];
  const descLower = episode.description.toLowerCase();

  for (const comedian of comedians) {
    // Match full name (case-insensitive, word boundary)
    if (comedian.name.length >= 4 && descLower.includes(comedian.name.toLowerCase())) {
      detectedGuests.push({
        comedianId: comedian.id,
        comedianName: comedian.name,
      });
    }
  }

  // Update episode with detected guest IDs
  if (detectedGuests.length > 0) {
    const guestIds = detectedGuests.map((g) => g.comedianId);
    await prisma.podcastEpisode.update({
      where: { id: episodeId },
      data: { guestComedianIds: guestIds },
    });
  }

  return detectedGuests;
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
