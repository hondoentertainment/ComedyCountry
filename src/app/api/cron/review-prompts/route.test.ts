import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/review-prompts", () => ({
  processReviewPrompts: vi.fn(),
}));

import { processReviewPrompts } from "@/lib/review-prompts";
import { POST } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/cron/review-prompts", () => {
  it("returns 401 when API key is wrong", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "correct-key";

    try {
      const res = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "wrong-key" },
        }),
      );
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });

  it("returns 401 when CRON_API_KEY is not set", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key";

    try {
      const res = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "test-cron-key" },
        }),
      );
      expect(res.status).toBe(401);
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });

  it("calls processReviewPrompts and returns count", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key";

    try {
      vi.mocked(processReviewPrompts).mockResolvedValue({
        eventsProcessed: 3,
        promptsSent: 12,
      });

      const res = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "test-cron-key" },
        })
      );

      const data = await res.json();
      expect(data).toEqual({
        success: true,
        eventsProcessed: 3,
        promptsSent: 12,
      });
      expect(processReviewPrompts).toHaveBeenCalledTimes(1);
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });

  it("returns 500 on error", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key";

    try {
      vi.mocked(processReviewPrompts).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const res = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "test-cron-key" },
        })
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Failed to process review prompts");
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });
});
