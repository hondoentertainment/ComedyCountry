import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { POST } from "./route";

const session = { user: { id: "user-1", email: "test@test.com" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/stripe/checkout", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ plan: "FAN_PRO" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ plan: "INVALID" }),
    }));
    expect(res.status).toBe(400);
  });

  it("creates demo subscription when Stripe is not configured", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(isStripeConfigured).mockReturnValue(false);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ plan: "FAN_PRO" }),
    }));
    const data = await res.json();
    expect(data.mode).toBe("demo");
    expect(prisma.subscription.upsert).toHaveBeenCalled();
  });
});
