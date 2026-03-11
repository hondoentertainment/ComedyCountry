import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    ticketTransfer: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  ticket: { findUnique: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  ticketTransfer: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

function createPostRequest(body: unknown) {
  return new Request("http://localhost/api/tickets/transfer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/tickets/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "sender@example.com", name: "Sender" },
      expires: "",
    });
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: "ticket-1",
      userId: "user-1",
      status: "VALID",
      eventId: "event-1",
      ticketTypeId: "tt-1",
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.ticketTransfer.create.mockResolvedValue({
      id: "transfer-1",
      ticketId: "ticket-1",
      fromUserId: "user-1",
      toEmail: "friend@example.com",
      toUserId: null,
      message: null,
      status: "pending",
      token: "some-token",
      expiresAt: new Date(),
      createdAt: new Date(),
      acceptedAt: null,
      ticket: {
        id: "ticket-1",
        event: { id: "event-1", venue: { id: "venue-1" } },
        ticketType: { id: "tt-1" },
      },
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(createPostRequest({ ticketId: "ticket-1", toEmail: "friend@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when ticketId is missing", async () => {
    const res = await POST(createPostRequest({ toEmail: "friend@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("ticketId is required");
  });

  it("returns 400 when toEmail is missing", async () => {
    const res = await POST(createPostRequest({ ticketId: "ticket-1" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("toEmail is required");
  });

  it("returns 404 when ticket not found", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ ticketId: "bad-id", toEmail: "friend@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Ticket not found or not owned by you");
  });

  it("returns 404 when ticket not owned by user", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: "ticket-1",
      userId: "other-user",
      status: "VALID",
    });

    const res = await POST(createPostRequest({ ticketId: "ticket-1", toEmail: "friend@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Ticket not found or not owned by you");
  });

  it("returns 400 when ticket is not VALID", async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: "ticket-1",
      userId: "user-1",
      status: "USED",
    });

    const res = await POST(createPostRequest({ ticketId: "ticket-1", toEmail: "friend@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Ticket is not eligible for transfer");
  });

  it("returns 201 on successful transfer creation", async () => {
    const res = await POST(createPostRequest({
      ticketId: "ticket-1",
      toEmail: "friend@example.com",
      message: "Enjoy the show!",
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("transfer-1");
    expect(data.ticketId).toBe("ticket-1");
    expect(data.toEmail).toBe("friend@example.com");
    expect(mockPrisma.ticketTransfer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: "ticket-1",
        fromUserId: "user-1",
        toEmail: "friend@example.com",
        message: "Enjoy the show!",
      }),
      include: expect.any(Object),
    });
  });

  it("resolves recipient user ID when recipient has an account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "recipient-1",
      email: "friend@example.com",
    });

    await POST(createPostRequest({ ticketId: "ticket-1", toEmail: "friend@example.com" }));

    expect(mockPrisma.ticketTransfer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toUserId: "recipient-1",
      }),
      include: expect.any(Object),
    });
  });

  it("sets toUserId to null when recipient has no account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await POST(createPostRequest({ ticketId: "ticket-1", toEmail: "newuser@example.com" }));

    expect(mockPrisma.ticketTransfer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toUserId: null,
      }),
      include: expect.any(Object),
    });
  });
});

describe("GET /api/tickets/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "sender@example.com", name: "Sender" },
      expires: "",
    });
    mockPrisma.ticketTransfer.findMany.mockResolvedValue([]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns sent and received transfers for the user", async () => {
    const sentTransfer = {
      id: "t-1",
      ticketId: "ticket-1",
      fromUserId: "user-1",
      toEmail: "friend@example.com",
      status: "pending",
      ticket: { id: "ticket-1", event: { id: "e-1", venue: {} }, ticketType: {} },
    };
    const receivedTransfer = {
      id: "t-2",
      ticketId: "ticket-2",
      fromUserId: "user-2",
      toEmail: "sender@example.com",
      status: "pending",
      ticket: { id: "ticket-2", event: { id: "e-2", venue: {} }, ticketType: {} },
      fromUser: { id: "user-2", name: "Other", email: "other@example.com", image: null },
    };

    mockPrisma.ticketTransfer.findMany
      .mockResolvedValueOnce([sentTransfer])
      .mockResolvedValueOnce([receivedTransfer]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sent).toHaveLength(1);
    expect(data.sent[0].id).toBe("t-1");
    expect(data.received).toHaveLength(1);
    expect(data.received[0].id).toBe("t-2");
  });

  it("returns empty arrays when user has no transfers", async () => {
    mockPrisma.ticketTransfer.findMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sent).toEqual([]);
    expect(data.received).toEqual([]);
  });
});
