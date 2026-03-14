import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createClip,
  getClipById,
  getClipFeed,
  getComedianClips,
  engageWithClip,
  removeEngagement,
  getClipEngagementCounts,
  getUserEngagements,
  createDuet,
  getDuets,
  getTrendingBits,
  updateTrendingScores,
  createChallenge,
  getActiveChallenges,
  getChallengeClips,
  getShowPreviews,
  calculateEngagementScore,
} from "./short-clips";

vi.mock("./prisma", () => ({
  prisma: {
    shortClip: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    clipEngagement: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    trendingBit: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    clipChallenge: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  shortClip: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clipEngagement: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  trendingBit: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  clipChallenge: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe("short-clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── createClip ──────────────────────────────────────────────────── */

  describe("createClip", () => {
    it("creates a clip with valid data", async () => {
      const clip = { id: "c1", videoUrl: "https://cdn.example.com/v.mp4", duration: 30 };
      mockPrisma.shortClip.create.mockResolvedValue(clip);

      const result = await createClip({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 30,
        comedianId: "com1",
      });

      expect(result).toEqual(clip);
      expect(mockPrisma.shortClip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          videoUrl: "https://cdn.example.com/v.mp4",
          duration: 30,
          comedianId: "com1",
        }),
      });
    });

    it("rejects clips over 90 seconds", async () => {
      await expect(
        createClip({ videoUrl: "https://cdn.example.com/v.mp4", duration: 91 })
      ).rejects.toThrow("Clip duration cannot exceed 90 seconds");
    });

    it("rejects clips with zero duration", async () => {
      await expect(
        createClip({ videoUrl: "https://cdn.example.com/v.mp4", duration: 0 })
      ).rejects.toThrow("Clip duration must be greater than 0");
    });

    it("rejects clips with negative duration", async () => {
      await expect(
        createClip({ videoUrl: "https://cdn.example.com/v.mp4", duration: -5 })
      ).rejects.toThrow("Clip duration must be greater than 0");
    });

    it("rejects clips with empty videoUrl", async () => {
      await expect(
        createClip({ videoUrl: "  ", duration: 30 })
      ).rejects.toThrow("videoUrl is required");
    });

    it("trims videoUrl whitespace", async () => {
      mockPrisma.shortClip.create.mockResolvedValue({ id: "c1" });

      await createClip({ videoUrl: "  https://cdn.example.com/v.mp4  ", duration: 30 });

      expect(mockPrisma.shortClip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          videoUrl: "https://cdn.example.com/v.mp4",
        }),
      });
    });

    it("accepts exactly 90 seconds", async () => {
      mockPrisma.shortClip.create.mockResolvedValue({ id: "c1", duration: 90 });

      const result = await createClip({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 90,
      });

      expect(result.duration).toBe(90);
    });
  });

  /* ── getClipById ─────────────────────────────────────────────────── */

  describe("getClipById", () => {
    it("returns clip with comedian info", async () => {
      const clip = {
        id: "c1",
        comedian: { id: "com1", name: "Joe Test" },
        event: null,
        parentClip: null,
      };
      mockPrisma.shortClip.findUnique.mockResolvedValue(clip);

      const result = await getClipById("c1");

      expect(result).toEqual(clip);
      expect(mockPrisma.shortClip.findUnique).toHaveBeenCalledWith({
        where: { id: "c1" },
        include: { comedian: true, event: true, parentClip: true },
      });
    });

    it("throws when clip not found", async () => {
      mockPrisma.shortClip.findUnique.mockResolvedValue(null);

      await expect(getClipById("nonexistent")).rejects.toThrow("Clip not found");
    });
  });

  /* ── getClipFeed ─────────────────────────────────────────────────── */

  describe("getClipFeed", () => {
    it("returns paginated feed with defaults", async () => {
      const clips = [{ id: "c1" }, { id: "c2" }];
      mockPrisma.shortClip.findMany.mockResolvedValue(clips);
      mockPrisma.shortClip.count.mockResolvedValue(2);

      const result = await getClipFeed();

      expect(result.clips).toEqual(clips);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("filters by tags", async () => {
      mockPrisma.shortClip.findMany.mockResolvedValue([]);
      mockPrisma.shortClip.count.mockResolvedValue(0);

      await getClipFeed({ tags: ["standup", "improv"] });

      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "active", tags: { hasSome: ["standup", "improv"] } },
        })
      );
    });

    it("sorts by recent", async () => {
      mockPrisma.shortClip.findMany.mockResolvedValue([]);
      mockPrisma.shortClip.count.mockResolvedValue(0);

      await getClipFeed({ sort: "recent" });

      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("sorts by views", async () => {
      mockPrisma.shortClip.findMany.mockResolvedValue([]);
      mockPrisma.shortClip.count.mockResolvedValue(0);

      await getClipFeed({ sort: "views" });

      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: "desc" },
        })
      );
    });

    it("paginates correctly", async () => {
      mockPrisma.shortClip.findMany.mockResolvedValue([]);
      mockPrisma.shortClip.count.mockResolvedValue(50);

      await getClipFeed({ page: 3, pageSize: 10 });

      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });
  });

  /* ── getComedianClips ────────────────────────────────────────────── */

  describe("getComedianClips", () => {
    it("returns clips for a comedian", async () => {
      const clips = [{ id: "c1", comedianId: "com1" }];
      mockPrisma.shortClip.findMany.mockResolvedValue(clips);
      mockPrisma.shortClip.count.mockResolvedValue(1);

      const result = await getComedianClips("com1");

      expect(result.clips).toEqual(clips);
      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { comedianId: "com1", status: "active" },
        })
      );
    });
  });

  /* ── engageWithClip ──────────────────────────────────────────────── */

  describe("engageWithClip", () => {
    it("creates a like engagement and increments count", async () => {
      const engagement = { id: "e1", clipId: "c1", userId: "u1", type: "like" };
      mockPrisma.clipEngagement.create.mockResolvedValue(engagement);
      mockPrisma.shortClip.update.mockResolvedValue({});

      const result = await engageWithClip("c1", "u1", "like");

      expect(result).toEqual(engagement);
      expect(mockPrisma.clipEngagement.create).toHaveBeenCalledWith({
        data: { clipId: "c1", userId: "u1", type: "like" },
      });
      expect(mockPrisma.shortClip.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { likeCount: { increment: 1 } },
      });
    });

    it("creates a save engagement without incrementing count", async () => {
      const engagement = { id: "e2", clipId: "c1", userId: "u1", type: "save" };
      mockPrisma.clipEngagement.create.mockResolvedValue(engagement);

      await engageWithClip("c1", "u1", "save");

      expect(mockPrisma.shortClip.update).not.toHaveBeenCalled();
    });

    it("rejects invalid engagement type", async () => {
      await expect(
        engageWithClip("c1", "u1", "invalid")
      ).rejects.toThrow("Invalid engagement type: invalid");
    });
  });

  /* ── removeEngagement ────────────────────────────────────────────── */

  describe("removeEngagement", () => {
    it("removes engagement and decrements count", async () => {
      const engagement = { id: "e1", clipId: "c1", userId: "u1", type: "like" };
      mockPrisma.clipEngagement.findUnique.mockResolvedValue(engagement);
      mockPrisma.clipEngagement.delete.mockResolvedValue(engagement);
      mockPrisma.shortClip.update.mockResolvedValue({});

      const result = await removeEngagement("c1", "u1", "like");

      expect(result).toEqual({ removed: true });
      expect(mockPrisma.clipEngagement.delete).toHaveBeenCalledWith({
        where: { id: "e1" },
      });
      expect(mockPrisma.shortClip.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { likeCount: { decrement: 1 } },
      });
    });

    it("throws when engagement not found", async () => {
      mockPrisma.clipEngagement.findUnique.mockResolvedValue(null);

      await expect(
        removeEngagement("c1", "u1", "like")
      ).rejects.toThrow("Engagement not found");
    });
  });

  /* ── getClipEngagementCounts ─────────────────────────────────────── */

  describe("getClipEngagementCounts", () => {
    it("returns counts per type", async () => {
      mockPrisma.clipEngagement.groupBy.mockResolvedValue([
        { type: "like", _count: { type: 5 } },
        { type: "share", _count: { type: 2 } },
      ]);

      const result = await getClipEngagementCounts("c1");

      expect(result).toEqual({ like: 5, share: 2, save: 0, report: 0 });
    });

    it("returns zeroes when no engagements", async () => {
      mockPrisma.clipEngagement.groupBy.mockResolvedValue([]);

      const result = await getClipEngagementCounts("c1");

      expect(result).toEqual({ like: 0, share: 0, save: 0, report: 0 });
    });
  });

  /* ── getUserEngagements ──────────────────────────────────────────── */

  describe("getUserEngagements", () => {
    it("returns user actions for a clip", async () => {
      mockPrisma.clipEngagement.findMany.mockResolvedValue([
        { type: "like" },
        { type: "save" },
      ]);

      const result = await getUserEngagements("u1", "c1");

      expect(result).toEqual(["like", "save"]);
    });
  });

  /* ── createDuet ──────────────────────────────────────────────────── */

  describe("createDuet", () => {
    it("creates a duet linked to parent clip", async () => {
      mockPrisma.shortClip.findUnique.mockResolvedValue({ id: "parent1" });
      mockPrisma.shortClip.create.mockResolvedValue({
        id: "duet1",
        parentClipId: "parent1",
      });

      const result = await createDuet("parent1", {
        videoUrl: "https://cdn.example.com/duet.mp4",
        duration: 45,
      });

      expect(result.parentClipId).toBe("parent1");
      expect(mockPrisma.shortClip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentClipId: "parent1" }),
      });
    });

    it("throws when parent clip not found", async () => {
      mockPrisma.shortClip.findUnique.mockResolvedValue(null);

      await expect(
        createDuet("nonexistent", {
          videoUrl: "https://cdn.example.com/d.mp4",
          duration: 30,
        })
      ).rejects.toThrow("Parent clip not found");
    });

    it("rejects duet over 90 seconds", async () => {
      mockPrisma.shortClip.findUnique.mockResolvedValue({ id: "parent1" });

      await expect(
        createDuet("parent1", {
          videoUrl: "https://cdn.example.com/d.mp4",
          duration: 100,
        })
      ).rejects.toThrow("Clip duration cannot exceed 90 seconds");
    });
  });

  /* ── getDuets ────────────────────────────────────────────────────── */

  describe("getDuets", () => {
    it("returns duets for a clip", async () => {
      const duets = [{ id: "d1", parentClipId: "c1" }];
      mockPrisma.shortClip.findMany.mockResolvedValue(duets);

      const result = await getDuets("c1");

      expect(result).toEqual(duets);
      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith({
        where: { parentClipId: "c1", status: "active" },
        orderBy: { createdAt: "desc" },
        include: { comedian: true },
      });
    });
  });

  /* ── getTrendingBits ─────────────────────────────────────────────── */

  describe("getTrendingBits", () => {
    it("returns trending tags sorted by score", async () => {
      const bits = [
        { id: "t1", tag: "standup", score: 100 },
        { id: "t2", tag: "improv", score: 50 },
      ];
      mockPrisma.trendingBit.findMany.mockResolvedValue(bits);

      const result = await getTrendingBits(10);

      expect(result).toEqual(bits);
      expect(mockPrisma.trendingBit.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { score: "desc" },
        take: 10,
      });
    });

    it("uses default limit of 10", async () => {
      mockPrisma.trendingBit.findMany.mockResolvedValue([]);

      await getTrendingBits();

      expect(mockPrisma.trendingBit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  /* ── updateTrendingScores ────────────────────────────────────────── */

  describe("updateTrendingScores", () => {
    it("recalculates scores with time decay", async () => {
      const now = Date.now();
      const bits = [
        {
          id: "t1",
          tag: "standup",
          clipCount: 10,
          viewCount: 1000,
          score: 50,
          updatedAt: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
          peakDate: null,
        },
      ];
      mockPrisma.trendingBit.findMany.mockResolvedValue(bits);
      mockPrisma.trendingBit.update.mockResolvedValue({});

      await updateTrendingScores();

      expect(mockPrisma.trendingBit.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.trendingBit.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: expect.objectContaining({
          score: expect.any(Number),
        }),
      });
    });
  });

  /* ── createChallenge ─────────────────────────────────────────────── */

  describe("createChallenge", () => {
    it("creates a challenge with valid dates", async () => {
      const challenge = {
        id: "ch1",
        title: "Best Punchline",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-08"),
      };
      mockPrisma.clipChallenge.create.mockResolvedValue(challenge);

      const result = await createChallenge({
        title: "Best Punchline",
        description: "Submit your best punchline",
        promptText: "Tell us your best punchline!",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-08"),
      });

      expect(result).toEqual(challenge);
    });

    it("rejects when end date is before start date", async () => {
      await expect(
        createChallenge({
          title: "Bad Challenge",
          description: "Invalid",
          promptText: "Invalid",
          startDate: new Date("2025-01-08"),
          endDate: new Date("2025-01-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("rejects when end date equals start date", async () => {
      const date = new Date("2025-01-01");
      await expect(
        createChallenge({
          title: "Bad Challenge",
          description: "Invalid",
          promptText: "Invalid",
          startDate: date,
          endDate: date,
        })
      ).rejects.toThrow("End date must be after start date");
    });
  });

  /* ── getActiveChallenges ─────────────────────────────────────────── */

  describe("getActiveChallenges", () => {
    it("returns active challenges not yet ended", async () => {
      const challenges = [{ id: "ch1", isActive: true }];
      mockPrisma.clipChallenge.findMany.mockResolvedValue(challenges);

      const result = await getActiveChallenges();

      expect(result).toEqual(challenges);
      expect(mockPrisma.clipChallenge.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          endDate: { gte: expect.any(Date) },
        },
        orderBy: { endDate: "asc" },
      });
    });
  });

  /* ── getChallengeClips ───────────────────────────────────────────── */

  describe("getChallengeClips", () => {
    it("returns clips matching challenge", async () => {
      const challenge = {
        id: "ch1",
        title: "Best Punchline",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-08"),
      };
      mockPrisma.clipChallenge.findUnique.mockResolvedValue(challenge);
      mockPrisma.shortClip.findMany.mockResolvedValue([{ id: "c1" }]);

      const result = await getChallengeClips("ch1");

      expect(result).toEqual([{ id: "c1" }]);
      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith({
        where: {
          status: "active",
          tags: { has: "Best Punchline" },
          createdAt: {
            gte: challenge.startDate,
            lte: challenge.endDate,
          },
        },
        orderBy: { likeCount: "desc" },
        include: { comedian: true },
      });
    });

    it("throws when challenge not found", async () => {
      mockPrisma.clipChallenge.findUnique.mockResolvedValue(null);

      await expect(getChallengeClips("nonexistent")).rejects.toThrow(
        "Challenge not found"
      );
    });
  });

  /* ── getShowPreviews ─────────────────────────────────────────────── */

  describe("getShowPreviews", () => {
    it("returns preview clips for an event", async () => {
      const previews = [{ id: "c1", isPreview: true, eventId: "e1" }];
      mockPrisma.shortClip.findMany.mockResolvedValue(previews);

      const result = await getShowPreviews("e1");

      expect(result).toEqual(previews);
      expect(mockPrisma.shortClip.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1", isPreview: true, status: "active" },
        orderBy: { createdAt: "desc" },
        include: { comedian: true },
      });
    });
  });

  /* ── calculateEngagementScore ────────────────────────────────────── */

  describe("calculateEngagementScore", () => {
    it("computes weighted score", () => {
      const score = calculateEngagementScore({
        viewCount: 1000,
        likeCount: 50,
        shareCount: 10,
        commentCount: 20,
      });

      // 1000*0.1 + 50*1 + 10*3 + 20*1.5 = 100 + 50 + 30 + 30 = 210
      expect(score).toBe(210);
    });

    it("returns 0 for zeroed clip", () => {
      const score = calculateEngagementScore({
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        commentCount: 0,
      });

      expect(score).toBe(0);
    });
  });
});
