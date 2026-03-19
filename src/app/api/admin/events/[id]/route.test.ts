import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { req, routeParams, factories, assertOk, assertError } from "@/test";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventComedian: {
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

const params = routeParams({ id: "event-1" });

describe("GET /api/admin/events/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(req.get("/api/admin/events/event-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await GET(req.get("/api/admin/events/event-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("returns 404 when event not found", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const res = await GET(
      req.get("/api/admin/events/nonexistent"),
      routeParams({ id: "nonexistent" })
    );
    await assertError(res, 404, "Event not found");
  });

  it("returns event with venue and comedian data", async () => {
    mockAdminSession();
    const event = {
      ...factories.event({ id: "event-1" }),
      venue: factories.venue(),
      comedians: [
        { comedian: factories.comedian(), role: "headline" },
      ],
      _count: { reviews: 5 },
    };
    vi.mocked(prisma.event.findUnique).mockResolvedValue(event as never);

    const res = await GET(req.get("/api/admin/events/event-1"), params);
    await assertOk(res, (data: { id: string }) => {
      expect(data.id).toBe("event-1");
    });

    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: "event-1" },
      include: {
        venue: true,
        comedians: { include: { comedian: true } },
        _count: { select: { reviews: true } },
      },
    });
  });
});

describe("PATCH /api/admin/events/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await PATCH(
      req.patch("/api/admin/events/event-1", { title: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await PATCH(
      req.patch("/api/admin/events/event-1", { title: "Updated" }),
      params
    );
    await assertError(res, 401, "Not authorized");
  });

  it("updates event title", async () => {
    mockAdminSession();
    const updated = {
      ...factories.event({ title: "Updated Title" }),
      venue: factories.venue(),
      comedians: [],
    };
    vi.mocked(prisma.event.update).mockResolvedValue(updated as never);

    const res = await PATCH(
      req.patch("/api/admin/events/event-1", { title: "Updated Title" }),
      params
    );
    await assertOk(res, (data: { title: string }) => {
      expect(data.title).toBe("Updated Title");
    });
  });

  it("updates multiple fields at once", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.update).mockResolvedValue({
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    } as never);

    await PATCH(
      req.patch("/api/admin/events/event-1", {
        venueId: "v2",
        date: "2025-07-01",
        showtime: "9:00 PM",
        ticketUrl: "https://tickets.com/new",
        priceMin: "30",
        priceMax: "60",
        showType: "OPEN_MIC",
        title: "Open Mic Night",
      }),
      params
    );

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        venueId: "v2",
        date: new Date("2025-07-01"),
        showtime: "9:00 PM",
        ticketUrl: "https://tickets.com/new",
        priceMin: 30,
        priceMax: 60,
        showType: "OPEN_MIC",
        title: "Open Mic Night",
      },
      include: expect.any(Object),
    });
  });

  it("updates comedian assignments by deleting and recreating", async () => {
    mockAdminSession();
    vi.mocked(prisma.eventComedian.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.eventComedian.createMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.event.update).mockResolvedValue({
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    } as never);

    await PATCH(
      req.patch("/api/admin/events/event-1", {
        comedianIds: ["c1", "c2"],
      }),
      params
    );

    expect(prisma.eventComedian.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event-1" },
    });
    expect(prisma.eventComedian.createMany).toHaveBeenCalledWith({
      data: [
        { eventId: "event-1", comedianId: "c1", role: "headline" },
        { eventId: "event-1", comedianId: "c2", role: "feature" },
      ],
    });
  });

  it("clears comedian assignments when empty array provided", async () => {
    mockAdminSession();
    vi.mocked(prisma.eventComedian.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.event.update).mockResolvedValue({
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    } as never);

    await PATCH(
      req.patch("/api/admin/events/event-1", { comedianIds: [] }),
      params
    );

    expect(prisma.eventComedian.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event-1" },
    });
    expect(prisma.eventComedian.createMany).not.toHaveBeenCalled();
  });

  it("sets null for empty optional string fields", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.update).mockResolvedValue({
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    } as never);

    await PATCH(
      req.patch("/api/admin/events/event-1", {
        showtime: "",
        ticketUrl: "",
        title: "",
      }),
      params
    );

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({
        showtime: null,
        ticketUrl: null,
        title: null,
      }),
      include: expect.any(Object),
    });
  });

  it("only includes defined fields in update data", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.update).mockResolvedValue({
      ...factories.event(),
      venue: factories.venue(),
      comedians: [],
    } as never);

    await PATCH(
      req.patch("/api/admin/events/event-1", { title: "Only Title" }),
      params
    );

    const callData = vi.mocked(prisma.event.update).mock.calls[0][0].data as Record<string, unknown>;
    expect(callData).toEqual({ title: "Only Title" });
    expect(callData).not.toHaveProperty("venueId");
    expect(callData).not.toHaveProperty("date");
  });
});

describe("DELETE /api/admin/events/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(req.delete("/api/admin/events/event-1"), params);
    await assertError(res, 401, "Not authenticated");
  });

  it("returns 401 when not admin", async () => {
    mockUserSession();
    const res = await DELETE(req.delete("/api/admin/events/event-1"), params);
    await assertError(res, 401, "Not authorized");
  });

  it("deletes event and returns confirmation", async () => {
    mockAdminSession();
    vi.mocked(prisma.event.delete).mockResolvedValue({} as never);

    const res = await DELETE(req.delete("/api/admin/events/event-1"), params);
    await assertOk(res, (data: { deleted: boolean }) => {
      expect(data.deleted).toBe(true);
    });

    expect(prisma.event.delete).toHaveBeenCalledWith({
      where: { id: "event-1" },
    });
  });
});
