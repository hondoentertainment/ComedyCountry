import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

function makeRequest(params = "") {
  return new Request(`http://localhost:3000/api/health${params}`);
}

beforeEach(() => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
});

describe("GET /api/health", () => {
  it("returns 200 with status ok when database is connected", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("returns a valid ISO timestamp", async () => {
    const before = new Date().toISOString();
    const res = await GET(makeRequest());
    const after = new Date().toISOString();
    const data = await res.json();

    expect(data.timestamp).toBeDefined();
    const ts = new Date(data.timestamp);
    expect(ts.getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(ts.getTime()).toBeLessThanOrEqual(new Date(after).getTime());
  });

  it("returns JSON content type", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns exactly two keys in basic mode", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(Object.keys(data)).toEqual(["status", "timestamp"]);
  });

  it("returns detailed info when ?detail=true", async () => {
    const res = await GET(makeRequest("?detail=true"));
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBeDefined();
    expect(data.checks.database.status).toBe("connected");
    expect(typeof data.checks.database.latencyMs).toBe("number");
    expect(data.version).toBeDefined();
    expect(data.uptime).toBeDefined();
  });

  it("returns 503 when database is unreachable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));
    const res = await GET(makeRequest("?detail=true"));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.status).toBe("degraded");
    expect(data.checks.database.status).toBe("disconnected");
    expect(data.checks.database.error).toBe("Connection refused");
  });
});
