import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/review-prompts", () => ({
  processReviewPrompts: vi.fn(),
}));

import { processReviewPrompts } from "@/lib/review-prompts";
import { POST } from "./route";

describe("POST /api/cron/review-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is wrong", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "correct-key";

    try {
      const response = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "wrong-key" },
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
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
    delete process.env.CRON_API_KEY;

    try {
      const response = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "anything" },
        })
      );

      expect(response.status).toBe(401);
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });

  it("returns counts when processing succeeds", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key";
    vi.mocked(processReviewPrompts).mockResolvedValue({
      eventsProcessed: 3,
      promptsSent: 12,
    });

    try {
      const response = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "test-cron-key" },
        })
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
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

  it("returns 500 when processing fails", async () => {
    const original = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key";
    vi.mocked(processReviewPrompts).mockRejectedValue(new Error("DB connection failed"));

    try {
      const response = await POST(
        new Request("http://localhost/api/cron/review-prompts", {
          method: "POST",
          headers: { "x-api-key": "test-cron-key" },
        })
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to process review prompts",
      });
    } finally {
      if (original === undefined) {
        delete process.env.CRON_API_KEY;
      } else {
        process.env.CRON_API_KEY = original;
      }
    }
  });
});
