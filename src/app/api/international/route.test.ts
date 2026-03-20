import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/international", () => ({
  getInternationalScenes: vi.fn(),
  createInternationalScene: vi.fn(),
  getFestivalCircuit: vi.fn(),
  createFestival: vi.fn(),
  getUpcomingFestivals: vi.fn(),
  getFestivalById: vi.fn(),
  getComedyStyles: vi.fn(),
  createComedyStyle: vi.fn(),
  convertCurrency: vi.fn(),
  getAllTouringInfo: vi.fn(),
  createTouringInfo: vi.fn(),
  getTouringInfo: vi.fn(),
  getPromoterApplications: vi.fn(),
  submitPromoterApplication: vi.fn(),
  updatePromoterStatus: vi.fn(),
  getTranslations: vi.fn(),
  setTranslation: vi.fn(),
  getSupportedLocales: vi.fn(),
  getLocaleCompleteness: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    internationalScene: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  getInternationalScenes,
  createInternationalScene,
  getFestivalCircuit,
  createFestival,
  getUpcomingFestivals,
  getFestivalById,
  getComedyStyles,
  createComedyStyle,
  convertCurrency,
  getAllTouringInfo,
  createTouringInfo,
  getTouringInfo,
  getPromoterApplications,
  submitPromoterApplication,
  updatePromoterStatus,
  getTranslations,
  setTranslation,
  getSupportedLocales,
  getLocaleCompleteness,
} from "@/lib/international";

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  internationalScene: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

/* ─── Scenes ─────────────────────────────────────────────────────────── */

