import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    poll: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/community", () => ({
  createPoll: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createPoll } from "@/lib/community";

const mockPrisma = prisma as unknown as {
  poll: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when entityType or entityId missing", async () => {
    const res = await GET(new Request("http://test/api/polls"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("entityType and entityId are required");
  });

  it("returns polls for entity", async () => {
    mockPrisma.poll.findMany.mockResolvedValue([
      {
        id: "p1",
        entityType: "comedian",
        entityId: "c1",
        userId: "user-1",
        question: "Best set?",
        options: JSON.stringify(["Set A", "Set B"]),
        votes: [
          { optionIndex: 0 },
          { optionIndex: 0 },
          { optionIndex: 1 },
        ],
        _count: { votes: 3 },
        expiresAt: null,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const res = await GET(
      new Request("http://test/api/polls?entityType=comedian&entityId=c1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.polls).toHaveLength(1);
    expect(data.polls[0].question).toBe("Best set?");
    expect(data.polls[0].options).toEqual(["Set A", "Set B"]);
    expect(data.polls[0].tallies).toEqual([2, 1]);
    expect(data.polls[0].totalVotes).toBe(3);
  });

  it("returns 500 when database fails", async () => {
    mockPrisma.poll.findMany.mockRejectedValue(new Error("DB error"));

    const res = await GET(
      new Request("http://test/api/polls?entityType=comedian&entityId=c1")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to load polls");
  });
});

describe("POST /api/polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(
      new Request("http://test/api/polls", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("returns 400 for missing required fields", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const res = await POST(
      new Request("http://test/api/polls", {
        method: "POST",
        body: JSON.stringify({ entityType: "comedian" }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("entityType, entityId, and question are required");
  });

  it("returns 400 when less than 2 options", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const res = await POST(
      new Request("http://test/api/polls", {
        method: "POST",
        body: JSON.stringify({
          entityType: "comedian",
          entityId: "c1",
          question: "Best set?",
          options: ["Only one"],
        }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least 2 options are required");
  });

  it("creates a poll successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    const mockPoll = { id: "p1", question: "Best set?" };
    vi.mocked(createPoll).mockResolvedValue(mockPoll as never);

    const res = await POST(
      new Request("http://test/api/polls", {
        method: "POST",
        body: JSON.stringify({
          entityType: "comedian",
          entityId: "c1",
          question: "Best set?",
          options: ["Set A", "Set B"],
        }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(mockPoll);
    expect(createPoll).toHaveBeenCalledWith(
      "user-1",
      "comedian",
      "c1",
      "Best set?",
      ["Set A", "Set B"],
      undefined
    );
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const res = await POST(
      new Request("http://test/api/polls", {
        method: "POST",
        body: "not json",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON");
  });
});
