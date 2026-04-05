import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  moderateText,
  scoreMediaContent,
  getAutoModerationRules,
  addAutoModerationRule,
  removeAutoModerationRule,
  applyAutoModerationRules,
  resetAutoModerationRules,
  addToModerationQueue,
  getModerationQueue,
  reviewModerationItem,
  getUserStrikes,
  issueStrike,
  removeStrike,
  moderateContent,
} from "./content-moderation";

vi.mock("./prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  analyticsEvent: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  user: {
    update: ReturnType<typeof vi.fn>;
  };
};

describe("content-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAutoModerationRules();
  });

  // ---------------------------------------------------------------------------
  // Text Moderation
  // ---------------------------------------------------------------------------

  describe("moderateText", () => {
    it("approves clean text", () => {
      const result = moderateText("This is a great comedy show!");

      expect(result.verdict).toBe("APPROVED");
      expect(result.categories).toContain("clean");
      expect(result.score).toBe(0);
      expect(result.flaggedTerms).toHaveLength(0);
    });

    it("flags profanity", () => {
      const result = moderateText("That was a damn funny show");

      expect(result.verdict).toBe("FLAGGED");
      expect(result.categories).toContain("profanity");
      expect(result.score).toBeGreaterThanOrEqual(0.5);
      expect(result.flaggedTerms.length).toBeGreaterThan(0);
    });

    it("rejects hate speech", () => {
      const result = moderateText("death to everyone");

      expect(result.verdict).toBe("REJECTED");
      expect(result.categories).toContain("hate_speech");
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it("rejects harassment", () => {
      const result = moderateText("kys right now");

      expect(result.verdict).toBe("REJECTED");
      expect(result.categories).toContain("harassment");
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it("detects spam", () => {
      const result = moderateText("Buy now! Make $5000 per day from home!");

      expect(result.verdict).toBe("FLAGGED");
      expect(result.categories).toContain("spam");
    });

    it("detects multiple spam links", () => {
      const result = moderateText(
        "Check http://spam1.com/a and http://spam2.com/b and http://spam3.com/c now",
      );

      expect(result.categories).toContain("spam");
      expect(result.score).toBeGreaterThanOrEqual(0.7);
    });

    it("handles empty input", () => {
      const result = moderateText("");

      expect(result.verdict).toBe("APPROVED");
      expect(result.score).toBe(0);
    });

    it("detects multiple categories simultaneously", () => {
      const result = moderateText("fuck you, death to all");

      expect(result.categories).toContain("profanity");
      expect(result.categories).toContain("hate_speech");
      expect(result.verdict).toBe("REJECTED");
    });
  });

  // ---------------------------------------------------------------------------
  // Media Moderation Scoring
  // ---------------------------------------------------------------------------

  describe("scoreMediaContent", () => {
    it("approves valid video file", () => {
      const result = scoreMediaContent({
        fileName: "standup-set.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 50 * 1024 * 1024,
        durationSeconds: 600,
      });

      expect(result.verdict).toBe("APPROVED");
      expect(result.score).toBe(0);
    });

    it("approves valid image file", () => {
      const result = scoreMediaContent({
        fileName: "headshot.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 2 * 1024 * 1024,
      });

      expect(result.verdict).toBe("APPROVED");
    });

    it("rejects unsupported format", () => {
      const result = scoreMediaContent({
        fileName: "file.exe",
        mimeType: "application/x-msdownload",
        fileSizeBytes: 1024,
      });

      expect(result.verdict).toBe("REJECTED");
      expect(result.categories).toContain("unsupported_format");
    });

    it("flags oversized video file", () => {
      const result = scoreMediaContent({
        mimeType: "video/mp4",
        fileSizeBytes: 600 * 1024 * 1024, // 600MB
      });

      expect(result.verdict).toBe("FLAGGED");
      expect(result.categories).toContain("oversized_file");
    });

    it("flags oversized image file", () => {
      const result = scoreMediaContent({
        mimeType: "image/png",
        fileSizeBytes: 15 * 1024 * 1024, // 15MB
      });

      expect(result.verdict).toBe("FLAGGED");
      expect(result.categories).toContain("oversized_file");
    });

    it("flags excessive video duration", () => {
      const result = scoreMediaContent({
        mimeType: "video/mp4",
        fileSizeBytes: 100 * 1024 * 1024,
        durationSeconds: 3600, // 1 hour
      });

      expect(result.verdict).toBe("FLAGGED");
      expect(result.categories).toContain("excessive_duration");
    });

    it("checks title and description for inappropriate content", () => {
      const result = scoreMediaContent({
        mimeType: "video/mp4",
        fileSizeBytes: 10 * 1024 * 1024,
        title: "death to everyone",
      });

      expect(result.verdict).toBe("REJECTED");
      expect(result.categories).toContain("hate_speech");
    });

    it("handles empty metadata", () => {
      const result = scoreMediaContent({});

      expect(result.verdict).toBe("APPROVED");
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-Moderation Rules
  // ---------------------------------------------------------------------------

  describe("auto-moderation rules", () => {
    it("returns default rules sorted by priority", () => {
      const rules = getAutoModerationRules();

      expect(rules.length).toBeGreaterThanOrEqual(3);
      expect(rules[0].priority).toBeLessThanOrEqual(rules[1].priority);
    });

    it("adds a new rule", () => {
      const rule = addAutoModerationRule({
        name: "Test rule",
        pattern: "\\btest\\b",
        action: "flag",
        category: "spam",
        enabled: true,
        priority: 10,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe("Test rule");

      const rules = getAutoModerationRules();
      expect(rules.find((r) => r.id === rule.id)).toBeDefined();
    });

    it("removes a rule", () => {
      const rules = getAutoModerationRules();
      const ruleId = rules[0].id;

      const removed = removeAutoModerationRule(ruleId);

      expect(removed).toBe(true);
      expect(getAutoModerationRules().find((r) => r.id === ruleId)).toBeUndefined();
    });

    it("returns false when removing non-existent rule", () => {
      const removed = removeAutoModerationRule("non-existent");

      expect(removed).toBe(false);
    });

    it("applies rules to text", () => {
      const result = applyAutoModerationRules("death to everyone");

      expect(result.action).toBe("reject");
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it("returns approve for clean text", () => {
      const result = applyAutoModerationRules("Great comedy show tonight!");

      expect(result.action).toBe("approve");
      expect(result.matchedRules).toHaveLength(0);
    });

    it("flags profanity based on rules", () => {
      const result = applyAutoModerationRules("What the fuck");

      expect(result.action).toBe("flag");
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it("skips disabled rules", () => {
      resetAutoModerationRules();
      const rules = getAutoModerationRules();
      // Remove all rules and add one disabled rule
      for (const r of rules) removeAutoModerationRule(r.id);

      addAutoModerationRule({
        name: "Disabled",
        pattern: ".*",
        action: "reject",
        category: "spam",
        enabled: false,
        priority: 0,
      });

      const result = applyAutoModerationRules("anything");

      expect(result.action).toBe("approve");
    });
  });

  // ---------------------------------------------------------------------------
  // Moderation Queue
  // ---------------------------------------------------------------------------

  describe("moderation queue", () => {
    it("adds item to moderation queue", async () => {
      const created = {
        id: "mq1",
        eventType: "moderation_queue",
        entityType: "comment",
        entityId: "c1",
        userId: "u1",
        metadata: { reason: "Profanity", status: "PENDING_REVIEW" },
        createdAt: new Date(),
      };
      mockPrisma.analyticsEvent.create.mockResolvedValue(created);

      const result = await addToModerationQueue({
        contentType: "comment",
        contentId: "c1",
        userId: "u1",
        reason: "Profanity",
      });

      expect(result.id).toBe("mq1");
      expect(result.status).toBe("PENDING_REVIEW");
      expect(result.contentType).toBe("comment");
    });

    it("retrieves moderation queue", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        {
          id: "mq1",
          entityType: "comment",
          entityId: "c1",
          userId: "u1",
          metadata: { reason: "Spam", status: "PENDING_REVIEW" },
          createdAt: new Date(),
        },
      ]);

      const result = await getModerationQueue();

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe("Spam");
    });

    it("filters queue by status", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      await getModerationQueue("FLAGGED");

      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: "moderation_queue",
            metadata: { path: ["status"], equals: "FLAGGED" },
          }),
        }),
      );
    });

    it("reviews a moderation item", async () => {
      mockPrisma.analyticsEvent.update.mockResolvedValue({
        id: "mq1",
        entityType: "comment",
        entityId: "c1",
        userId: "u1",
        metadata: {
          status: "APPROVED",
          reviewedAt: new Date().toISOString(),
          reviewedBy: "admin1",
        },
        createdAt: new Date(),
      });

      const result = await reviewModerationItem("mq1", "APPROVED", "admin1");

      expect(result.status).toBe("APPROVED");
      expect(result.reviewedBy).toBe("admin1");
    });
  });

  // ---------------------------------------------------------------------------
  // 3-Strike System
  // ---------------------------------------------------------------------------

  describe("3-strike system", () => {
    it("returns zero strikes for clean user", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await getUserStrikes("u1");

      expect(result.strikes).toBe(0);
      expect(result.banned).toBe(false);
      expect(result.lastStrikeAt).toBeNull();
    });

    it("tracks strike history", async () => {
      const date = new Date();
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        {
          metadata: { reason: "Profanity", category: "profanity" },
          createdAt: date,
        },
      ]);

      const result = await getUserStrikes("u1");

      expect(result.strikes).toBe(1);
      expect(result.banned).toBe(false);
      expect(result.strikeHistory).toHaveLength(1);
      expect(result.strikeHistory[0].reason).toBe("Profanity");
    });

    it("issues a strike", async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({
        id: "strike1",
      });
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        {
          metadata: { reason: "Hate speech", category: "hate_speech" },
          createdAt: new Date(),
        },
      ]);

      const result = await issueStrike("u1", "Hate speech", "hate_speech");

      expect(result.strikes).toBe(1);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "moderation_strike",
            userId: "u1",
          }),
        }),
      );
    });

    it("auto-bans user at 3 strikes", async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "s3" });
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { metadata: { reason: "r1", category: "profanity" }, createdAt: new Date() },
        { metadata: { reason: "r2", category: "spam" }, createdAt: new Date() },
        { metadata: { reason: "r3", category: "hate_speech" }, createdAt: new Date() },
      ]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await issueStrike("u1", "Final warning", "hate_speech");

      expect(result.strikes).toBe(3);
      expect(result.banned).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { role: "BANNED" },
      });
    });

    it("removes a strike", async () => {
      mockPrisma.analyticsEvent.delete.mockResolvedValue({});
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await removeStrike("u1", "strike1");

      expect(result.strikes).toBe(0);
      expect(mockPrisma.analyticsEvent.delete).toHaveBeenCalledWith({
        where: { id: "strike1" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Full Moderation Pipeline
  // ---------------------------------------------------------------------------

  describe("moderateContent", () => {
    it("approves clean content", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]); // no strikes

      const result = await moderateContent({
        text: "Great show!",
        userId: "u1",
        contentType: "comment",
        contentId: "c1",
      });

      expect(result.allowed).toBe(true);
      expect(result.verdict).toBe("APPROVED");
      expect(result.userStrikes.strikes).toBe(0);
    });

    it("rejects content from banned user", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { metadata: { reason: "r1", category: "profanity" }, createdAt: new Date() },
        { metadata: { reason: "r2", category: "spam" }, createdAt: new Date() },
        { metadata: { reason: "r3", category: "hate_speech" }, createdAt: new Date() },
      ]);

      const result = await moderateContent({
        text: "Hello",
        userId: "u1",
        contentType: "comment",
        contentId: "c1",
      });

      expect(result.allowed).toBe(false);
      expect(result.verdict).toBe("REJECTED");
    });

    it("flags profane content and adds to queue", async () => {
      // First call: getUserStrikes (no strikes)
      // Second call: getUserStrikes again after potential strike
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrisma.analyticsEvent.create.mockResolvedValue({
        id: "mq1",
        eventType: "moderation_queue",
        entityType: "comment",
        entityId: "c1",
        userId: "u1",
        metadata: { reason: "test", status: "PENDING_REVIEW" },
        createdAt: new Date(),
      });

      const result = await moderateContent({
        text: "That was a damn joke",
        userId: "u1",
        contentType: "comment",
        contentId: "c1",
      });

      expect(result.verdict).toBe("FLAGGED");
      expect(result.allowed).toBe(false);
      expect(result.textResult?.categories).toContain("profanity");
    });

    it("runs full pipeline with media moderation", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await moderateContent({
        media: {
          mimeType: "video/mp4",
          fileSizeBytes: 10 * 1024 * 1024,
          durationSeconds: 300,
          title: "Funny set",
        },
        userId: "u1",
        contentType: "video",
        contentId: "v1",
      });

      expect(result.allowed).toBe(true);
      expect(result.mediaResult?.verdict).toBe("APPROVED");
    });

    it("rejects hate speech and issues strike", async () => {
      // getUserStrikes returns 0 initially
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrisma.analyticsEvent.create.mockResolvedValue({
        id: "ev1",
        eventType: "moderation_queue",
        entityType: "comment",
        entityId: "c1",
        userId: "u1",
        metadata: {},
        createdAt: new Date(),
      });

      const result = await moderateContent({
        text: "death to everyone",
        userId: "u1",
        contentType: "comment",
        contentId: "c1",
      });

      expect(result.allowed).toBe(false);
      expect(result.verdict).toBe("REJECTED");
      // Should have created both queue entry and strike
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalled();
    });
  });
});
