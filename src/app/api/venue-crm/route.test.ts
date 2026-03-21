import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/marketplace", () => ({
  getVenueCRMData: vi.fn(),
  updateCRMRecord: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getVenueCRMData, updateCRMRecord } from "@/lib/marketplace";
import { getServerSession } from "next-auth";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/venue-crm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/venue-crm?venueId=v1");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when venueId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/venue-crm");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("returns CRM data", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getVenueCRMData).mockResolvedValue({
      records: [{ id: "crm1" }],
      total: 1,
      page: 1,
      pages: 1,
    } as any);

    const req = createRequest("http://localhost/api/venue-crm?venueId=v1&page=1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.records).toHaveLength(1);
    expect(getVenueCRMData).toHaveBeenCalledWith("v1", 1);
  });
});

describe("POST /api/venue-crm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/venue-crm", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", userId: "u1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/venue-crm", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("updates CRM record successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(updateCRMRecord).mockResolvedValue({ id: "crm1", tags: "vip" } as any);

    const req = createRequest("http://localhost/api/venue-crm", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", userId: "u2", tags: "vip", notes: "Regular" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tags).toBe("vip");
    expect(updateCRMRecord).toHaveBeenCalledWith("v1", "u2", { tags: "vip", notes: "Regular" });
  });
});
