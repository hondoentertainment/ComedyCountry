import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchChannelStats } from "./youtube";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchChannelStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("YOUTUBE_API_KEY", "test-api-key");
  });

  it("returns null when YOUTUBE_API_KEY is not set", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");

    const result = await fetchChannelStats("UCabcdefghij1234567890ab");

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches by channel ID when given a UC... ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "UCabcdefghij1234567890ab",
            statistics: { subscriberCount: "1000", videoCount: "50" },
          },
        ],
      }),
    });

    const result = await fetchChannelStats("UCabcdefghij1234567890ab");

    expect(result).toEqual({
      channelId: "UCabcdefghij1234567890ab",
      subscriberCount: 1000,
      videoCount: 50,
    });
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("id=UCabcdefghij1234567890ab");
    expect(calledUrl).not.toContain("forHandle");
  });

  it("fetches by handle when given a @handle", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "UCresolved123456789012",
            statistics: { subscriberCount: "500", videoCount: "20" },
          },
        ],
      }),
    });

    const result = await fetchChannelStats("@comedian");

    expect(result).toEqual({
      channelId: "UCresolved123456789012",
      subscriberCount: 500,
      videoCount: 20,
    });
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("forHandle=comedian");
  });

  it("fetches by handle when given a plain handle (no @)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "UCresolved123456789012",
            statistics: { subscriberCount: "200", videoCount: "10" },
          },
        ],
      }),
    });

    const result = await fetchChannelStats("comedian");

    expect(result).not.toBeNull();
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("forHandle=comedian");
  });

  it("returns null when no items in response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await fetchChannelStats("UCabcdefghij1234567890ab");

    expect(result).toBeNull();
  });

  it("returns null when channel not found error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 404, message: "Not found", errors: [{ reason: "channelNotFound" }] },
      }),
    });

    const result = await fetchChannelStats("UCabcdefghij1234567890ab");

    expect(result).toBeNull();
  });

  it("throws on non-channelNotFound API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: 403, message: "Forbidden" },
      }),
    });

    await expect(fetchChannelStats("UCabcdefghij1234567890ab")).rejects.toThrow("Forbidden");
  });

  it("returns null when statistics are missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "UCabcdefghij1234567890ab" }],
      }),
    });

    const result = await fetchChannelStats("UCabcdefghij1234567890ab");

    expect(result).toBeNull();
  });
});
