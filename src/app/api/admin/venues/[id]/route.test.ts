import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { req, routeParams, factories, assertOk, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const params = routeParams({ id: "venue-1" });

describe("GET /api/admin/venues/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/venues/venue-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await GET(req.get("/api/admin/venues/venue-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("returns 404 when venue not found", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.findUnique).mockResolvedValue(null);

    const res = await GET(req.get("/api/admin/venues/nonexistent"), routeParams({ id: "nonexistent" }));
    await assertError(res, 404, "Venue not found");
  });

  it("returns venue with photos, social links, and event count", async () => {
    mockAdminSession();
    const venue = factories.venue({
      id: "venue-1",
      photos: [],
      socialLinks: [],
      _count: { events: 10 },
    });
    vi.mocked(prisma.venue.findUnique).mockResolvedValue(venue as never);

    const res = await GET(req.get("/api/admin/venues/venue-1"), params);
    await assertOk(res, (data: { id: string }) => {
      expect(data.id).toBe("venue-1");
    });

    expect(prisma.venue.findUnique).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      include: {
        photos: true,
        socialLinks: true,
        _count: { select: { events: true } },
      },
    });
  });
});

describe("PATCH /api/admin/venues/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await PATCH(
      req.patch("/api/admin/venues/venue-1", { name: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await PATCH(
      req.patch("/api/admin/venues/venue-1", { name: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authorized");
  });

  it("updates venue name", async () => {
    mockAdminSession();
    const updated = factories.venue({ name: "Updated Venue" });
    vi.mocked(prisma.venue.update).mockResolvedValue(updated as never);

    const res = await PATCH(
      req.patch("/api/admin/venues/venue-1", { name: "Updated Venue" }),
      params
    );
    await assertOk(res, (data: { name: string }) => {
      expect(data.name).toBe("Updated Venue");
    });
  });

  it("updates all fields at once", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.update).mockResolvedValue(factories.venue() as never);

    await PATCH(
      req.patch("/api/admin/venues/venue-1", {
        name: "New Name",
        address: "789 New St",
        city: "Austin",
        state: "TX",
        latitude: "30.2672",
        longitude: "-97.7431",
        capacity: "300",
        website: "https://newvenue.com",
        type: "THEATER",
      }),
      params
    );

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: {
        name: "New Name",
        address: "789 New St",
        city: "Austin",
        state: "TX",
        latitude: 30.2672,
        longitude: -97.7431,
        capacity: 300,
        website: "https://newvenue.com",
        type: "THEATER",
      },
    });
  });

  it("only includes provided fields in update", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.update).mockResolvedValue(factories.venue() as never);

    await PATCH(
      req.patch("/api/admin/venues/venue-1", { name: "Only Name" }),
      params
    );

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: { name: "Only Name" },
    });
  });

  it("sets null for empty address and website", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.update).mockResolvedValue(factories.venue() as never);

    await PATCH(
      req.patch("/api/admin/venues/venue-1", { address: "", website: "" }),
      params
    );

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: { address: null, website: null },
    });
  });

  it("parses numeric fields correctly", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.update).mockResolvedValue(factories.venue() as never);

    await PATCH(
      req.patch("/api/admin/venues/venue-1", {
        latitude: "40.7128",
        longitude: "-74.006",
        capacity: "250",
      }),
      params
    );

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: { latitude: 40.7128, longitude: -74.006, capacity: 250 },
    });
  });

  it("sets null for empty numeric fields", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.update).mockResolvedValue(factories.venue() as never);

    await PATCH(
      req.patch("/api/admin/venues/venue-1", {
        latitude: "",
        longitude: "",
        capacity: "",
      }),
      params
    );

    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: { latitude: null, longitude: null, capacity: null },
    });
  });
});

describe("DELETE /api/admin/venues/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(req.delete("/api/admin/venues/venue-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await DELETE(req.delete("/api/admin/venues/venue-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("deletes venue and returns confirmation", async () => {
    mockAdminSession();
    vi.mocked(prisma.venue.delete).mockResolvedValue({} as never);

    const res = await DELETE(req.delete("/api/admin/venues/venue-1"), params);
    await assertOk(res, (data: { deleted: boolean }) => {
      expect(data.deleted).toBe(true);
    });

    expect(prisma.venue.delete).toHaveBeenCalledWith({
      where: { id: "venue-1" },
    });
  });
});
