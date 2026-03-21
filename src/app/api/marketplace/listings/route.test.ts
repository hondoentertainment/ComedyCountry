import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/marketplace", () => ({
  getTalentListings: vi.fn(),
  createTalentListing: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getTalentListings, createTalentListing } from "@/lib/marketplace";
import { getServerSession } from "next-auth";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/marketplace/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns listings with default params", async () => {
    vi.mocked(getTalentListings).mockResolvedValue({
      listings: [{ id: "tl1", showType: "open_mic" }],
      total: 1,
      page: 1,
      pages: 1,
    } as any);

    const req = createRequest("http://localhost/api/marketplace/listings");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.listings).toHaveLength(1);
    expect(getTalentListings).toHaveBeenCalledWith({
      city: undefined,
      state: undefined,
      genre: undefined,
      showType: undefined,
      page: 1,
    });
  });

  it("passes filter params to getTalentListings", async () => {
    vi.mocked(getTalentListings).mockResolvedValue({
      listings: [],
      total: 0,
      page: 1,
      pages: 0,
    } as any);

    const req = createRequest(
      "http://localhost/api/marketplace/listings?city=Nashville&state=TN&genre=standup&showType=headliner&page=2"
    );
    await GET(req);

    expect(getTalentListings).toHaveBeenCalledWith({
      city: "Nashville",
      state: "TN",
      genre: "standup",
      showType: "headliner",
      page: 2,
    });
  });

  it("returns 500 on error", async () => {
    vi.mocked(getTalentListings).mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/marketplace/listings");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/marketplace/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/marketplace/listings", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", date: "2025-06-01", showType: "showcase" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/marketplace/listings", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("creates listing and returns 201", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(createTalentListing).mockResolvedValue({
      id: "tl1",
      venueId: "v1",
      showType: "showcase",
    } as any);

    const req = createRequest("http://localhost/api/marketplace/listings", {
      method: "POST",
      body: JSON.stringify({
        venueId: "v1",
        date: "2025-06-01",
        showType: "showcase",
        genre: "standup",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("tl1");
  });
});
