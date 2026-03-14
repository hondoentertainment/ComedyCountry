import { prisma } from "./prisma";

/**
 * Phase 15: Short-Form Comedy & Viral Discovery
 */

/* ─── Constants ────────────────────────────────────────────────────────── */

const MAX_CLIP_DURATION = 90; // seconds
const ENGAGEMENT_WEIGHTS = {
  like: 1,
  share: 3,
  save: 2,
  report: -5,
};

/* ─── Create a clip ────────────────────────────────────────────────────── */

export async function createClip(data: {
  comedianId?: string;
  userId?: string;
  title?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  description?: string;
  tags?: string[];
  isPreview?: boolean;
  eventId?: string;
}) {
  if (data.duration > MAX_CLIP_DURATION) {
    throw new Error(`Clip duration cannot exceed ${MAX_CLIP_DURATION} seconds`);
  }
  if (data.duration <= 0) {
    throw new Error("Clip duration must be greater than 0");
  }
  if (!data.videoUrl?.trim()) {
    throw new Error("videoUrl is required");
  }

  return prisma.shortClip.create({
    data: {
      comedianId: data.comedianId,
      userId: data.userId,
      title: data.title,
      videoUrl: data.videoUrl.trim(),
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,
      description: data.description,
      tags: data.tags ?? [],
      isPreview: data.isPreview ?? false,
      eventId: data.eventId,
    },
  });
}

/* ─── Get clip by ID ──────────────────────────────────────────────────── */

export async function getClipById(id: string) {
  const clip = await prisma.shortClip.findUnique({
    where: { id },
    include: {
      comedian: true,
      event: true,
      parentClip: true,
    },
  });
  if (!clip) {
    throw new Error("Clip not found");
  }
  return clip;
}

/* ─── Get clip feed (algorithmic) ─────────────────────────────────────── */

export async function getClipFeed(options: {
  tags?: string[];
  page?: number;
  pageSize?: number;
  sort?: "engagement" | "recent" | "views";
} = {}) {
  const { tags, page = 1, pageSize = 20, sort = "engagement" } = options;

  const where: Record<string, unknown> = { status: "active" };
  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  let orderBy: Record<string, string>;
  switch (sort) {
    case "recent":
      orderBy = { createdAt: "desc" };
      break;
    case "views":
      orderBy = { viewCount: "desc" };
      break;
    case "engagement":
    default:
      orderBy = { likeCount: "desc" };
      break;
  }

  const [clips, total] = await Promise.all([
    prisma.shortClip.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { comedian: true },
    }),
    prisma.shortClip.count({ where }),
  ]);

  return { clips, total, page, pageSize };
}

/* ─── Get comedian clips ──────────────────────────────────────────────── */

export async function getComedianClips(comedianId: string, page = 1, pageSize = 20) {
  const where = { comedianId, status: "active" };
  const [clips, total] = await Promise.all([
    prisma.shortClip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shortClip.count({ where }),
  ]);

  return { clips, total, page, pageSize };
}

/* ─── Engage with a clip ──────────────────────────────────────────────── */

