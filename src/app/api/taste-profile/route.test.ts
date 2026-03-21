import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/taste-profile", () => ({
  getTasteProfile: vi.fn(),
  computeTasteProfile: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getTasteProfile, computeTasteProfile } from "@/lib/taste-profile";

const mockProfile = {
  id: "tp-1",
  userId: "user-1",
  dimensions: { dark: 0.9, observational: 0.5 },
  topGenres: ["dark", "observational"],
  confidence: 0.8,
  lastComputed: new Date(),
} as any;

describe("/api/taste-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("returns existing fresh profile", async () => {
      vi.mocked(getTasteProfile).mockResolvedValue(mockProfile);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.dimensions.dark).toBe(0.9);
      expect(vi.mocked(computeTasteProfile)).not.toHaveBeenCalled();
    });

    it("recomputes stale profile", async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // 10 days old
      vi.mocked(getTasteProfile).mockResolvedValue({
        ...mockProfile,
        lastComputed: staleDate,
      });
      vi.mocked(computeTasteProfile).mockResolvedValue(mockProfile);

      const res = await GET();

      expect(res.status).toBe(200);
      expect(vi.mocked(computeTasteProfile)).toHaveBeenCalledWith("user-1");
    });

    it("computes profile when none exists", async () => {
      vi.mocked(getTasteProfile).mockResolvedValue(null);
      vi.mocked(computeTasteProfile).mockResolvedValue(mockProfile);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe("user-1");
    });
  });

  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await POST();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("force recomputes and returns profile", async () => {
      vi.mocked(computeTasteProfile).mockResolvedValue(mockProfile);

      const res = await POST();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(vi.mocked(computeTasteProfile)).toHaveBeenCalledWith("user-1");
      expect(data.topGenres).toContain("dark");
    });
  });
});
