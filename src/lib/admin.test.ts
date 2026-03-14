import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin } from "./admin";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authenticated");
    }
  });

  it("returns unauthorized when user is not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", role: "user", email: "test@example.com", name: "Test" },
      expires: "",
    });

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authorized");
    }
  });

  it("returns authorized with session when user is admin", async () => {
    const session = {
      user: { id: "admin-1", role: "admin", email: "admin@example.com", name: "Admin" },
      expires: "",
    };
    vi.mocked(getServerSession).mockResolvedValue(session);

    const result = await requireAdmin();

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.session).toBe(session);
    }
  });
});
