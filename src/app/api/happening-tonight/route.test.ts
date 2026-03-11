import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/taste-profile", () => ({
  getHappeningTonight: vi.fn(),
}));

import { getHappeningTonight } from "@/lib/taste-profile";

const mockEvents = [
  {
    id: "e1",
    title: "Tonight's Show",
    date: new Date(),
    showtime: "8:00 PM",
    ticketUrl: null,
    venue: { id: "v1", name: "Club", city: "NYC", state: "NY", latitude: 40.7, longitude: -74.0 },
    comedians: [],
    attendeeCount: 10,
    ticketsAvailable: true,
  },
];

describe("GET /api/happening-tonight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tonight's events", async () => {
    vi.mocked(getHappeningTonight).mockResolvedValue(mockEvents);

    const req = new Request("http://test/api/happening-tonight");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe("Tonight's Show");
  });

  it("passes location params to getHappeningTonight", async () => {
    vi.mocked(getHappeningTonight).mockResolvedValue([]);

    const req = new Request(
      "http://test/api/happening-tonight?latitude=40.7&longitude=-74.0&radiusMi=25"
    );
    await GET(req);

    expect(vi.mocked(getHappeningTonight)).toHaveBeenCalledWith(
      undefined,
      40.7,
      -74.0,
      25
    );
  });

  it("works without location params", async () => {
    vi.mocked(getHappeningTonight).mockResolvedValue([]);

    const req = new Request("http://test/api/happening-tonight");
    await GET(req);

    expect(vi.mocked(getHappeningTonight)).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it("returns 500 on error", async () => {
    vi.mocked(getHappeningTonight).mockRejectedValue(new Error("DB error"));

    const req = new Request("http://test/api/happening-tonight");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch tonight's events");
  });

  it("sets cache-control header", async () => {
    vi.mocked(getHappeningTonight).mockResolvedValue([]);

    const req = new Request("http://test/api/happening-tonight");
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=120");
  });
});
