import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("returns a valid ISO timestamp", async () => {
    const before = new Date().toISOString();
    const res = await GET();
    const after = new Date().toISOString();
    const data = await res.json();

    expect(data.timestamp).toBeDefined();
    const ts = new Date(data.timestamp);
    expect(ts.getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(ts.getTime()).toBeLessThanOrEqual(new Date(after).getTime());
  });

  it("returns JSON content type", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns exactly three keys", async () => {
    const res = await GET();
    const data = await res.json();
    expect(Object.keys(data)).toEqual(["status", "timestamp", "database"]);
  });
});
