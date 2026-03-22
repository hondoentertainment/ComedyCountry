import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/notifications", () => ({
  getUnreadCount: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { getServerSession } from "next-auth";
import { getUnreadCount } from "@/lib/notifications";

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count 0 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it("returns unread count for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
    vi.mocked(getUnreadCount).mockResolvedValue(5);

    const res = await GET(new Request("http://localhost:3000"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(5);
    expect(getUnreadCount).toHaveBeenCalledWith("user-1");
  });
});
