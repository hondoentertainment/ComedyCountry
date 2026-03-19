import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { req, factories, assertOk, assertCreated, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedian: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockSession = (role = "admin") => {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "admin-1", role },
  } as never);
};

const mockNoSession = () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
};

describe("GET /api/admin/comedians", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/comedians"));
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when user is not admin", async () => {
    mockSession("user");
    const res = await GET(req.get("/api/admin/comedians"));
    await assertError(res, 401, "Not authorized");
  });

  it("returns paginated list of comedians", async () => {
    mockSession();
    const comedians = factories.many(factories.comedian, 3);
    vi.mocked(prisma.comedian.findMany).mockResolvedValue(comedians as never);
    vi.mocked(prisma.comedian.count).mockResolvedValue(3 as never);

    const res = await GET(req.get("/api/admin/comedians"));
    await assertOk(res, (data: { comedians: unknown[]; total: number; page: number; pages: number }) => {
      expect(data.comedians).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.page).toBe(1);
      expect(data.pages).toBe(1);
    });
  });

  it("supports search query parameter", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.comedian.count).mockResolvedValue(0 as never);

    const res = await GET(req.get("/api/admin/comedians?search=dave"));
    expect(res.status).toBe(200);

    expect(prisma.comedian.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: "dave", mode: "insensitive" } }),
            expect.objectContaining({ slug: { contains: "dave", mode: "insensitive" } }),
          ]),
        }),
      })
    );
  });

  it("supports pagination parameters", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.comedian.count).mockResolvedValue(100 as never);

    const res = await GET(req.get("/api/admin/comedians?page=3"));
    await assertOk(res, (data: { page: number; pages: number }) => {
      expect(data.page).toBe(3);
      expect(data.pages).toBe(2);
    });

    expect(prisma.comedian.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 50,
      })
    );
  });

  it("clamps page to minimum of 1", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.comedian.count).mockResolvedValue(0 as never);

    const res = await GET(req.get("/api/admin/comedians?page=-5"));
    expect(res.status).toBe(200);

    expect(prisma.comedian.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it("includes genres and counts in response", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.comedian.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/comedians"));

    expect(prisma.comedian.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          genres: true,
          _count: { select: { events: true, followers: true } },
        }),
      })
    );
  });
});

describe("POST /api/admin/comedians", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await POST(req.post("/api/admin/comedians", { name: "Test" }));
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when user is not admin", async () => {
    mockSession("user");
    const res = await POST(req.post("/api/admin/comedians", { name: "Test" }));
    await assertError(res, 401, "Not authorized");
  });

  it("returns 400 when name is missing", async () => {
    mockSession();
    const res = await POST(req.post("/api/admin/comedians", {}));
    await assertError(res, 400, "Name is required");
  });

  it("creates comedian with required fields only", async () => {
    mockSession();
    const created = factories.comedian({ name: "Dave Chappelle" });
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedian.create).mockResolvedValue(created as never);

    const res = await POST(req.post("/api/admin/comedians", { name: "Dave Chappelle" }));
    await assertCreated(res, (data: { name: string }) => {
      expect(data.name).toBe("Dave Chappelle");
    });

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Dave Chappelle",
        slug: "dave-chappelle",
        touringStatus: "UNKNOWN",
      }),
    });
  });

  it("creates comedian with all optional fields", async () => {
    mockSession();
    const created = factories.comedian();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedian.create).mockResolvedValue(created as never);

    const body = {
      name: "Test Comedian",
      bio: "A great comedian",
      headshotUrl: "https://example.com/photo.jpg",
      touringStatus: "TOURING",
      website: "https://test.com",
      yearsActiveFrom: "2010",
      yearsActiveTo: "2020",
      representation: "CAA",
      genres: ["Observational", "Dark"],
      instagramHandle: "@testcomedian",
    };

    const res = await POST(req.post("/api/admin/comedians", body));
    expect(res.status).toBe(201);

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test Comedian",
        bio: "A great comedian",
        headshotUrl: "https://example.com/photo.jpg",
        touringStatus: "TOURING",
        website: "https://test.com",
        yearsActiveFrom: 2010,
        yearsActiveTo: 2020,
        representation: "CAA",
        genres: {
          create: [{ genre: "Observational" }, { genre: "Dark" }],
        },
        socialLinks: {
          create: [
            {
              platform: "instagram",
              url: "https://instagram.com/testcomedian",
            },
          ],
        },
      }),
    });
  });

  it("generates unique slug when slug already exists", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue({ id: "existing" } as never);
    vi.mocked(prisma.comedian.create).mockResolvedValue(factories.comedian() as never);

    await POST(req.post("/api/admin/comedians", { name: "Dave Smith" }));

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: expect.stringMatching(/^dave-smith-.+$/),
      }),
    });
  });

  it("uses provided slug when available", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedian.create).mockResolvedValue(factories.comedian() as never);

    await POST(
      req.post("/api/admin/comedians", { name: "Test", slug: "custom-slug" })
    );

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "custom-slug",
      }),
    });
  });

  it("strips @ from instagram handle", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedian.create).mockResolvedValue(factories.comedian() as never);

    await POST(
      req.post("/api/admin/comedians", {
        name: "Test",
        instagramHandle: "@myhandle",
      })
    );

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        socialLinks: {
          create: [
            {
              platform: "instagram",
              url: "https://instagram.com/myhandle",
            },
          ],
        },
      }),
    });
  });

  it("sets null for empty optional fields", async () => {
    mockSession();
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedian.create).mockResolvedValue(factories.comedian() as never);

    await POST(
      req.post("/api/admin/comedians", {
        name: "Test",
        bio: "",
        headshotUrl: "",
        website: "",
        representation: "",
      })
    );

    expect(prisma.comedian.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bio: null,
        headshotUrl: null,
        website: null,
        representation: null,
      }),
    });
  });
});