export async function engageWithClip(clipId: string, userId: string, type: string) {
  const validTypes = ["like", "share", "save", "report"];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid engagement type: ${type}`);
  }

  const engagement = await prisma.clipEngagement.create({
    data: { clipId, userId, type },
  });

  // Update clip counts
  const countField = `${type}Count` as const;
  if (["like", "share"].includes(type)) {
    await prisma.shortClip.update({
      where: { id: clipId },
      data: { [countField]: { increment: 1 } },
    });
  }

  return engagement;
}

/* ─── Remove engagement ───────────────────────────────────────────────── */

export async function removeEngagement(clipId: string, userId: string, type: string) {
  const engagement = await prisma.clipEngagement.findUnique({
    where: { clipId_userId_type: { clipId, userId, type } },
  });

  if (!engagement) {
    throw new Error("Engagement not found");
  }

  await prisma.clipEngagement.delete({
    where: { id: engagement.id },
  });

  // Update clip counts
  if (["like", "share"].includes(type)) {
    const countField = `${type}Count` as const;
    await prisma.shortClip.update({
      where: { id: clipId },
      data: { [countField]: { decrement: 1 } },
    });
  }

  return { removed: true };
}

/* ─── Get engagement counts for a clip ────────────────────────────────── */

export async function getClipEngagementCounts(clipId: string) {
  const engagements = await prisma.clipEngagement.groupBy({
    by: ["type"],
    where: { clipId },
    _count: { type: true },
  });

  const counts: Record<string, number> = {
    like: 0,
    share: 0,
    save: 0,
    report: 0,
  };

  for (const e of engagements) {
    counts[e.type] = e._count.type;
  }

  return counts;
}

/* ─── Get user engagements for a clip ─────────────────────────────────── */

export async function getUserEngagements(userId: string, clipId: string) {
  const engagements = await prisma.clipEngagement.findMany({
    where: { userId, clipId },
  });

  return engagements.map((e) => e.type);
}

/* ─── Create duet ─────────────────────────────────────────────────────── */

export async function createDuet(parentClipId: string, data: {
  comedianId?: string;
  userId?: string;
  title?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  description?: string;
  tags?: string[];
}) {
  // Verify parent clip exists
  const parentClip = await prisma.shortClip.findUnique({
    where: { id: parentClipId },
  });
  if (!parentClip) {
    throw new Error("Parent clip not found");
  }

  if (data.duration > MAX_CLIP_DURATION) {
    throw new Error(`Clip duration cannot exceed ${MAX_CLIP_DURATION} seconds`);
  }
  if (data.duration <= 0) {
    throw new Error("Clip duration must be greater than 0");
  }

  return prisma.shortClip.create({
    data: {
      comedianId: data.comedianId,
      userId: data.userId,
      title: data.title,
      videoUrl: data.videoUrl.trim(),
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,
      description: data.description,
      tags: data.tags ?? [],
      parentClipId,
    },
  });
}

/* ─── Get duets for a clip ────────────────────────────────────────────── */

export async function getDuets(clipId: string) {
  return prisma.shortClip.findMany({
    where: { parentClipId: clipId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { comedian: true },
  });
}

/* ─── Get trending bits ───────────────────────────────────────────────── */

export async function getTrendingBits(limit = 10) {
  return prisma.trendingBit.findMany({
    where: { isActive: true },
    orderBy: { score: "desc" },
    take: limit,
  });
}

/* ─── Update trending scores (time-decay algorithm) ───────────────────── */

export async function updateTrendingScores() {
  const bits = await prisma.trendingBit.findMany({
    where: { isActive: true },
  });

  const now = Date.now();
  const HALF_LIFE_MS = 24 * 60 * 60 * 1000; // 24 hours

  const updates = bits.map((bit) => {
    const ageMs = now - bit.updatedAt.getTime();
    const decay = Math.pow(0.5, ageMs / HALF_LIFE_MS);
    const rawScore = bit.clipCount * 2 + bit.viewCount * 0.1;
    const score = rawScore * decay;

    return prisma.trendingBit.update({
      where: { id: bit.id },
      data: {
        score,
        peakDate: score > bit.score ? new Date() : bit.peakDate,
      },
    });
  });

  return Promise.all(updates);
}

/* ─── Create challenge ────────────────────────────────────────────────── */

export async function createChallenge(data: {
  title: string;
  description: string;
  promptText: string;
  startDate: Date;
  endDate: Date;
  prize?: string;
}) {
  if (data.endDate <= data.startDate) {
    throw new Error("End date must be after start date");
  }

  return prisma.clipChallenge.create({
    data: {
      title: data.title,
      description: data.description,
      promptText: data.promptText,
      startDate: data.startDate,
      endDate: data.endDate,
      prize: data.prize,
    },
  });
}

/* ─── Get active challenges ───────────────────────────────────────────── */

export async function getActiveChallenges() {
  return prisma.clipChallenge.findMany({
    where: {
      isActive: true,
      endDate: { gte: new Date() },
    },
    orderBy: { endDate: "asc" },
  });
}

/* ─── Get challenge clips ─────────────────────────────────────────────── */

export async function getChallengeClips(challengeId: string) {
  const challenge = await prisma.clipChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  // Clips tagged with challenge title, created within challenge period
  return prisma.shortClip.findMany({
    where: {
      status: "active",
      tags: { has: challenge.title },
      createdAt: {
        gte: challenge.startDate,
        lte: challenge.endDate,
      },
    },
    orderBy: { likeCount: "desc" },
    include: { comedian: true },
  });
}

/* ─── Get show preview clips ──────────────────────────────────────────── */

export async function getShowPreviews(eventId: string) {
  return prisma.shortClip.findMany({
    where: {
      eventId,
      isPreview: true,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
    include: { comedian: true },
  });
}

/* ─── Calculate engagement score ──────────────────────────────────────── */

export function calculateEngagementScore(clip: {
  viewCount: number;
  likeCount: number;
  shareCount: number;
  commentCount: number;
}) {
  return (
    clip.viewCount * 0.1 +
    clip.likeCount * ENGAGEMENT_WEIGHTS.like +
    clip.shareCount * ENGAGEMENT_WEIGHTS.share +
    clip.commentCount * 1.5
  );
}
