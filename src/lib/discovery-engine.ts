import { prisma } from "./prisma";
import {
  addWeightedAttributes,
  emptyAttributeScores,
  getAttributeLabel,
  getTopKeys,
  normalizeAttributeScores,
} from "./comedy-genome";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SignalType =
  | "VIEW"
  | "CLICK"
  | "ATTEND"
  | "FOLLOW"
  | "CLIP_WATCH"
  | "SHARE"
  | "REVIEW"
  | "CHECKIN"
  | "PURCHASE";

export type EntityType = "EVENT" | "COMEDIAN" | "VENUE" | "CLIP" | "PODCAST";

export type BuzzLevel = "LOW" | "MEDIUM" | "HIGH" | "VIRAL";

export type BoostType =
  | "NEW_COMEDIAN"
  | "RETURNING_FAVORITE"
  | "FRIEND_RECOMMENDED"
  | "TRENDING"
  | "EDITORIAL_PICK";

export type FeedType =
  | "FOR_YOU"
  | "HAPPENING_TONIGHT"
  | "TRENDING_NEAR_YOU"
  | "FRIENDS_ATTENDING";

export interface SignalInput {
  signalType: SignalType;
  entityType: EntityType;
  entityId: string;
}

export interface FeedItem {
  entityType: EntityType;
  entityId: string;
  score: number;
  title: string;
  subtitle?: string;
  socialProof?: {
    friendsAttending: number;
    totalAttending: number;
    trendingScore: number;
    buzzLevel: BuzzLevel;
  };
  insight?: string;
  boostApplied?: boolean;
}

export interface DiscoveryProfile {
  userId: string;
  preferredGenres: string[];
  preferredVenues: string[];
  preferredDays: string[];
  attributeWeights: Record<string, number>;
  explanationCache: string[];
  profileVersion: string;
  averageSpend: number;
  discoveryOpenness: number;
  lastComputedAt: Date;
}

export interface SocialProofData {
  entityType: EntityType;
  entityId: string;
  friendsAttending: number;
  totalAttending: number;
  trendingScore: number;
  trustScore: number;
  buzzLevel: BuzzLevel;
}

/* -------------------------------------------------------------------------- */
/*  Signal Weights                                                            */
/* -------------------------------------------------------------------------- */

const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  VIEW: 1.0,
  CLICK: 2.0,
  ATTEND: 5.0,
  FOLLOW: 4.0,
  CLIP_WATCH: 1.5,
  SHARE: 3.0,
  REVIEW: 4.5,
  CHECKIN: 5.0,
  PURCHASE: 6.0,
};

/* -------------------------------------------------------------------------- */
/*  Score Weights                                                             */
/* -------------------------------------------------------------------------- */

const SCORE_WEIGHTS = {
  tasteMatch: 35,
  socialProof: 25,
  trending: 15,
  proximity: 10,
  genreMatch: 10,
  boost: 5,
};

/* -------------------------------------------------------------------------- */
/*  Buzz Thresholds                                                           */
/* -------------------------------------------------------------------------- */

const BUZZ_THRESHOLDS = {
  VIRAL: 100,
  HIGH: 50,
  MEDIUM: 20,
  LOW: 0,
};

/* -------------------------------------------------------------------------- */
/*  Record Signal                                                             */
/* -------------------------------------------------------------------------- */

