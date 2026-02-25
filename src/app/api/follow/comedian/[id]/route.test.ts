import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedian: { findUnique: vi.fn() },
    comedianFollow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  comedian: { findUnique: ReturnType<typeof vi.fn> };
  comedianFollow: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/follow/comedian/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    mockPrisma.comedian.findUnique.mockResolvedValue({
      id: "comedian-1",
      name: "Test Comedian",
    });
    mockPrisma.comedianFollow.findUnique.mockResolvedValue(null);
    mockPrisma.comedianFollow.create.mockResolvedValue({} as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(new Request("http://test"), createContext("comedian-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when id is missing", async () => {
    const res = await POST(new Request("http://test"), createContext(""));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing comedian ID");
  });

  it("returns 404 when comedian not found", async () => {
    mockPrisma.comedian.findUnique.mockResolvedValue(null);

    const res = await POST(new Request("http://test"), createContext("bad-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Comedian not found");
  });

  it("creates follow and returns following: true when not following", async () => {
    const res = await POST(new Request("http://test"), createContext("comedian-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.following).toBe(true);
    expect(mockPrisma.comedianFollow.create).toHaveBeenCalledWith({
      data: { userId: "user-1", comedianId: "comedian-1" },
    });
  });

  it("deletes follow and returns following: false when already following", async () => {
    mockPrisma.comedianFollow.findUnique.mockResolvedValue({
      id: "follow-1",
      userId: "user-1",
      comedianId: "comedian-1",
    });
    mockPrisma.comedianFollow.delete.mockResolvedValue({} as never);

    const res = await POST(new Request("http://test"), createContext("comedian-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.following).toBe(false);
    expect(mockPrisma.comedianFollow.delete).toHaveBeenCalledWith({
      where: { id: "follow-1" },
    });
  });
});
