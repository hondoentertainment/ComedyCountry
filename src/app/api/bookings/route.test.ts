import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/api-utils", () => ({
  requireAuth: vi.fn(),
  parseBody: vi.fn(),
  badRequest: vi.fn((msg: string) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg, code: "BAD_REQUEST" }, { status: 400 });
  }),
  serverError: vi.fn(() => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }),
}));

vi.mock("@/lib/booking", () => ({
  createBookingRequest: vi.fn(),
  getBookingRequestsForComedian: vi.fn(),
  getBookingRequestsForVenue: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

import { requireAuth, parseBody } from "@/lib/api-utils";
import {
  createBookingRequest,
  getBookingRequestsForComedian,
  getBookingRequestsForVenue,
} from "@/lib/booking";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(requireAuth).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) as any,
    });

    const req = createRequest("http://localhost/api/bookings?comedianId=c1");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns bookings for comedianId", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    const bookings = [{ id: "b1", comedianId: "c1" }];
    vi.mocked(getBookingRequestsForComedian).mockResolvedValue(bookings as any);

    const req = createRequest("http://localhost/api/bookings?comedianId=c1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(getBookingRequestsForComedian).toHaveBeenCalledWith("c1", null);
  });

  it("returns bookings for venueId with status filter", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    const bookings = [{ id: "b2", venueId: "v1" }];
    vi.mocked(getBookingRequestsForVenue).mockResolvedValue(bookings as any);

    const req = createRequest("http://localhost/api/bookings?venueId=v1&status=pending");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(getBookingRequestsForVenue).toHaveBeenCalledWith("v1", "pending");
  });

  it("returns 400 when neither comedianId nor venueId provided", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);

    const req = createRequest("http://localhost/api/bookings");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    vi.mocked(getBookingRequestsForComedian).mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/bookings?comedianId=c1");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(requireAuth).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) as any,
    });

    const req = createRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", comedianId: "c1", date: "2026-04-01" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    vi.mocked(parseBody).mockResolvedValue({
      data: null,
      error: NextResponse.json({ error: "Validation failed" }, { status: 400 }),
    } as any);

    const req = createRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("creates booking successfully", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    const bookingData = {
      venueId: "v1",
      comedianId: "c1",
      date: "2026-04-01",
      showType: "headliner",
      budget: 500,
      message: "Interested in booking",
    };
    vi.mocked(parseBody).mockResolvedValue({
      data: bookingData,
      error: null,
    } as any);
    const booking = { id: "b1", ...bookingData };
    vi.mocked(createBookingRequest).mockResolvedValue(booking as any);

    const req = createRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("b1");
    expect(createBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: "v1",
        comedianId: "c1",
        requesterId: "u1",
      })
    );
  });

  it("returns 400 when createBookingRequest throws", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    } as any);
    vi.mocked(parseBody).mockResolvedValue({
      data: { venueId: "v1", comedianId: "c1", date: "2026-04-01" },
      error: null,
    } as any);
    vi.mocked(createBookingRequest).mockRejectedValue(new Error("Venue not available"));

    const req = createRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", comedianId: "c1", date: "2026-04-01" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