export async function recordSignal(userId: string, signal: SignalInput) {
  const weight = SIGNAL_WEIGHTS[signal.signalType] ?? 1.0;

  return prisma.discoverySignal.create({
    data: {
      userId,
      signalType: signal.signalType,
      entityType: signal.entityType,
      entityId: signal.entityId,
      weight,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Compute Discovery Profile                                                 */
/* -------------------------------------------------------------------------- */

export async function computeDiscoveryProfile(
  userId: string,
): Promise<DiscoveryProfile> {
  const signals = await prisma.discoverySignal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Analyze genre preferences from signals related to events/comedians
  const entitySignals = signals.filter(
    (s) => s.entityType === "EVENT" || s.entityType === "COMEDIAN",
  );
  const venueSignals = signals.filter((s) => s.entityType === "VENUE");

  // Build genre frequency from event/comedian entity IDs
  const genreWeights = new Map<string, number>();
  const venueWeights = new Map<string, number>();
  const dayWeights = new Map<string, number>();
  const rawAttributeWeights = emptyAttributeScores();

  // Fetch related events for entity signals
  const eventEntityIds = entitySignals
    .filter((s) => s.entityType === "EVENT")
    .map((s) => s.entityId);

  if (eventEntityIds.length > 0) {
    const events = await prisma.event.findMany({
      where: { id: { in: eventEntityIds } },
      include: {
        comedians: {
          include: { comedian: { include: { genres: true } } },
        },
        venue: true,
      },
    });

    for (const event of events) {
      const signal = entitySignals.find(
        (s) => s.entityId === event.id && s.entityType === "EVENT",
      );
      const weight = signal?.weight ?? 1;

      // Genres
      for (const ec of event.comedians) {
        const comedianGenres = ec.comedian.genres.map((g) => g.genre);
        for (const g of ec.comedian.genres) {
          genreWeights.set(
            g.genre,
            (genreWeights.get(g.genre) ?? 0) + weight,
          );
        }
        addWeightedAttributes(rawAttributeWeights, comedianGenres, weight);
      }

      // Venue preferences
      if (event.venue) {
        venueWeights.set(
          event.venue.id,
          (venueWeights.get(event.venue.id) ?? 0) + weight,
        );
      }

      // Day of week preferences
      const day = event.date.toLocaleDateString("en-US", { weekday: "long" });
      dayWeights.set(day, (dayWeights.get(day) ?? 0) + weight);
    }
  }

  // Venue signals
  for (const s of venueSignals) {
    venueWeights.set(
      s.entityId,
      (venueWeights.get(s.entityId) ?? 0) + s.weight,
    );
  }

  // Sort and extract top preferences
  const preferredGenres = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  const preferredVenues = [...venueWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([venueId]) => venueId);

  const preferredDays = [...dayWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);
  const attributeWeights = normalizeAttributeScores(rawAttributeWeights);
  const explanationCache = getTopKeys(attributeWeights, 3).map(getAttributeLabel);

  // Compute average spend from purchase signals
  const purchaseSignals = signals.filter((s) => s.signalType === "PURCHASE");
  const averageSpend = purchaseSignals.length > 0
    ? purchaseSignals.reduce((sum, s) => sum + s.weight, 0) / purchaseSignals.length
    : 0;

  // Discovery openness: ratio of unique entities to total signals
  const uniqueEntities = new Set(signals.map((s) => s.entityId)).size;
  const discoveryOpenness = signals.length > 0
    ? Math.min(uniqueEntities / signals.length, 1.0)
    : 0.5;

  const profile: DiscoveryProfile = {
    userId,
    preferredGenres,
    preferredVenues,
    preferredDays,
    attributeWeights,
    explanationCache,
    profileVersion: "v2",
    averageSpend,
    discoveryOpenness,
    lastComputedAt: new Date(),
  };

  await prisma.userDiscoveryProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredGenres,
      preferredVenues,
      preferredDays,
      attributeWeights,
      explanationCache,
      profileVersion: "v2",
      averageSpend,
      discoveryOpenness,
    },
    update: {
      preferredGenres,
      preferredVenues,
      preferredDays,
      attributeWeights,
      explanationCache,
      profileVersion: "v2",
      averageSpend,
      discoveryOpenness,
      lastComputedAt: new Date(),
    },
  });

  return profile;
}

/* -------------------------------------------------------------------------- */
/*  Get Discovery Profile                                                     */
/* -------------------------------------------------------------------------- */

export async function getDiscoveryProfile(
  userId: string,
): Promise<DiscoveryProfile | null> {
  const profile = await prisma.userDiscoveryProfile.findUnique({
    where: { userId },
  });

  if (!profile) return null;

  return {
    userId: profile.userId,
    preferredGenres: profile.preferredGenres as string[],
    preferredVenues: profile.preferredVenues as string[],
    preferredDays: profile.preferredDays as string[],
    attributeWeights: (profile.attributeWeights as Record<string, number> | null) ?? {},
    explanationCache: (profile.explanationCache as string[] | null) ?? [],
    profileVersion: profile.profileVersion ?? "v1",
    averageSpend: profile.averageSpend,
    discoveryOpenness: profile.discoveryOpenness,
    lastComputedAt: profile.lastComputedAt,
  };
}

/* -------------------------------------------------------------------------- */
/*  Generate For You Feed                                                     */
/* -------------------------------------------------------------------------- */

export async function generateForYouFeed(
  userId: string,
  limit = 20,
): Promise<FeedItem[]> {
  const profile = await getDiscoveryProfile(userId);

  // Fetch upcoming events
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    include: {
      venue: true,
      comedians: {
        include: { comedian: { include: { genres: true } } },
      },
    },
    orderBy: { date: "asc" },
    take: 100,
  });

  const feedItems: FeedItem[] = [];

  for (const event of events) {
    const socialProof = await getSocialProof("EVENT", event.id, userId);
    const boosts = await getBoostsForEntity("EVENT", event.id);

    const eventGenres = event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((g) => g.genre),
    );

    const item: FeedItem = {
      entityType: "EVENT",
      entityId: event.id,
      score: 0,
      title: event.title,
      subtitle: event.venue?.name,
      socialProof: socialProof ?? undefined,
      boostApplied: boosts.length > 0,
    };

    item.score = scoreFeedItem(
      item,
      profile ?? createDefaultProfile(userId),
      socialProof,
      eventGenres,
      boosts,
    );

    feedItems.push(item);
  }

  // Sort by score descending
  feedItems.sort((a, b) => b.score - a.score);

  return feedItems.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*  Generate Happening Tonight Feed                                           */
