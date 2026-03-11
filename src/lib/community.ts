import { prisma } from "./prisma";

/* -------------------------------------------------------------------------- */
/*  Discussions                                                               */
/* -------------------------------------------------------------------------- */

export async function getDiscussions(
  entityType: string,
  entityId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  const [threads, total] = await Promise.all([
    prisma.discussionThread.findMany({
      where: { entityType, entityId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: { _count: { select: { replies: true } } },
    }),
    prisma.discussionThread.count({ where: { entityType, entityId } }),
  ]);

  return { threads, total, page, pages: Math.ceil(total / limit) };
}

export async function createThread(
  userId: string,
  entityType: string,
  entityId: string,
  title: string,
  body: string,
) {
  return prisma.discussionThread.create({
    data: { userId, entityType, entityId, title, body },
  });
}

export async function getThread(threadId: string) {
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
      _count: { select: { replies: true } },
    },
  });
  return thread;
}

export async function addReply(threadId: string, userId: string, body: string) {
  return prisma.discussionReply.create({
    data: { threadId, userId, body },
  });
}

/* -------------------------------------------------------------------------- */
/*  Venue Check-Ins                                                           */
/* -------------------------------------------------------------------------- */

export async function getVenueCheckIns(venueId: string, hours = 4) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const count = await prisma.venueCheckIn.count({
    where: { venueId, createdAt: { gte: since } },
  });
  return { venueId, count, hours };
}

export async function checkInToVenue(userId: string, venueId: string) {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const recent = await prisma.venueCheckIn.findFirst({
    where: { userId, venueId, createdAt: { gte: fourHoursAgo } },
  });

  if (recent) {
    throw new Error("You already checked in recently. Try again later.");
  }

  return prisma.venueCheckIn.create({ data: { userId, venueId } });
}

/* -------------------------------------------------------------------------- */
/*  User Clips                                                                */
/* -------------------------------------------------------------------------- */

export async function getClips(
  entityType?: string,
  entityId?: string,
  status?: string,
  page = 1,
  limit = 20,
) {
  const where: Record<string, unknown> = {};
  if (entityType === "comedian" && entityId) where.comedianId = entityId;
  if (entityType === "venue" && entityId) where.venueId = entityId;
  if (entityType === "event" && entityId) where.eventId = entityId;
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [clips, total] = await Promise.all([
    prisma.userClip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.userClip.count({ where }),
  ]);

  return { clips, total, page, pages: Math.ceil(total / limit) };
}

export async function uploadClip(
  userId: string,
  data: {
    eventId?: string;
    comedianId?: string;
    venueId?: string;
    videoUrl: string;
    caption?: string;
    durationSec?: number;
  },
) {
  return prisma.userClip.create({
    data: {
      userId,
      eventId: data.eventId ?? null,
      comedianId: data.comedianId ?? null,
      venueId: data.venueId ?? null,
      videoUrl: data.videoUrl,
      caption: data.caption ?? null,
      durationSec: data.durationSec ?? null,
    },
  });
}

export async function voteOnClip(
  clipId: string,
  userId: string,
  vote: number,
) {
  const v = vote > 0 ? 1 : -1;

  const existing = await prisma.clipVote.findUnique({
    where: { clipId_userId: { clipId, userId } },
  });

  if (existing) {
    if (existing.vote === v) {
      // Remove vote (toggle off)
      await prisma.clipVote.delete({ where: { id: existing.id } });
      await prisma.userClip.update({
        where: { id: clipId },
        data: v === 1 ? { upvotes: { decrement: 1 } } : { downvotes: { decrement: 1 } },
      });
      return { action: "removed" };
    }
    // Flip vote
    await prisma.clipVote.update({ where: { id: existing.id }, data: { vote: v } });
    await prisma.userClip.update({
      where: { id: clipId },
      data:
        v === 1
          ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
          : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
    });
    return { action: "flipped", vote: v };
  }

  await prisma.clipVote.create({ data: { clipId, userId, vote: v } });
  await prisma.userClip.update({
    where: { id: clipId },
    data: v === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
  });
  return { action: "voted", vote: v };
}

/* -------------------------------------------------------------------------- */
/*  Fan Clubs                                                                 */
/* -------------------------------------------------------------------------- */

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createFanClub(
  userId: string,
  name: string,
  description?: string,
  isPublic = true,
) {
  const club = await prisma.fanClub.create({
    data: {
      name,
      description: description ?? null,
      creatorId: userId,
      isPublic,
      inviteCode: generateInviteCode(),
      members: { create: { userId, role: "admin" } },
    },
    include: { _count: { select: { members: true } } },
  });
  return club;
}

export async function joinFanClub(userId: string, clubId: string) {
  const existing = await prisma.fanClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  if (existing) throw new Error("Already a member");

  return prisma.fanClubMember.create({
    data: { clubId, userId, role: "member" },
  });
}

/* -------------------------------------------------------------------------- */
/*  Polls                                                                     */
/* -------------------------------------------------------------------------- */

export async function createPoll(
  userId: string,
  entityType: string,
  entityId: string,
  question: string,
  options: string[],
  expiresAt?: Date,
) {
  return prisma.poll.create({
    data: {
      userId,
      entityType,
      entityId,
      question,
      options: JSON.stringify(options),
      expiresAt: expiresAt ?? null,
    },
  });
}

export async function votePoll(
  pollId: string,
  userId: string,
  optionIndex: number,
) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("Poll not found");

  const opts: string[] = JSON.parse(poll.options);
  if (optionIndex < 0 || optionIndex >= opts.length) {
    throw new Error("Invalid option index");
  }

  if (poll.expiresAt && poll.expiresAt < new Date()) {
    throw new Error("Poll has expired");
  }

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId } },
  });

  if (existing) {
    return prisma.pollVote.update({
      where: { id: existing.id },
      data: { optionIndex },
    });
  }

  return prisma.pollVote.create({
    data: { pollId, userId, optionIndex },
  });
}
