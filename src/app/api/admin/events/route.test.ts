import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { req, factories, assertOk, assertCreated, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/notifications", () => ({
  generateEventNotifications: vi.fn().mockResolvedValue(undefined),
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

describe("GET /api/admin/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/events"));
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await GET(req.get("/api/admin/events"));
    await assertError(res, 401, "Not authorized");
  });

  it("returns paginated list of events", async () => {
    mockAdminSession();
    const events = factories.many(factories.event, 3);
    vi.mocked(prisma.event.findMany).mockResolvedValue(events as never);
    vi.mocked(prisma.event.count).mockResolvedValue(3 as never);

    const res = await GET(req.get("/api/admin/events"));
    await assertOk(res, (data: { events: unknown[]; total: number; page: number; pages: number }) => {
      expect(data.events).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.page).toBe(1);
      expect(data.pages).toBe(1);
    });
  });

  it("supports search by title", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/events?search=comedy"));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: { contains: "comedy", mode: "insensitive" },
            }),
          ]),
        }),
      })
    );
  });

  it("supports search by venue name", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/events?search=zanies"));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              venue: { name: { contains: "zanies", mode: "insensitive" } },
            }),
          ]),
        }),
      })
    );
  });

  it("supports search by comedian name", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/events?search=dave"));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              comedians: {
                some: {
                  comedian: {
                    name: { contains: "dave", mode: "insensitive" },
                  },
                },
              },
            }),
          ]),
        }),
      })
    );
  });

  it("paginates correctly", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(200 as never);

    const res = await GET(req.get("/api/admin/events?page=3"));
    await assertOk(res, (data: { page: number; pages: number }) => {
      expect(data.page).toBe(3);
      expect(data.pages).toBe(4);
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 50 })
    );
  });

  it("orders events by date descending", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/events"));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "desc" },
      })
    );
  });

  it("includes venue and comedian data in response", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);

    await GET(req.get("/api/admin/events"));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          venue: { select: { id: true, name: true, city: true, state: true } },
          comedians: {
            include: {
              comedian: { select: { id: true, name: true } },
            },
          },
          _count: { select: { reviews: true } },
        }),
      })
    );
  });
});

describe("POST /api/admin/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await POST(
      req.post("/api/admin/events", { venueId: "v1", date: "2025-06-01" })
    );
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await POST(
      req.post("/api/admin/events", { venueId: "v1", date: "2025-06-01" })
    );
    await assertError(res, 401, "Not authorized");
  });

  it("returns 400 when venueId is missing", async () => {
    mockAdminSession();
    const res = await POST(
      req.post("/api/admin/events", { date: "2025-06-01" })
    );
    await assertError(res, 400, "Venue and date are required");
  });

  it("returns 400 when date is missing", async () => {
    mockAdminSession();
    const res = await POST(req.post("/api/admin/events", { venueId: "v1" }));
    await assertError(res, 400, "Venue and date are required");
  });

  it("creates event with required fields only", async () => {
    mockAdminSession();
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    const res = await POST(
      req.post("/api/admin/events", { venueId: "v1", date: "2025-06-01" })
    );
    await assertCreated(res);

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        venueId: "v1",
        date: new Date("2025-06-01"),
        showtime: null,
        ticketUrl: null,
        priceMin: null,
        priceMax: null,
        showType: "HEADLINE",
        title: null,
      }),
      include: expect.objectContaining({
        venue: true,
        comedians: { include: { comedian: true } },
      }),
    });
  });

  it("creates event with all optional fields", async () => {
    mockAdminSession();
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    await POST(
      req.post("/api/admin/events", {
        venueId: "v1",
        date: "2025-06-01",
        showtime: "8:00 PM",
        ticketUrl: "https://tickets.com/show",
        priceMin: "25",
        priceMax: "50",
        showType: "FESTIVAL",
        title: "Summer Laughs",
      })
    );

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        showtime: "8:00 PM",
        ticketUrl: "https://tickets.com/show",
        priceMin: 25,
        priceMax: 50,
        showType: "FESTIVAL",
        title: "Summer Laughs",
      }),
      include: expect.any(Object),
    });
  });

  it("creates event with comedian assignments", async () => {
    mockAdminSession();
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [
        { comedianId: "c1", role: "headline", comedian: factories.comedian() },
        { comedianId: "c2", role: "feature", comedian: factories.comedian() },
      ],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    await POST(
      req.post("/api/admin/events", {
        venueId: "v1",
        date: "2025-06-01",
        comedianIds: ["c1", "c2"],
      })
    );

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        comedians: {
          create: [
            { comedianId: "c1", role: "headline" },
            { comedianId: "c2", role: "feature" },
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it("assigns first comedian as headline and rest as feature", async () => {
    mockAdminSession();
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    await POST(
      req.post("/api/admin/events", {
        venueId: "v1",
        date: "2025-06-01",
        comedianIds: ["c1", "c2", "c3"],
      })
    );

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        comedians: {
          create: [
            { comedianId: "c1", role: "headline" },
            { comedianId: "c2", role: "feature" },
            { comedianId: "c3", role: "feature" },
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it("sets null for empty string optional fields", async () => {
    mockAdminSession();
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    await POST(
      req.post("/api/admin/events", {
        venueId: "v1",
        date: "2025-06-01",
        showtime: "",
        ticketUrl: "",
        title: "",
      })
    );

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        showtime: null,
        ticketUrl: null,
        title: null,
      }),
      include: expect.any(Object),
    });
  });

  it("fires notification generation after creation", async () => {
    mockAdminSession();
    const { generateEventNotifications } = await import("@/lib/notifications");
    const createdEvent = {
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as never);

    await POST(
      req.post("/api/admin/events", { venueId: "v1", date: "2025-06-01" })
    );

    expect(generateEventNotifications).toHaveBeenCalledWith(createdEvent);
  });
});