/* -------------------------------------------------------------------------- */

export async function generateHappeningTonightFeed(
  userId: string,
  limit = 20,
): Promise<FeedItem[]> {
  const profile = await getDiscoveryProfile(userId);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: startOfDay, lt: endOfDay },
    },
    include: {
      venue: true,
      comedians: {
        include: { comedian: { include: { genres: true } } },
      },
    },
    orderBy: { date: "asc" },
    take: 50,
  });

  const feedItems: FeedItem[] = [];

  for (const event of events) {
    const socialProof = await getSocialProof("EVENT", event.id, userId);
    const eventGenres = event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((g) => g.genre),
    );

    const item: FeedItem = {
      entityType: "EVENT",
      entityId: event.id,
      score: 0,
      title: event.title,
      subtitle: event.venue?.name,
      socialProof: socialProof ?? undefined,
    };

    item.score = scoreFeedItem(
      item,
      profile ?? createDefaultProfile(userId),
      socialProof,
      eventGenres,
      [],
    );

    feedItems.push(item);
  }

  feedItems.sort((a, b) => b.score - a.score);
  return feedItems.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*  Generate Trending Near You Feed                                           */
/* -------------------------------------------------------------------------- */

export async function generateTrendingNearYouFeed(
  userId: string,
  location: { lat: number; lng: number },
  limit = 20,
): Promise<FeedItem[]> {
  const profile = await getDiscoveryProfile(userId);

  // Get events with high social proof / trending scores
  const socialProofs = await prisma.socialProof.findMany({
    where: {
      entityType: "EVENT",
      trendingScore: { gt: 0 },
    },
    orderBy: { trendingScore: "desc" },
    take: 100,
  });

  const entityIds = socialProofs.map((sp) => sp.entityId);

  const events = await prisma.event.findMany({
    where: {
      id: { in: entityIds },
      date: { gte: new Date() },
    },
    include: {
      venue: true,
      comedians: {
        include: { comedian: { include: { genres: true } } },
      },
    },
  });

  const feedItems: FeedItem[] = [];

  for (const event of events) {
    const sp = socialProofs.find((s) => s.entityId === event.id);
    if (!sp) continue;

    // Compute distance for proximity scoring
    let proximityScore = 0;
    if (event.venue?.latitude && event.venue?.longitude) {
      const dist = haversineDistance(
        location.lat,
        location.lng,
        event.venue.latitude,
        event.venue.longitude,
      );
      // Score: closer = higher, max 1.0 at 0 miles, 0 at 100+ miles
      proximityScore = Math.max(0, 1 - dist / 100);
    }

    const eventGenres = event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((g) => g.genre),
    );

    const socialProofData: SocialProofData = {
      entityType: "EVENT",
      entityId: event.id,
      friendsAttending: sp.friendsAttending,
      totalAttending: sp.totalAttending,
      trendingScore: sp.trendingScore,
      buzzLevel: sp.buzzLevel as BuzzLevel,
    };

    const item: FeedItem = {
      entityType: "EVENT",
      entityId: event.id,
      score: 0,
      title: event.title,
      subtitle: event.venue?.name,
      socialProof: socialProofData,
    };

    // Weighted score with proximity factor
    const baseScore = scoreFeedItem(
      item,
      profile ?? createDefaultProfile(userId),
      socialProofData,
      eventGenres,
      [],
    );

    item.score = baseScore * 0.7 + proximityScore * 100 * 0.3;

    feedItems.push(item);
  }

  feedItems.sort((a, b) => b.score - a.score);
  return feedItems.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*  Generate Friends Attending Feed                                           */
