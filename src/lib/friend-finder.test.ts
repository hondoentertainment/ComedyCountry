import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchUsers,
  findByUsername,
  generateInviteLink,
  importContacts,
  getFriendSuggestions,
} from "./friend-finder";

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    friendConnection: {
      findMany: vi.fn(),
    },
    eventAttendance: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  user: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  notification: {
    create: ReturnType<typeof vi.fn>;
  };
  friendConnection: {
    findMany: ReturnType<typeof vi.fn>;
  };
  eventAttendance: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("friend-finder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchUsers", () => {
    it("searches by name, username, or profileName", async () => {
      const users = [
        {
          id: "u1",
          name: "John Doe",
          profileName: null,
          username: "johnd",
          image: null,
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await searchUsers("john");
      expect(result).toEqual(users);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it("excludes a specific user when excludeUserId is provided", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await searchUsers("john", { excludeUserId: "u1" });
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: { not: "u1" } }),
        ])
      );
    });

    it("throws for queries shorter than 2 chars", async () => {
      await expect(searchUsers("a")).rejects.toThrow(
        "Search query must be at least 2 characters"
      );
    });

    it("throws for empty query", async () => {
      await expect(searchUsers("")).rejects.toThrow(
        "Search query must be at least 2 characters"
      );
    });

    it("respects limit option", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await searchUsers("test", { limit: 5 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe("findByUsername", () => {
    it("returns user for existing username", async () => {
      const user = {
        id: "u1",
        name: "Jane",
        profileName: null,
        username: "jane",
        image: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await findByUsername("jane");
      expect(result).toEqual(user);
    });

    it("returns null for non-existent username", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await findByUsername("nobody");
      expect(result).toBeNull();
    });

    it("throws for empty username", async () => {
      await expect(findByUsername("")).rejects.toThrow("Username is required");
    });
  });

  describe("generateInviteLink", () => {
    it("generates a token and creates a notification", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        name: "Alice",
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await generateInviteLink("u1");
      expect(result.token).toBeTruthy();
      expect(result.token.length).toBe(32); // 16 bytes hex = 32 chars
      expect(result.url).toContain("/invite/");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u1",
            type: "friend_invite",
          }),
        })
      );
    });

    it("throws if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(generateInviteLink("bogus")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("importContacts", () => {
    it("finds matching users and marks friendship status", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "u2",
          name: "Bob",
          profileName: null,
          username: "bob",
          image: null,
          email: "bob@example.com",
        },
      ]);

      mockPrisma.friendConnection.findMany.mockResolvedValue([
        { userId: "u1", friendId: "u2" },
      ]);

      const result = await importContacts("u1", [
        "bob@example.com",
        "unknown@example.com",
      ]);

      expect(result.found).toHaveLength(1);
      expect(result.found[0].email).toBe("bob@example.com");
      expect(result.found[0].alreadyFriends).toBe(true);
      expect(result.notFound).toEqual(["unknown@example.com"]);
    });

    it("returns empty results for empty email list", async () => {
      const result = await importContacts("u1", []);
      expect(result.found).toEqual([]);
      expect(result.notFound).toEqual([]);
    });

    it("normalizes and deduplicates emails", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.friendConnection.findMany.mockResolvedValue([]);

      const result = await importContacts("u1", [
        "Test@Example.com",
        "test@example.com",
        " TEST@EXAMPLE.COM ",
      ]);

      // Should query with a single deduplicated email
      const queryEmails =
        mockPrisma.user.findMany.mock.calls[0][0].where.email.in;
      expect(queryEmails).toEqual(["test@example.com"]);
      expect(result.notFound).toEqual(["test@example.com"]);
    });
  });

  describe("getFriendSuggestions", () => {
    it("suggests friends-of-friends when user has friends", async () => {
      // User's friends
      mockPrisma.friendConnection.findMany
        .mockResolvedValueOnce([
          { userId: "u1", friendId: "u2" },
          { userId: "u3", friendId: "u1" },
        ])
        // Friends of friends
        .mockResolvedValueOnce([
          { userId: "u2", friendId: "u4" },
          { userId: "u3", friendId: "u4" },
          { userId: "u2", friendId: "u5" },
        ]);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u4", name: "Suggested A", profileName: null, username: "suga", image: null },
        { id: "u5", name: "Suggested B", profileName: null, username: "sugb", image: null },
      ]);

      const result = await getFriendSuggestions("u1");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reason).toBe("mutual_friends");
    });

    it("falls back to shared events when user has no friends", async () => {
      // No friends
      mockPrisma.friendConnection.findMany.mockResolvedValueOnce([]);

      // User's event attendances
      mockPrisma.eventAttendance.findMany
        .mockResolvedValueOnce([{ eventId: "e1" }, { eventId: "e2" }])
        .mockResolvedValueOnce([
          { userId: "u3" },
          { userId: "u3" },
          { userId: "u4" },
        ]);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u3", name: "Co-attendee", profileName: null, username: "co", image: null },
      ]);

      const result = await getFriendSuggestions("u1");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reason).toBe("shared_events");
    });

    it("returns empty array when no events either", async () => {
      mockPrisma.friendConnection.findMany.mockResolvedValueOnce([]);
      mockPrisma.eventAttendance.findMany.mockResolvedValueOnce([]);

      const result = await getFriendSuggestions("u1");
      expect(result).toEqual([]);
    });
  });
});
