import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(new Request("http://test/api/notifications"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("returns notifications for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const mockNotifications = [
      { id: "n1", userId: "user-1", message: "New event", read: false },
    ];
    mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
    mockPrisma.notification.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const res = await GET(new Request("http://test/api/notifications"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notifications).toEqual(mockNotifications);
    expect(data.total).toBe(1);
    expect(data.unreadCount).toBe(1);
    expect(data.page).toBe(1);
  });

  it("respects page parameter", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const res = await GET(new Request("http://test/api/notifications?page=3"));
    const data = await res.json();

    expect(data.page).toBe(3);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40 })
    );
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://test/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("marks all notifications as read", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const res = await PATCH(
      new Request("http://test/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      data: { read: true },
    });
  });

  it("marks a single notification as read", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const res = await PATCH(
      new Request("http://test/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId: "n1" }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-1" },
      data: { read: true },
    });
  });

  it("returns 400 when no action specified", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const res = await PATCH(
      new Request("http://test/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({}),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("No action specified");
  });
});