/* -------------------------------------------------------------------------- */

export async function generateFriendsAttendingFeed(
  userId: string,
  limit = 20,
): Promise<FeedItem[]> {
  // Get user's friends (people they follow)
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const friendIds = following.map((f) => f.followingId);

  if (friendIds.length === 0) {
    return [];
  }

  // Find events where friends are attending
  const friendAttendances = await prisma.eventAttendance.findMany({
    where: {
      userId: { in: friendIds },
      event: { date: { gte: new Date() } },
    },
    include: {
      event: {
        include: {
          venue: true,
          comedians: {
            include: { comedian: { include: { genres: true } } },
          },
        },
      },
    },
  });

  // Group by event and count friends
  const eventFriendCount = new Map<string, number>();
  const eventMap = new Map<string, typeof friendAttendances[0]["event"]>();

  for (const attendance of friendAttendances) {
    const eventId = attendance.event.id;
    eventFriendCount.set(eventId, (eventFriendCount.get(eventId) ?? 0) + 1);
    eventMap.set(eventId, attendance.event);
  }

  const feedItems: FeedItem[] = [];

  for (const [eventId, friendCount] of eventFriendCount) {
    const event = eventMap.get(eventId)!;

    const item: FeedItem = {
      entityType: "EVENT",
      entityId: eventId,
      score: friendCount * 10,
      title: event.title,
      subtitle: event.venue?.name,
      socialProof: {
        friendsAttending: friendCount,
        totalAttending: 0,
        trendingScore: 0,
        buzzLevel: "LOW",
      },
      insight: `${friendCount} friend${friendCount > 1 ? "s" : ""} going`,
    };

    feedItems.push(item);
  }

  feedItems.sort((a, b) => b.score - a.score);
  return feedItems.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*  Compute Social Proof                                                      */
/* -------------------------------------------------------------------------- */

export async function computeSocialProof(
  entityType: EntityType,
  entityId: string,
): Promise<SocialProofData> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [signals24h, signals7d, totalAttending] = await Promise.all([
    prisma.discoverySignal.count({
      where: {
        entityType,
        entityId,
        createdAt: { gte: last24h },
      },
    }),
    prisma.discoverySignal.count({
      where: {
        entityType,
        entityId,
        createdAt: { gte: last7d },
      },
    }),
    entityType === "EVENT"
      ? prisma.eventAttendance.count({
          where: { eventId: entityId },
        })
      : Promise.resolve(0),
  ]);

  const trendingScore = signals24h * 3 + signals7d;
  const buzzLevel = computeBuzzLevel(signals24h, signals7d);

  const data: SocialProofData = {
    entityType,
    entityId,
    friendsAttending: 0,
    totalAttending,
    trendingScore,
    trustScore: Math.min(100, Math.round((totalAttending * 0.6 + trendingScore * 0.4) * 10) / 10),
    buzzLevel,
  };

  await prisma.socialProof.upsert({
    where: {
      entityType_entityId: { entityType, entityId },
    },
    create: {
      entityType,
      entityId,
      totalAttending,
      trendingScore,
      trustScore: data.trustScore,
      buzzLevel,
    },
    update: {
      totalAttending,
      trendingScore,
      trustScore: data.trustScore,
      buzzLevel,
    },
  });

  return data;
}

