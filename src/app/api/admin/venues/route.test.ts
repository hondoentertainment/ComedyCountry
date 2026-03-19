import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { req, factories, assertOk, assertCreated, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockAdminSession = () => {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "admin-1", role: "admin" },
  } as never);
};

const mockNoSession = () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
};

const mockUserSession = () => {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "user-1", role: "user" },
  } as never);
};

describe("GET /api/admin/venues", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/venues"));
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await GET(req.get("/api/admin/venues"));
    await assertError(res, 401, "Not authorized");
  });

  it("returns paginated list of venues", async () => {
    mockAdminSession();
    const venues = factories.many(factories.venue, 3);
    vi.mocked(prisma.venue.findMany).mockResolvedValue(venues as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(3 as never);

    const res = await GET(req.get("/api/admin/venues"));
    await assertOk(res, (data: { venues: unknown[]; total: number; page: number; pages: number }) => {
      expect(data.venues).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.page).toBe(1);
      expect(data.pages).toBe(1);
    });
  });

  it("supports search across name, city, state", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/venues?search=nashville"));

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: "nashville", mode: "insensitive" } }),
            expect.objectContaining({ city: { contains: "nashville", mode: "insensitive" } }),
            expect.objectContaining({ state: { contains: "nashville", mode: "insensitive" } }),
          ]),
        }),
      })
    );
  });

  it("supports pagination with page parameter", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(150 as never);

    const res = await GET(req.get("/api/admin/venues?page=2"));
    await assertOk(res, (data: { page: number; pages: number }) => {
      expect(data.page).toBe(2);
      expect(data.pages).toBe(3);
    });

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 })
    );
  });

  it("orders by state, city, name", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/venues"));

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
      })
    );
  });

  it("includes event count", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/venues"));

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { events: true } } },
      })
    );
  });

  it("returns empty list without error when no venues exist", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.venue.count).mockResolvedValue(0 as never);

    const res = await GET(req.get("/api/admin/venues"));
    await assertOk(res, (data: { venues: unknown[]; total: number }) => {
      expect(data.venues).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });
});

describe("POST /api/admin/venues", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await POST(req.post("/api/admin/venues", { name: "Test", city: "NYC", state: "NY" }));
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await POST(req.post("/api/admin/venues", { name: "Test", city: "NYC", state: "NY" }));
    await assertError(res, 401, "Not authorized");
  });

  it("returns 400 when name is missing", async () => {
    mockAdminSession();
    const res = await POST(req.post("/api/admin/venues", { city: "NYC", state: "NY" }));
    await assertError(res, 400, "Name, city, and state are required");
  });

  it("returns 400 when city is missing", async () => {
    mockAdminSession();
    const res = await POST(req.post("/api/admin/venues", { name: "Test", state: "NY" }));
    await assertError(res, 400, "Name, city, and state are required");
  });

  it("returns 400 when state is missing", async () => {
    mockAdminSession();
    const res = await POST(req.post("/api/admin/venues", { name: "Test", city: "NYC" }));
    await assertError(res, 400, "Name, city, and state are required");
  });

  it("creates venue with required fields only", async () => {
    mockAdminSession();
    const created = factories.venue({ name: "Laugh Lounge", city: "NYC", state: "NY" });
    vi.mocked(prisma.venue.create).mockResolvedValue(created as never);

    const res = await POST(
      req.post("/api/admin/venues", { name: "Laugh Lounge", city: "NYC", state: "NY" })
    );
    await assertCreated(res);

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: {
        name: "Laugh Lounge",
        address: null,
        city: "NYC",
        state: "NY",
        latitude: null,
        longitude: null,
        capacity: null,
        website: null,
        type: "CLUB",
      },
    });
  });

  it("creates venue with all optional fields", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.create).mockResolvedValue(factories.venue() as never);

    await POST(
      req.post("/api/admin/venues", {
        name: "Big Theater",
        address: "456 Comedy Ave",
        city: "Chicago",
        state: "IL",
        latitude: "41.8781",
        longitude: "-87.6298",
        capacity: "500",
        website: "https://bigtheater.com",
        type: "THEATER",
      })
    );

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: {
        name: "Big Theater",
        address: "456 Comedy Ave",
        city: "Chicago",
        state: "IL",
        latitude: 41.8781,
        longitude: -87.6298,
        capacity: 500,
        website: "https://bigtheater.com",
        type: "THEATER",
      },
    });
  });

  it("sets null for empty optional fields", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.create).mockResolvedValue(factories.venue() as never);

    await POST(
      req.post("/api/admin/venues", {
        name: "Test",
        city: "NYC",
        state: "NY",
        address: "",
        website: "",
      })
    );

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        address: null,
        website: null,
      }),
    });
  });

  it("parses latitude and longitude as floats", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.create).mockResolvedValue(factories.venue() as never);

    await POST(
      req.post("/api/admin/venues", {
        name: "Test",
        city: "NYC",
        state: "NY",
        latitude: "40.7128",
        longitude: "-74.0060",
      })
    );

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        latitude: 40.7128,
        longitude: -74.006,
      }),
    });
  });

  it("parses capacity as integer", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.create).mockResolvedValue(factories.venue() as never);

    await POST(
      req.post("/api/admin/venues", {
        name: "Test",
        city: "NYC",
        state: "NY",
        capacity: "350",
      })
    );

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        capacity: 350,
      }),
    });
  });

  it("defaults type to CLUB when not provided", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.create).mockResolvedValue(factories.venue() as never);

    await POST(
      req.post("/api/admin/venues", { name: "Test", city: "NYC", state: "NY" })
    );

    expect(prisma.venue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "CLUB" }),
    });
  });
});