describe("GET /api/international/scenes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns scenes list", async () => {
    vi.mocked(getInternationalScenes).mockResolvedValue([
      { id: "s1", city: "London", country: "UK" },
    ] as never);

    const { GET } = await import("./scenes/route");
    const req = createRequest("http://localhost/api/international/scenes");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.scenes).toHaveLength(1);
  });

  it("passes country filter", async () => {
    vi.mocked(getInternationalScenes).mockResolvedValue([] as never);

    const { GET } = await import("./scenes/route");
    const req = createRequest("http://localhost/api/international/scenes?country=UK");
    await GET(req);

    expect(getInternationalScenes).toHaveBeenCalledWith({
      country: "UK",
      region: undefined,
    });
  });

  it("returns 500 on error", async () => {
    vi.mocked(getInternationalScenes).mockRejectedValue(new Error("DB error"));

    const { GET } = await import("./scenes/route");
    const req = createRequest("http://localhost/api/international/scenes");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/international/scenes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a scene", async () => {
    const sceneData = {
      city: "Tokyo",
      country: "Japan",
      countryCode: "JP",
      timezone: "Asia/Tokyo",
    };
    vi.mocked(createInternationalScene).mockResolvedValue({
      id: "s2",
      ...sceneData,
    } as never);

    const { POST } = await import("./scenes/route");
    const req = createRequest("http://localhost/api/international/scenes", {
      method: "POST",
      body: JSON.stringify(sceneData),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("./scenes/route");
    const req = createRequest("http://localhost/api/international/scenes", {
      method: "POST",
      body: JSON.stringify({ city: "Tokyo" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

/* ─── Scene by ID ────────────────────────────────────────────────────── */

describe("GET /api/international/scenes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a scene by id", async () => {
    mockPrisma.internationalScene.findUnique.mockResolvedValue({
      id: "s1",
      city: "London",
    });

    const { GET } = await import("./scenes/[id]/route");
    const req = createRequest("http://localhost/api/international/scenes/s1");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.city).toBe("London");
  });

  it("returns 404 for missing scene", async () => {
    mockPrisma.internationalScene.findUnique.mockResolvedValue(null);

    const { GET } = await import("./scenes/[id]/route");
    const req = createRequest("http://localhost/api/international/scenes/bad");
    const res = await GET(req, { params: Promise.resolve({ id: "bad" }) });

    expect(res.status).toBe(404);
  });
});

/* ─── Festivals ──────────────────────────────────────────────────────── */

describe("GET /api/international/festivals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns festivals list", async () => {
    vi.mocked(getFestivalCircuit).mockResolvedValue([
      { id: "f1", name: "Edinburgh Fringe" },
    ] as never);

    const { GET } = await import("./festivals/route");
    const req = createRequest("http://localhost/api/international/festivals");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.festivals).toHaveLength(1);
  });
});

describe("POST /api/international/festivals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a festival", async () => {
    vi.mocked(createFestival).mockResolvedValue({
      id: "f2",
      name: "Melbourne Comedy Fest",
    } as never);

    const { POST } = await import("./festivals/route");
    const req = createRequest("http://localhost/api/international/festivals", {
      method: "POST",
      body: JSON.stringify({
        name: "Melbourne Comedy Fest",
        city: "Melbourne",
        country: "Australia",
        countryCode: "AU",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./festivals/route");
    const req = createRequest("http://localhost/api/international/festivals", {
      method: "POST",
      body: JSON.stringify({ name: "Incomplete" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

/* ─── Festival by ID ─────────────────────────────────────────────────── */

describe("GET /api/international/festivals/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for missing festival", async () => {
    vi.mocked(getFestivalById).mockResolvedValue(null);

    const { GET } = await import("./festivals/[id]/route");
    const req = createRequest("http://localhost/api/international/festivals/bad");
    const res = await GET(req, { params: Promise.resolve({ id: "bad" }) });

    expect(res.status).toBe(404);
  });
});

/* ─── Upcoming Festivals ─────────────────────────────────────────────── */

describe("GET /api/international/festivals/upcoming", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns upcoming festivals", async () => {
    vi.mocked(getUpcomingFestivals).mockResolvedValue([
      { id: "f1", name: "Next Fest" },
    ] as never);

    const { GET } = await import("./festivals/upcoming/route");
    const req = createRequest("http://localhost/api/international/festivals/upcoming");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.festivals).toHaveLength(1);
  });
});

/* ─── Styles ─────────────────────────────────────────────────────────── */

describe("GET /api/international/styles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns comedy styles", async () => {
    vi.mocked(getComedyStyles).mockResolvedValue([
      { id: "cs1", name: "Manzai" },
    ] as never);

    const { GET } = await import("./styles/route");
    const req = createRequest("http://localhost/api/international/styles");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.styles).toHaveLength(1);
  });
});

describe("POST /api/international/styles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when description missing", async () => {
    const { POST } = await import("./styles/route");
    const req = createRequest("http://localhost/api/international/styles", {
      method: "POST",
      body: JSON.stringify({ name: "Test", country: "US" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

/* ─── Currency Convert ───────────────────────────────────────────────── */

describe("GET /api/international/currency/convert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("converts currency", async () => {
    vi.mocked(convertCurrency).mockResolvedValue({
      amount: 100,
      converted: 79,
      rate: 0.79,
    });

    const { GET } = await import("./currency/convert/route");
    const req = createRequest(
      "http://localhost/api/international/currency/convert?amount=100&from=USD&to=GBP",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.converted).toBe(79);
  });

  it("returns 400 when from/to missing", async () => {
    const { GET } = await import("./currency/convert/route");
    const req = createRequest(
      "http://localhost/api/international/currency/convert?amount=100",
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

/* ─── Touring ────────────────────────────────────────────────────────── */

describe("GET /api/international/touring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all touring info", async () => {
    vi.mocked(getAllTouringInfo).mockResolvedValue([
      { country: "UK" },
    ] as never);

    const { GET } = await import("./touring/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.touringInfo).toHaveLength(1);
  });
});

describe("GET /api/international/touring/[country]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for unknown country", async () => {
    vi.mocked(getTouringInfo).mockResolvedValue(null);

    const { GET } = await import("./touring/[country]/route");
    const req = createRequest("http://localhost/api/international/touring/Atlantis");
    const res = await GET(req, {
      params: Promise.resolve({ country: "Atlantis" }),
    });

    expect(res.status).toBe(404);
  });
});

/* ─── Promoters ──────────────────────────────────────────────────────── */

describe("POST /api/international/promoters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a promoter application", async () => {
    vi.mocked(submitPromoterApplication).mockResolvedValue({
      id: "pa1",
      status: "pending",
    } as never);

    const { POST } = await import("./promoters/route");
    const req = createRequest("http://localhost/api/international/promoters", {
      method: "POST",
      body: JSON.stringify({
        name: "Jane",
        email: "jane@example.com",
        city: "London",
        country: "UK",
        countryCode: "GB",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./promoters/route");
    const req = createRequest("http://localhost/api/international/promoters", {
      method: "POST",
      body: JSON.stringify({ name: "Jane" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/international/promoters/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates promoter status", async () => {
    vi.mocked(updatePromoterStatus).mockResolvedValue({
      id: "pa1",
      status: "approved",
    } as never);

    const { PATCH } = await import("./promoters/[id]/route");
    const req = createRequest("http://localhost/api/international/promoters/pa1", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "pa1" }) });

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status", async () => {
    const { PATCH } = await import("./promoters/[id]/route");
    const req = createRequest("http://localhost/api/international/promoters/pa1", {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "pa1" }) });

    expect(res.status).toBe(400);
  });
});

/* ─── Translations ───────────────────────────────────────────────────── */

describe("GET /api/international/translations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns translations for namespace+locale", async () => {
    vi.mocked(getTranslations).mockResolvedValue([
      { key: "hello", value: "Hola" },
    ] as never);

    const { GET } = await import("./translations/route");
    const req = createRequest(
      "http://localhost/api/international/translations?ns=common&locale=es",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.translations).toHaveLength(1);
  });

  it("returns 400 when ns or locale missing", async () => {
    const { GET } = await import("./translations/route");
    const req = createRequest(
      "http://localhost/api/international/translations?ns=common",
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

/* ─── Locales ────────────────────────────────────────────────────────── */

describe("GET /api/international/locales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns supported locales with completeness", async () => {
    vi.mocked(getSupportedLocales).mockResolvedValue(["en", "es"]);
    vi.mocked(getLocaleCompleteness)
      .mockResolvedValueOnce({
        locale: "en",
        total: 100,
        translated: 100,
        percentage: 100,
      })
      .mockResolvedValueOnce({
        locale: "es",
        total: 100,
        translated: 75,
        percentage: 75,
      });

    const { GET } = await import("./locales/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.locales).toHaveLength(2);
    expect(data.locales[1].percentage).toBe(75);
  });
});