/* -------------------------------------------------------------------------- */
/*  Get Social Proof                                                          */
/* -------------------------------------------------------------------------- */

export async function getSocialProof(
  entityType: EntityType,
  entityId: string,
  userId?: string,
): Promise<SocialProofData | null> {
  const proof = await prisma.socialProof.findUnique({
    where: {
      entityType_entityId: { entityType, entityId },
    },
  });

  if (!proof) return null;

  let friendsAttending = 0;

  if (userId && entityType === "EVENT") {
    const following = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const friendIds = following.map((f) => f.followingId);

    if (friendIds.length > 0) {
      friendsAttending = await prisma.eventAttendance.count({
        where: {
          eventId: entityId,
          userId: { in: friendIds },
        },
      });
    }
  }

  return {
    entityType: proof.entityType as EntityType,
    entityId: proof.entityId,
    friendsAttending,
    totalAttending: proof.totalAttending,
    trendingScore: proof.trendingScore,
    trustScore: proof.trustScore ?? 0,
    buzzLevel: proof.buzzLevel as BuzzLevel,
  };
}

/* -------------------------------------------------------------------------- */
/*  Apply Discovery Boost                                                     */
/* -------------------------------------------------------------------------- */

export async function applyDiscoveryBoost(
  entityType: EntityType,
  entityId: string,
  boostType: BoostType,
  durationHours: number,
) {
  const multiplierMap: Record<BoostType, number> = {
    NEW_COMEDIAN: 1.5,
    RETURNING_FAVORITE: 1.8,
    FRIEND_RECOMMENDED: 2.0,
    TRENDING: 1.6,
    EDITORIAL_PICK: 2.5,
  };

  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return prisma.discoveryBoost.create({
    data: {
      entityType,
      entityId,
      boostType,
      boostMultiplier: multiplierMap[boostType],
      expiresAt,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Get Active Boosts                                                         */
/* -------------------------------------------------------------------------- */

export async function getActiveBoosts() {
  return prisma.discoveryBoost.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "asc" },
  });
}

/* -------------------------------------------------------------------------- */
/*  Score Feed Item                                                           */
/* -------------------------------------------------------------------------- */

export function scoreFeedItem(
  _item: FeedItem,
  userProfile: DiscoveryProfile,
  socialProof: SocialProofData | null,
  eventGenres: string[],
  boosts: { boostMultiplier: number }[],
): number {
  let score = 0;

  // Taste match: how well does this match the user's preferred genres
  const genreOverlap = eventGenres.filter((g) =>
    userProfile.preferredGenres.includes(g),
  ).length;
  let tasteScore: number;
  if (userProfile.preferredGenres.length === 0) {
    // Cold start: give neutral score so items still appear
    tasteScore = SCORE_WEIGHTS.tasteMatch * 0.3;
  } else if (eventGenres.length > 0) {
    tasteScore = (genreOverlap / eventGenres.length) * SCORE_WEIGHTS.tasteMatch;
  } else {
    tasteScore = SCORE_WEIGHTS.tasteMatch * 0.3; // Neutral for unknown genres
  }
  score += tasteScore;

  // Genre match (user's preferred genres present)
  const genreMatchScore =
    userProfile.preferredGenres.length > 0
      ? (genreOverlap / userProfile.preferredGenres.length) *
        SCORE_WEIGHTS.genreMatch
      : SCORE_WEIGHTS.genreMatch * 0.2; // Small baseline for cold start
  score += genreMatchScore;

  // Social proof
  if (socialProof) {
    const friendBoost = Math.min(socialProof.friendsAttending * 5, SCORE_WEIGHTS.socialProof);
    const attendingBoost = Math.min(
      socialProof.totalAttending * 0.1,
      SCORE_WEIGHTS.socialProof * 0.5,
    );
    const trustBoost = Math.min((socialProof.trustScore ?? 0) / 10, 10);
    score += friendBoost + attendingBoost + trustBoost;

    // Trending
    const trendingNorm = Math.min(
      socialProof.trendingScore / 100,
      1,
    );
    score += trendingNorm * SCORE_WEIGHTS.trending;
  }

  // Apply boosts
  if (boosts.length > 0) {
    const maxBoost = Math.max(...boosts.map((b) => b.boostMultiplier));
    score += SCORE_WEIGHTS.boost * maxBoost;
  }

  // Clamp to 0-100
  return Math.min(Math.max(Math.round(score * 100) / 100, 0), 100);
}

/* -------------------------------------------------------------------------- */
/*  Compute Buzz Level                                                        */
/* -------------------------------------------------------------------------- */

export function computeBuzzLevel(signals24h: number, signals7d: number): BuzzLevel {
  const velocity = signals24h * 3 + signals7d;

  if (velocity >= BUZZ_THRESHOLDS.VIRAL) return "VIRAL";
  if (velocity >= BUZZ_THRESHOLDS.HIGH) return "HIGH";
  if (velocity >= BUZZ_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/* -------------------------------------------------------------------------- */
/*  Get Discovery Insights                                                    */
/* -------------------------------------------------------------------------- */

export async function getDiscoveryInsights(
  userId: string,
): Promise<{ entityId: string; entityType: EntityType; reason: string }[]> {
  const profile = await getDiscoveryProfile(userId);

  if (!profile || profile.preferredGenres.length === 0) {
    return [
      {
        entityId: "",
        entityType: "EVENT",
        reason: "Popular in your area",
      },
    ];
  }

  // Get recent signals to build insight reasons
  const recentSignals = await prisma.discoverySignal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Find top interacted comedians
  const comedianSignals = recentSignals.filter(
    (s) => s.entityType === "COMEDIAN",
  );
  const comedianCounts = new Map<string, number>();
  for (const s of comedianSignals) {
    comedianCounts.set(
      s.entityId,
      (comedianCounts.get(s.entityId) ?? 0) + 1,
    );
  }

  const topComedianIds = [...comedianCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  // Fetch comedian names
  const topComedians = topComedianIds.length > 0
    ? await prisma.comedian.findMany({
        where: { id: { in: topComedianIds } },
        select: { id: true, name: true },
      })
    : [];

  // Build insights for upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    include: {
      comedians: {
        include: { comedian: { include: { genres: true } } },
      },
    },
    take: 20,
  });

  const insights: { entityId: string; entityType: EntityType; reason: string }[] = [];

  for (const event of upcomingEvents) {
    const eventGenres = event.comedians.flatMap((ec) =>
      ec.comedian.genres.map((g) => g.genre),
    );
    const eventComedianIds = event.comedians.map((ec) => ec.comedian.id);

    // Check if features a favorite comedian
    const favComedian = topComedians.find((c) =>
      eventComedianIds.includes(c.id),
    );
    if (favComedian) {
      const count = comedianCounts.get(favComedian.id) ?? 0;
      insights.push({
        entityId: event.id,
        entityType: "EVENT",
        reason: `Because you saw ${favComedian.name} ${count} time${count > 1 ? "s" : ""}`,
      });
      continue;
    }

    // Check genre match
    const matchingGenres = eventGenres.filter((g) =>
      profile.preferredGenres.includes(g),
    );
    if (matchingGenres.length > 0) {
      const topAttribute = Object.entries(profile.attributeWeights)
        .sort((a, b) => b[1] - a[1])
        .map(([attribute]) => attribute)[0];
      insights.push({
        entityId: event.id,
        entityType: "EVENT",
        reason: topAttribute
          ? `Because you lean ${getAttributeLabel(topAttribute).toLowerCase()} and like ${matchingGenres[0]} comedy`
          : `Because you like ${matchingGenres[0]} comedy`,
      });
    }
  }

  return insights.length > 0
    ? insights
    : [{ entityId: "", entityType: "EVENT", reason: "Popular in your area" }];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function createDefaultProfile(userId: string): DiscoveryProfile {
  return {
    userId,
    preferredGenres: [],
    preferredVenues: [],
    preferredDays: [],
    attributeWeights: {},
    explanationCache: [],
    profileVersion: "v2",
    averageSpend: 0,
    discoveryOpenness: 0.5,
    lastComputedAt: new Date(),
  };
}

async function getBoostsForEntity(entityType: EntityType, entityId: string) {
  return prisma.discoveryBoost.findMany({
    where: {
      entityType,
      entityId,
      expiresAt: { gt: new Date() },
    },
  });
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
