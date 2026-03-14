import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedyList: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  comedyList: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public lists when no userId", async () => {
    const mockLists = [{ id: "l1", title: "Best Comics", isPublic: true }];
    mockPrisma.comedyList.findMany.mockResolvedValue(mockLists);

    const res = await GET(new Request("http://test/api/lists"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lists).toEqual(mockLists);
    expect(mockPrisma.comedyList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublic: true },
      })
    );
  });

  it("returns user lists when userId provided", async () => {
    const mockLists = [{ id: "l1", title: "My List", userId: "user-1" }];
    mockPrisma.comedyList.findMany.mockResolvedValue(mockLists);

    const res = await GET(new Request("http://test/api/lists?userId=user-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lists).toEqual(mockLists);
    expect(mockPrisma.comedyList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });
});

describe("POST /api/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(
      new Request("http://test/api/lists", {
        method: "POST",
        body: JSON.stringify({ title: "My List" }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("returns 400 when title is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const res = await POST(
      new Request("http://test/api/lists", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Title is required");
  });

  it("creates a new list", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    const created = { id: "l1", userId: "user-1", title: "My List", isPublic: true };
    mockPrisma.comedyList.create.mockResolvedValue(created);

    const res = await POST(
      new Request("http://test/api/lists", {
        method: "POST",
        body: JSON.stringify({ title: "My List", description: "A great list" }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockPrisma.comedyList.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        title: "My List",
        description: "A great list",
        isPublic: true,
      },
    });
  });
});
