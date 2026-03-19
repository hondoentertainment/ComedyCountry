import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { req, routeParams, factories, assertOk, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedian: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comedianGenre: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
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

const params = routeParams({ id: "comedian-1" });

describe("GET /api/admin/comedians/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/comedians/comedian-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await GET(req.get("/api/admin/comedians/comedian-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("returns 404 when comedian not found", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);

    const res = await GET(req.get("/api/admin/comedians/nonexistent"), routeParams({ id: "nonexistent" }));
    await assertError(res, 404, "Comedian not found");
  });

  it("returns comedian with all relations", async () => {
    mockAdminSession();
    const comedian = factories.comedian({ id: "comedian-1" });
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(comedian as never);

    const res = await GET(req.get("/api/admin/comedians/comedian-1"), params);
    await assertOk(res, (data: { id: string; name: string }) => {
      expect(data.id).toBe("comedian-1");
    });

    expect(prisma.comedian.findUnique).toHaveBeenCalledWith({
      where: { id: "comedian-1" },
      include: expect.objectContaining({
        genres: true,
        socialLinks: true,
        specialReleases: true,
        podcastLinks: true,
        youtubeChannel: true,
        _count: { select: { events: true, followers: true } },
      }),
    });
  });
});

describe("PATCH /api/admin/comedians/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await PATCH(
      req.patch("/api/admin/comedians/comedian-1", { name: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await PATCH(
      req.patch("/api/admin/comedians/comedian-1", { name: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authorized");
  });

  it("updates comedian name", async () => {
    mockAdminSession();
    const updated = factories.comedian({ name: "Updated Name" });
    vi.mocked(prisma.comedian.update).mockResolvedValue(updated as never);

    const res = await PATCH(
      req.patch("/api/admin/comedians/comedian-1", { name: "Updated Name" }),
      params
    );
    await assertOk(res, (data: { name: string }) => {
      expect(data.name).toBe("Updated Name");
    });

    expect(prisma.comedian.update).toHaveBeenCalledWith({
      where: { id: "comedian-1" },
      data: { name: "Updated Name" },
      include: { genres: true },
    });
  });

  it("updates multiple fields at once", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedian.update).mockResolvedValue(factories.comedian() as never);

    await PATCH(
      req.patch("/api/admin/comedians/comedian-1", {
        name: "New Name",
        bio: "New bio",
        touringStatus: "RETIRED",
        website: "https://new.com",
        yearsActiveFrom: "2005",
        yearsActiveTo: "2023",
        representation: "WME",
      }),
      params
    );

    expect(prisma.comedian.update).toHaveBeenCalledWith({
      where: { id: "comedian-1" },
      data: {
        name: "New Name",
        bio: "New bio",
        touringStatus: "RETIRED",
        website: "https://new.com",
        yearsActiveFrom: 2005,
        yearsActiveTo: 2023,
        representation: "WME",
      },
      include: { genres: true },
    });
  });

  it("updates genres by deleting old and creating new", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedianGenre.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.comedianGenre.createMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.comedian.update).mockResolvedValue(factories.comedian() as never);

    await PATCH(
      req.patch("/api/admin/comedians/comedian-1", {
        genres: ["Observational", "Dark"],
      }),
      params
    );

    expect(prisma.comedianGenre.deleteMany).toHaveBeenCalledWith({
      where: { comedianId: "comedian-1" },
    });
    expect(prisma.comedianGenre.createMany).toHaveBeenCalledWith({
      data: [
        { comedianId: "comedian-1", genre: "Observational" },
        { comedianId: "comedian-1", genre: "Dark" },
      ],
    });
  });

  it("clears genres when empty array provided", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedianGenre.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.comedian.update).mockResolvedValue(factories.comedian() as never);

    await PATCH(
      req.patch("/api/admin/comedians/comedian-1", { genres: [] }),
      params
    );

    expect(prisma.comedianGenre.deleteMany).toHaveBeenCalledWith({
      where: { comedianId: "comedian-1" },
    });
    expect(prisma.comedianGenre.createMany).not.toHaveBeenCalled();
  });

  it("sets null for empty string fields", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedian.update).mockResolvedValue(factories.comedian() as never);

    await PATCH(
      req.patch("/api/admin/comedians/comedian-1", {
        bio: "",
        website: "",
        headshotUrl: "",
        representation: "",
      }),
      params
    );

    expect(prisma.comedian.update).toHaveBeenCalledWith({
      where: { id: "comedian-1" },
      data: {
        bio: null,
        website: null,
        headshotUrl: null,
        representation: null,
      },
      include: { genres: true },
    });
  });

  it("only includes defined fields in update data", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedian.update).mockResolvedValue(factories.comedian() as never);

    await PATCH(
      req.patch("/api/admin/comedians/comedian-1", { name: "Only Name" }),
      params
    );

    const callData = vi.mocked(prisma.comedian.update).mock.calls[0][0].data as Record<string, unknown>;
    expect(callData).toEqual({ name: "Only Name" });
    expect(callData).not.toHaveProperty("bio");
    expect(callData).not.toHaveProperty("website");
  });
});

describe("DELETE /api/admin/comedians/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(req.delete("/api/admin/comedians/comedian-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await DELETE(req.delete("/api/admin/comedians/comedian-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("deletes comedian and returns confirmation", async () => {
    mockAdminSession();
    vi.mocked(prisma.comedian.delete).mockResolvedValue({} as never);

    const res = await DELETE(req.delete("/api/admin/comedians/comedian-1"), params);
    await assertOk(res, (data: { deleted: boolean }) => {
      expect(data.deleted).toBe(true);
    });

    expect(prisma.comedian.delete).toHaveBeenCalledWith({
      where: { id: "comedian-1" },
    });
  });
});
