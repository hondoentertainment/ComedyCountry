import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an ok status payload", async () => {
    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.service).toBe("punchline-atlas");
    expect(data.environment).toBe("test");
    expect(data.timestamp).toBe("2026-04-29T12:00:00.000Z");
  });

  it("returns JSON for uptime monitoring", async () => {
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
