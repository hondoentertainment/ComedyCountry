import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDiscussions,
  createThread,
  getThread,
  addReply,
  getVenueCheckIns,
  checkInToVenue,
  getClips,
  uploadClip,
  voteOnClip,
  createFanClub,
  joinFanClub,
  createPoll,
  votePoll,
} from "./community";

vi.mock("./prisma", () => ({
  prisma: {
    discussionThread: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    discussionReply: { create: vi.fn() },
    venueCheckIn: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    userClip: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    clipVote: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fanClub: { create: vi.fn() },
    fanClubMember: { findUnique: vi.fn(), create: vi.fn() },
    poll: { findUnique: vi.fn(), create: vi.fn() },
    pollVote: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  discussionThread: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  discussionReply: { create: ReturnType<typeof vi.fn> };
  venueCheckIn: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  userClip: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clipVote: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  fanClub: { create: ReturnType<typeof vi.fn> };
  fanClubMember: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  poll: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  pollVote: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("community", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Discussions ─────────────────────────────────────────────────── */

  describe("getDiscussions", () => {
    it("returns paginated threads with total and pages", async () => {
      const threads = [{ id: "th1", title: "Discussion" }];
      mockPrisma.discussionThread.findMany.mockResolvedValue(threads);
      mockPrisma.discussionThread.count.mockResolvedValue(1);

      const result = await getDiscussions("venue", "v1");

      expect(result).toEqual({ threads, total: 1, page: 1, pages: 1 });
    });

    it("applies pagination skip/take", async () => {
      mockPrisma.discussionThread.findMany.mockResolvedValue([]);
      mockPrisma.discussionThread.count.mockResolvedValue(50);

      const result = await getDiscussions("venue", "v1", 3, 10);

      expect(result.pages).toBe(5);
      expect(mockPrisma.discussionThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });
  });

  describe("createThread", () => {
    it("creates a new discussion thread", async () => {
      const thread = { id: "th1", title: "New topic" };
      mockPrisma.discussionThread.create.mockResolvedValue(thread);

      const result = await createThread("u1", "venue", "v1", "New topic", "Body text");

      expect(result).toEqual(thread);
      expect(mockPrisma.discussionThread.create).toHaveBeenCalledWith({
        data: { userId: "u1", entityType: "venue", entityId: "v1", title: "New topic", body: "Body text" },
      });
    });
  });

  describe("getThread", () => {
    it("returns thread with replies", async () => {
      const thread = { id: "th1", replies: [{ id: "r1" }] };
      mockPrisma.discussionThread.findUnique.mockResolvedValue(thread);

      const result = await getThread("th1");

      expect(result).toEqual(thread);
    });

    it("returns null when not found", async () => {
      mockPrisma.discussionThread.findUnique.mockResolvedValue(null);
      const result = await getThread("bad-id");
      expect(result).toBeNull();
    });
  });

  describe("addReply", () => {
    it("creates a reply on a thread", async () => {
      const reply = { id: "r1", threadId: "th1", body: "Great point" };
      mockPrisma.discussionReply.create.mockResolvedValue(reply);

      const result = await addReply("th1", "u1", "Great point");

      expect(result).toEqual(reply);
    });
  });

  /* ── Venue Check-Ins ─────────────────────────────────────────────── */

  describe("getVenueCheckIns", () => {
    it("returns check-in count for venue", async () => {
      mockPrisma.venueCheckIn.count.mockResolvedValue(42);

      const result = await getVenueCheckIns("v1");

      expect(result).toEqual({ venueId: "v1", count: 42, hours: 4 });
    });

    it("uses custom hours", async () => {
      mockPrisma.venueCheckIn.count.mockResolvedValue(5);

      const result = await getVenueCheckIns("v1", 2);

      expect(result.hours).toBe(2);
    });
  });

  describe("checkInToVenue", () => {
    it("creates check-in when none exists recently", async () => {
      mockPrisma.venueCheckIn.findFirst.mockResolvedValue(null);
      const checkIn = { id: "ci1", userId: "u1", venueId: "v1" };
      mockPrisma.venueCheckIn.create.mockResolvedValue(checkIn);

      const result = await checkInToVenue("u1", "v1");

      expect(result).toEqual(checkIn);
    });

    it("throws when user already checked in recently", async () => {
      mockPrisma.venueCheckIn.findFirst.mockResolvedValue({ id: "ci1" });

      await expect(checkInToVenue("u1", "v1")).rejects.toThrow(
        "You already checked in recently"
      );
    });
  });

  /* ── User Clips ──────────────────────────────────────────────────── */

  describe("getClips", () => {
    it("returns paginated clips", async () => {
      const clips = [{ id: "cl1", videoUrl: "http://example.com/v.mp4" }];
      mockPrisma.userClip.findMany.mockResolvedValue(clips);
      mockPrisma.userClip.count.mockResolvedValue(1);

      const result = await getClips();

      expect(result).toEqual({ clips, total: 1, page: 1, pages: 1 });
    });

    it("filters by comedian entity type", async () => {
      mockPrisma.userClip.findMany.mockResolvedValue([]);
      mockPrisma.userClip.count.mockResolvedValue(0);

      await getClips("comedian", "c1");

      expect(mockPrisma.userClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ comedianId: "c1" }),
        })
      );
    });

    it("filters by status", async () => {
      mockPrisma.userClip.findMany.mockResolvedValue([]);
      mockPrisma.userClip.count.mockResolvedValue(0);

      await getClips(undefined, undefined, "approved");

      expect(mockPrisma.userClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "approved" }),
        })
      );
    });
  });

  describe("uploadClip", () => {
    it("creates a clip record", async () => {
      const clip = { id: "cl1", videoUrl: "http://v.mp4" };
      mockPrisma.userClip.create.mockResolvedValue(clip);

      const result = await uploadClip("u1", {
        videoUrl: "http://v.mp4",
        caption: "Funny!",
        comedianId: "c1",
      });

      expect(result).toEqual(clip);
      expect(mockPrisma.userClip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "u1",
          videoUrl: "http://v.mp4",
          caption: "Funny!",
          comedianId: "c1",
        }),
      });
    });
  });

  describe("voteOnClip", () => {
    it("creates a new upvote", async () => {
      mockPrisma.clipVote.findUnique.mockResolvedValue(null);
      mockPrisma.clipVote.create.mockResolvedValue({ id: "v1" });
      mockPrisma.userClip.update.mockResolvedValue({});

      const result = await voteOnClip("cl1", "u1", 1);

      expect(result).toEqual({ action: "voted", vote: 1 });
      expect(mockPrisma.userClip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { upvotes: { increment: 1 } },
        })
      );
    });

    it("removes vote when same vote exists (toggle off)", async () => {
      mockPrisma.clipVote.findUnique.mockResolvedValue({ id: "v1", vote: 1 });
      mockPrisma.clipVote.delete.mockResolvedValue({});
      mockPrisma.userClip.update.mockResolvedValue({});

      const result = await voteOnClip("cl1", "u1", 1);

      expect(result).toEqual({ action: "removed" });
    });

    it("flips vote when opposite vote exists", async () => {
      mockPrisma.clipVote.findUnique.mockResolvedValue({ id: "v1", vote: -1 });
      mockPrisma.clipVote.update.mockResolvedValue({});
      mockPrisma.userClip.update.mockResolvedValue({});

      const result = await voteOnClip("cl1", "u1", 1);

      expect(result).toEqual({ action: "flipped", vote: 1 });
    });
  });

  /* ── Fan Clubs ───────────────────────────────────────────────────── */

  describe("createFanClub", () => {
    it("creates a fan club with creator as admin", async () => {
      const club = { id: "fc1", name: "Dave Fans", _count: { members: 1 } };
      mockPrisma.fanClub.create.mockResolvedValue(club);

      const result = await createFanClub("u1", "Dave Fans", "For Dave fans");

      expect(result).toEqual(club);
      expect(mockPrisma.fanClub.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Dave Fans",
            creatorId: "u1",
            members: { create: { userId: "u1", role: "admin" } },
          }),
        })
      );
    });
  });

  describe("joinFanClub", () => {
    it("joins a fan club when not already a member", async () => {
      mockPrisma.fanClubMember.findUnique.mockResolvedValue(null);
      const member = { id: "m1", clubId: "fc1", userId: "u2" };
      mockPrisma.fanClubMember.create.mockResolvedValue(member);

      const result = await joinFanClub("u2", "fc1");

      expect(result).toEqual(member);
    });

    it("throws when already a member", async () => {
      mockPrisma.fanClubMember.findUnique.mockResolvedValue({ id: "m1" });

      await expect(joinFanClub("u1", "fc1")).rejects.toThrow("Already a member");
    });
  });

  /* ── Polls ───────────────────────────────────────────────────────── */

  describe("createPoll", () => {
    it("creates a poll with stringified options", async () => {
      const poll = { id: "p1", question: "Who's funniest?" };
      mockPrisma.poll.create.mockResolvedValue(poll);

      const result = await createPoll("u1", "venue", "v1", "Who's funniest?", [
        "Dave",
        "Amy",
      ]);

      expect(result).toEqual(poll);
      expect(mockPrisma.poll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          options: JSON.stringify(["Dave", "Amy"]),
        }),
      });
    });
  });

  describe("votePoll", () => {
    it("throws when poll not found", async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(null);
      await expect(votePoll("p1", "u1", 0)).rejects.toThrow("Poll not found");
    });

    it("throws for invalid option index", async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        id: "p1",
        options: JSON.stringify(["A", "B"]),
        expiresAt: null,
      });

      await expect(votePoll("p1", "u1", 5)).rejects.toThrow("Invalid option index");
    });

    it("throws when poll has expired", async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        id: "p1",
        options: JSON.stringify(["A", "B"]),
        expiresAt: new Date("2020-01-01"),
      });

      await expect(votePoll("p1", "u1", 0)).rejects.toThrow("Poll has expired");
    });

    it("creates new vote when not previously voted", async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        id: "p1",
        options: JSON.stringify(["A", "B"]),
        expiresAt: null,
      });
      mockPrisma.pollVote.findUnique.mockResolvedValue(null);
      const vote = { id: "pv1", pollId: "p1", optionIndex: 0 };
      mockPrisma.pollVote.create.mockResolvedValue(vote);

      const result = await votePoll("p1", "u1", 0);

      expect(result).toEqual(vote);
    });

    it("updates existing vote", async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        id: "p1",
        options: JSON.stringify(["A", "B"]),
        expiresAt: null,
      });
      mockPrisma.pollVote.findUnique.mockResolvedValue({ id: "pv1", optionIndex: 0 });
      const updated = { id: "pv1", optionIndex: 1 };
      mockPrisma.pollVote.update.mockResolvedValue(updated);

      const result = await votePoll("p1", "u1", 1);

      expect(result).toEqual(updated);
    });
  });
});
