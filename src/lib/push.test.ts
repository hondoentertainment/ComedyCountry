import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

vi.mock("web-push", () => {
  throw new Error("not available");
});

vi.mock("./prisma", () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    comedianFollow: {
      findMany: vi.fn(),
    },
  },
}));

import { sendPushToUser, pushToComedianFollowers } from "./push";
import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  pushSubscription: {
    findMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  comedianFollow: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const payload = { title: "Test", body: "Test body" };

describe("sendPushToUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns 0 when VAPID keys are not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(0);
    expect(mockPrisma.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it("returns 0 when user has no subscriptions", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(0);
  });

  it("sends push to subscriptions and returns count", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/1",
        p256dh: "key1",
        auth: "auth1",
      },
      {
        id: "sub-2",
        endpoint: "https://push.example.com/2",
        p256dh: "key2",
        auth: "auth2",
      },
    ]);
    mockSendNotification.mockResolvedValue({});

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it("deletes expired subscriptions (410 Gone)", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/1",
        p256dh: "key1",
        auth: "auth1",
      },
    ]);
    mockFetch.mockResolvedValue({ ok: false, status: 410 });
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(0);
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["sub-1"] } },
    });
  });

  it("deletes not-found subscriptions (404)", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/1",
        p256dh: "key1",
        auth: "auth1",
      },
    ]);
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    mockSendNotification.mockRejectedValue({ statusCode: 404 });

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(0);
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["sub-1"] } },
    });
  });

  it("counts 201 status as successful", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/1",
        p256dh: "key1",
        auth: "auth1",
      },
    ]);
    mockSendNotification.mockResolvedValue({});

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(1);
  });

  it("returns 0 when prisma query fails", async () => {
    mockPrisma.pushSubscription.findMany.mockRejectedValue(
      new Error("DB error"),
    );

    const result = await sendPushToUser("user-1", payload);

    expect(result).toBe(0);
  });
});

describe("pushToComedianFollowers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("sends push to all followers", async () => {
    mockPrisma.comedianFollow.findMany.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ]);
    mockPrisma.pushSubscription.findMany
      .mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/1",
          p256dh: "k",
          auth: "a",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "sub-2",
          endpoint: "https://push.example.com/2",
          p256dh: "k",
          auth: "a",
        },
      ]);
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
    mockSendNotification.mockResolvedValue({});

    const result = await pushToComedianFollowers("comedian-1", payload);

    expect(result).toBe(2);
  });

  it("returns 0 when comedianFollow query fails", async () => {
    mockPrisma.comedianFollow.findMany.mockRejectedValue(new Error("DB error"));

    const result = await pushToComedianFollowers("comedian-1", payload);

    expect(result).toBe(0);
  });
});
