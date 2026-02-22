import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/search", () => ({
  search: vi.fn(),
}));

import { search } from "@/lib/search";

function createRequest(url: string) {
  return new NextRequest(url);
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.mocked(search).mockResolvedValue({
      venues: [],
      comedians: [],
      events: [],
    });
  });

  it("returns search results for valid query", async () => {
    vi.mocked(search).mockResolvedValue({
      venues: [{ id: "v1", name: "Comedy Club", city: "NYC", state: "NY", type: "CLUB" }],
      comedians: [],
      events: [],
    });

    const req = createRequest("http://localhost/api/search?q=comedy");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.venues).toHaveLength(1);
    expect(data.venues[0].name).toBe("Comedy Club");
    expect(search).toHaveBeenCalledWith("comedy", 5);
  });

  it("returns empty results when q is empty", async () => {
    const req = createRequest("http://localhost/api/search?q=");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.venues).toEqual([]);
    expect(data.comedians).toEqual([]);
    expect(data.events).toEqual([]);
  });

  it("handles take parameter", async () => {
    const req = createRequest("http://localhost/api/search?q=test&take=10");
    await GET(req);
    expect(search).toHaveBeenCalledWith("test", 10);
  });

  it("caps take at 20", async () => {
    const req = createRequest("http://localhost/api/search?q=test&take=100");
    await GET(req);
    expect(search).toHaveBeenCalledWith("test", 20);
  });

  it("returns 200 on search error", async () => {
    vi.mocked(search).mockRejectedValue(new Error("DB error"));
    const req = createRequest("http://localhost/api/search?q=test");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.venues).toEqual([]);
  });
});
