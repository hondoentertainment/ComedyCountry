import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/marketplace", () => ({
  generateIndustryMetrics: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    industryReport: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { generateIndustryMetrics } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockPrisma = prisma as unknown as {
  industryReport: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/industry-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reports with no filters", async () => {
    mockPrisma.industryReport.findMany.mockResolvedValue([
      { id: "ir1", city: "Nashville" },
    ]);

    const req = createRequest("http://localhost/api/industry-reports");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reports).toHaveLength(1);
  });

  it("filters by city and state", async () => {
    mockPrisma.industryReport.findMany.mockResolvedValue([]);

    const req = createRequest(
      "http://localhost/api/industry-reports?city=Nashville&state=TN"
    );
    await GET(req);

    expect(mockPrisma.industryReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { equals: "Nashville", mode: "insensitive" },
          state: { equals: "TN", mode: "insensitive" },
        }),
      })
    );
  });

  it("filters by year", async () => {
    mockPrisma.industryReport.findMany.mockResolvedValue([]);

    const req = createRequest("http://localhost/api/industry-reports?year=2025");
    await GET(req);

    expect(mockPrisma.industryReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ year: 2025 }),
      })
    );
  });
});

describe("POST /api/industry-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/industry-reports", {
      method: "POST",
      body: JSON.stringify({ city: "Nashville", state: "TN", quarter: "Q1", year: 2025 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/industry-reports", {
      method: "POST",
      body: JSON.stringify({ city: "Nashville" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("generates metrics and upserts report", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(generateIndustryMetrics).mockResolvedValue({
      totalShows: 50,
      venueCount: 10,
      avgTicketPrice: 25,
      topComedians: [],
    });
    mockPrisma.industryReport.upsert.mockResolvedValue({
      id: "ir1",
      city: "Nashville",
      state: "TN",
    });

    const req = createRequest("http://localhost/api/industry-reports", {
      method: "POST",
      body: JSON.stringify({
        city: "Nashville",
        state: "TN",
        quarter: "Q1",
        year: 2025,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(generateIndustryMetrics).toHaveBeenCalledWith("Nashville", "TN");
  });
});
