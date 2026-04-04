import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 5 }),
  getRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

import { prisma } from "@/lib/prisma";
import { resetRateLimitStore } from "@/lib/api";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

async function postRegister(body: object) {
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(
      (args: { data: { username: string } }) =>
        Promise.resolve({
          id: "user-1",
          username: args.data.username,
          name: args.data.username,
          passwordHash: "hashed-password",
        }),
    );
  });

  it("returns 400 when username is missing", async () => {
    const res = await postRegister({ password: "password123" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Username and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await postRegister({ username: "testuser" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Username and password are required");
  });

  it("returns 400 when username is too short", async () => {
    const res = await postRegister({ username: "ab", password: "password123" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Username must be at least 3 characters");
  });

  it("returns 400 when username is too long", async () => {
    const longUsername = "a".repeat(33);
    const res = await postRegister({
      username: longUsername,
      password: "password123",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Username must be at most 32 characters");
  });

  it("returns 400 when username contains invalid characters", async () => {
    const res = await postRegister({
      username: "test@user",
      password: "password123",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      "Username can only contain letters, numbers, periods, underscores, and hyphens",
    );
  });

  it("accepts underscores and hyphens in username", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await postRegister({
      username: "test_user-name",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: "test_user-name",
      }),
    });
  });

  it("returns 400 when password is too short", async () => {
    const res = await postRegister({
      username: "testuser",
      password: "short",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Password must be at least 8 characters");
  });

  it("returns 409 when username is already taken", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user",
      username: "testuser",
    });

    const res = await postRegister({
      username: "testuser",
      password: "password123",
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Username is already taken");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("normalizes username to lowercase", async () => {
    const res = await postRegister({
      username: "TestUser",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: "testuser",
        name: "testuser",
      }),
    });
  });

  it("returns 200 and user data on success", async () => {
    const res = await postRegister({
      username: "newuser",
      password: "securepass123",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      id: "user-1",
      username: "newuser",
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "newuser" },
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "newuser",
        name: "newuser",
        passwordHash: "hashed-password",
      },
    });
  });
});
