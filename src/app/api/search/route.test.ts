import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/search", () => ({
  search: vi.fn(),
  autocomplete: vi.fn(),
}));

import { search } from "@/lib/search";

function createRequest(url: string) {
  return new NextRequest(url);
}

const emptyResult = {
  venues: [],
  comedians: [],
  events: [],
  facets: {},
  totalCounts: { venues: 0, comedians: 0, events: 0 },
  query: "",
  suggestions: [],
};

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.mocked(search).mockResolvedValue(emptyResult);
  });

  it("returns search results for valid query", async () => {
    vi.mocked(search).mockResolvedValue({
      ...emptyResult,
      venues: [{
        id: "v1", name: "Comedy Club", city: "NYC", state: "NY", type: "CLUB",
        capacity: 200, followerCount: 50, eventCount: 10, relevanceScore: 0.9,
      }],
      query: "comedy",
    });

    const req = createRequest("http://localhost/api/search?q=comedy");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.venues).toHaveLength(1);
    expect(data.venues[0].name).toBe("Comedy Club");
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

  it("returns 200 on search error", async () => {
    vi.mocked(search).mockRejectedValue(new Error("DB error"));
    const req = createRequest("http://localhost/api/search?q=test");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.venues).toEqual([]);
  });
});
