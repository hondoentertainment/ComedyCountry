import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/booking", () => ({
  getBookingRequest: vi.fn(),
  respondToBooking: vi.fn(),
  negotiateBooking: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getBookingRequest,
  respondToBooking,
  negotiateBooking,
} from "@/lib/booking";

const makeParams = (id: string) => ({ params: { id } });

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when booking not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getBookingRequest).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Booking not found");
  });

  it("returns booking when found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const booking = { id: "b1", venueId: "v1", comedianId: "c1", status: "pending" };
    vi.mocked(getBookingRequest).mockResolvedValue(booking as any);

    const req = createRequest("http://localhost/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("b1");
    expect(getBookingRequest).toHaveBeenCalledWith("b1");
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getBookingRequest).mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("DB error");
  });
});

describe("PATCH /api/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });
    const res = await PATCH(req, makeParams("b1"));

    expect(res.status).toBe(401);
  });

  it("handles negotiate action", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const updated = { id: "b1", status: "negotiating", budget: 800 };
    vi.mocked(negotiateBooking).mockResolvedValue(updated as any);

    const req = createRequest("http://localhost/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({
        action: "negotiate",
        budget: 800,
        message: "Can we do 800?",
      }),
    });
    const res = await PATCH(req, makeParams("b1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.budget).toBe(800);
    expect(negotiateBooking).toHaveBeenCalledWith("b1", {
      budget: 800,
      message: "Can we do 800?",
      responseNote: undefined,
    });
  });

  it("returns 400 when status is missing for non-negotiate action", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, makeParams("b1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("status is required");
  });

  it("responds to booking with status", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const updated = { id: "b1", status: "accepted" };
    vi.mocked(respondToBooking).mockResolvedValue(updated as any);

    const req = createRequest("http://localhost/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted", responseNote: "Looks good!" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("accepted");
    expect(respondToBooking).toHaveBeenCalledWith("b1", "accepted", "Looks good!");
  });

  it("returns 400 on error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(respondToBooking).mockRejectedValue(new Error("Invalid transition"));

    const req = createRequest("http://localhost/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });
    const res = await PATCH(req, makeParams("b1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid transition");
  });
});
