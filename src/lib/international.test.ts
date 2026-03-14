import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getInternationalScenes,
  getSceneByCity,
  createInternationalScene,
  getFestivalCircuit,
  getFestivalById,
  createFestival,
  getUpcomingFestivals,
  getComedyStyles,
  createComedyStyle,
  getComedyStyleByName,
  convertCurrency,
  updateCurrencyRates,
  getCurrencyRate,
  getTouringInfo,
  createTouringInfo,
  getAllTouringInfo,
  submitPromoterApplication,
  getPromoterApplications,
  updatePromoterStatus,
  getTranslation,
  getTranslations,
  setTranslation,
  getSupportedLocales,
  getLocaleCompleteness,
} from "./international";

vi.mock("./prisma", () => ({
  prisma: {
    internationalScene: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    festivalCircuit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    comedyStyle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    currencyRate: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    touringInfo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    promoterApplication: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    translationKey: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  internationalScene: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  festivalCircuit: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  comedyStyle: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  currencyRate: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  touringInfo: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  promoterApplication: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  translationKey: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("international", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── International Scenes ─────────────────────────────────────────── */

  describe("getInternationalScenes", () => {
    it("returns all scenes without filters", async () => {
      mockPrisma.internationalScene.findMany.mockResolvedValue([
        { id: "s1", city: "London", country: "United Kingdom" },
        { id: "s2", city: "Melbourne", country: "Australia" },
      ]);

      const scenes = await getInternationalScenes();
      expect(scenes).toHaveLength(2);
      expect(mockPrisma.internationalScene.findMany).toHaveBeenCalledWith({
        where: {},
        include: { festivals: true },
        orderBy: { city: "asc" },
      });
    });

    it("filters by country", async () => {
      mockPrisma.internationalScene.findMany.mockResolvedValue([
        { id: "s1", city: "London", country: "United Kingdom" },
      ]);

      await getInternationalScenes({ country: "United Kingdom" });
      expect(mockPrisma.internationalScene.findMany).toHaveBeenCalledWith({
        where: { country: "United Kingdom" },
        include: { festivals: true },
        orderBy: { city: "asc" },
      });
    });

    it("filters by region", async () => {
      mockPrisma.internationalScene.findMany.mockResolvedValue([]);

      await getInternationalScenes({ region: "Europe" });
      expect(mockPrisma.internationalScene.findMany).toHaveBeenCalledWith({
        where: { region: "Europe" },
        include: { festivals: true },
        orderBy: { city: "asc" },
      });
    });

    it("filters by active status", async () => {
      mockPrisma.internationalScene.findMany.mockResolvedValue([]);

      await getInternationalScenes({ isActive: true });
      expect(mockPrisma.internationalScene.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { festivals: true },
        orderBy: { city: "asc" },
      });
    });
  });

  describe("getSceneByCity", () => {
    it("returns a scene by city and country", async () => {
      mockPrisma.internationalScene.findUnique.mockResolvedValue({
        id: "s1",
        city: "London",
        country: "United Kingdom",
      });

      const scene = await getSceneByCity("London", "United Kingdom");
      expect(scene?.city).toBe("London");
      expect(mockPrisma.internationalScene.findUnique).toHaveBeenCalledWith({
        where: { city_country: { city: "London", country: "United Kingdom" } },
        include: { festivals: true },
      });
    });

    it("returns null for non-existent scene", async () => {
      mockPrisma.internationalScene.findUnique.mockResolvedValue(null);

      const scene = await getSceneByCity("Atlantis", "Nowhere");
      expect(scene).toBeNull();
    });
  });

  describe("createInternationalScene", () => {
    it("creates a new scene", async () => {
      const data = {
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
        timezone: "Asia/Tokyo",
        currency: "JPY",
        language: "ja",
      };
      mockPrisma.internationalScene.create.mockResolvedValue({
        id: "s3",
        ...data,
      });

      const scene = await createInternationalScene(data);
      expect(scene.city).toBe("Tokyo");
      expect(mockPrisma.internationalScene.create).toHaveBeenCalledWith({
        data,
      });
    });

    it("creates a scene with minimal fields", async () => {
      const data = {
        city: "Berlin",
        country: "Germany",
        countryCode: "DE",
        timezone: "Europe/Berlin",
      };
      mockPrisma.internationalScene.create.mockResolvedValue({
        id: "s4",
        ...data,
      });

      const scene = await createInternationalScene(data);
      expect(scene.countryCode).toBe("DE");
    });
  });

  /* ─── Festival Circuit ─────────────────────────────────────────────── */

  describe("getFestivalCircuit", () => {
    it("returns all festivals without filters", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([
        { id: "f1", name: "Edinburgh Fringe" },
      ]);

      const festivals = await getFestivalCircuit();
      expect(festivals).toHaveLength(1);
    });

    it("filters by country and category", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getFestivalCircuit({ country: "UK", category: "fringe" });
      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { country: "UK", category: "fringe" },
        }),
      );
    });

    it("filters by date range", async () => {
      const startDate = new Date("2026-06-01");
      const endDate = new Date("2026-09-01");
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getFestivalCircuit({ startDate, endDate });
      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          },
        }),
      );
    });
  });

  describe("getFestivalById", () => {
    it("returns a festival by id", async () => {
      mockPrisma.festivalCircuit.findUnique.mockResolvedValue({
        id: "f1",
        name: "Edinburgh Fringe",
      });

      const festival = await getFestivalById("f1");
      expect(festival?.name).toBe("Edinburgh Fringe");
    });

    it("returns null for non-existent festival", async () => {
      mockPrisma.festivalCircuit.findUnique.mockResolvedValue(null);
      const festival = await getFestivalById("nonexistent");
      expect(festival).toBeNull();
    });
  });

  describe("createFestival", () => {
    it("creates a new festival", async () => {
      const data = {
        name: "Melbourne Comedy Festival",
        city: "Melbourne",
        country: "Australia",
        countryCode: "AU",
        category: "standup",
        startDate: new Date("2026-03-25"),
      };
      mockPrisma.festivalCircuit.create.mockResolvedValue({ id: "f2", ...data });

      const festival = await createFestival(data);
      expect(festival.name).toBe("Melbourne Comedy Festival");
    });
  });

  describe("getUpcomingFestivals", () => {
    it("returns upcoming festivals with default limit", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([
        { id: "f1", name: "Edinburgh Fringe", startDate: new Date("2026-08-01") },
      ]);

      const festivals = await getUpcomingFestivals();
      expect(festivals).toHaveLength(1);
      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it("respects custom limit", async () => {
      mockPrisma.festivalCircuit.findMany.mockResolvedValue([]);

      await getUpcomingFestivals(5);
      expect(mockPrisma.festivalCircuit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  /* ─── Comedy Styles ────────────────────────────────────────────────── */

  describe("getComedyStyles", () => {
    it("returns all styles without country filter", async () => {
      mockPrisma.comedyStyle.findMany.mockResolvedValue([
        { id: "cs1", name: "Manzai", country: "Japan" },
        { id: "cs2", name: "UK Panel Show", country: "United Kingdom" },
      ]);

      const styles = await getComedyStyles();
      expect(styles).toHaveLength(2);
    });

    it("filters by country", async () => {
      mockPrisma.comedyStyle.findMany.mockResolvedValue([]);

      await getComedyStyles("Japan");
      expect(mockPrisma.comedyStyle.findMany).toHaveBeenCalledWith({
        where: { country: "Japan" },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("createComedyStyle", () => {
    it("creates a comedy style with examples", async () => {
      const data = {
        name: "Manzai",
        country: "Japan",
        description: "Traditional Japanese double-act comedy",
        examples: ["Downtown", "Sandwichman"],
        relatedGenres: ["tsukkomi-boke"],
      };
      mockPrisma.comedyStyle.create.mockResolvedValue({ id: "cs3", ...data });

      const style = await createComedyStyle(data);
      expect(style.name).toBe("Manzai");
    });

    it("defaults examples and relatedGenres to empty arrays", async () => {
      const data = {
        name: "Test Style",
        country: "Test",
        description: "A test",
      };
      mockPrisma.comedyStyle.create.mockResolvedValue({
        id: "cs4",
        ...data,
        examples: [],
        relatedGenres: [],
      });

      await createComedyStyle(data);
      expect(mockPrisma.comedyStyle.create).toHaveBeenCalledWith({
        data: { ...data, examples: [], relatedGenres: [] },
      });
    });
  });

  describe("getComedyStyleByName", () => {
    it("returns a style by name", async () => {
      mockPrisma.comedyStyle.findUnique.mockResolvedValue({
        id: "cs1",
        name: "UK Panel Show",
      });

      const style = await getComedyStyleByName("UK Panel Show");
      expect(style?.name).toBe("UK Panel Show");
    });
  });

  /* ─── Currency Conversion ──────────────────────────────────────────── */

  describe("convertCurrency", () => {
    it("returns same amount when from equals to", async () => {
      const result = await convertCurrency(100, "USD", "USD");
      expect(result).toEqual({ amount: 100, converted: 100, rate: 1 });
    });

    it("converts using direct rate", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue({
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
      });

      const result = await convertCurrency(100, "USD", "GBP");
      expect(result.converted).toBeCloseTo(79);
      expect(result.rate).toBe(0.79);
    });

    it("converts using inverse rate when direct not found", async () => {
      mockPrisma.currencyRate.findUnique
        .mockResolvedValueOnce(null) // direct lookup fails
        .mockResolvedValueOnce({
          fromCurrency: "GBP",
          toCurrency: "USD",
          rate: 1.27,
        }); // inverse lookup

      const result = await convertCurrency(100, "USD", "GBP");
      expect(result.converted).toBeCloseTo(100 / 1.27);
    });

    it("throws when no rate found", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue(null);

      await expect(convertCurrency(100, "USD", "XYZ")).rejects.toThrow(
        "No exchange rate found for USD -> XYZ",
      );
    });

    it("throws when inverse rate is zero", async () => {
      mockPrisma.currencyRate.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          fromCurrency: "XYZ",
          toCurrency: "USD",
          rate: 0,
        });

      await expect(convertCurrency(100, "USD", "XYZ")).rejects.toThrow(
        "No exchange rate found for USD -> XYZ",
      );
    });
  });

  describe("updateCurrencyRates", () => {
    it("batch upserts currency rates", async () => {
      mockPrisma.currencyRate.upsert.mockResolvedValue({ id: "cr1" });

      const rates = [
        { fromCurrency: "USD", toCurrency: "GBP", rate: 0.79 },
        { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92 },
      ];
      const results = await updateCurrencyRates(rates);
      expect(results).toHaveLength(2);
      expect(mockPrisma.currencyRate.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCurrencyRate", () => {
    it("returns a currency rate", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue({
        fromCurrency: "USD",
        toCurrency: "EUR",
        rate: 0.92,
      });

      const rate = await getCurrencyRate("USD", "EUR");
      expect(rate?.rate).toBe(0.92);
    });
  });

  /* ─── Touring Info ─────────────────────────────────────────────────── */

  describe("getTouringInfo", () => {
    it("returns touring info for a country", async () => {
      mockPrisma.touringInfo.findUnique.mockResolvedValue({
        country: "United Kingdom",
        visaRequired: true,
        visaType: "Tier 5",
      });

      const info = await getTouringInfo("United Kingdom");
      expect(info?.visaType).toBe("Tier 5");
    });

    it("returns null for unknown country", async () => {
      mockPrisma.touringInfo.findUnique.mockResolvedValue(null);
      const info = await getTouringInfo("Atlantis");
      expect(info).toBeNull();
    });
  });

  describe("createTouringInfo", () => {
    it("creates touring info", async () => {
      const data = {
        country: "United Kingdom",
        countryCode: "GB",
        visaRequired: true,
        visaType: "Tier 5",
        tips: ["Bring an umbrella"],
      };
      mockPrisma.touringInfo.create.mockResolvedValue({ id: "ti1", ...data });

      const info = await createTouringInfo(data);
      expect(info.country).toBe("United Kingdom");
    });

    it("defaults tips to empty array", async () => {
      const data = {
        country: "Canada",
        countryCode: "CA",
      };
      mockPrisma.touringInfo.create.mockResolvedValue({
        id: "ti2",
        ...data,
        tips: [],
      });

      await createTouringInfo(data);
      expect(mockPrisma.touringInfo.create).toHaveBeenCalledWith({
        data: { ...data, tips: [] },
      });
    });
  });

  describe("getAllTouringInfo", () => {
    it("returns all touring info", async () => {
      mockPrisma.touringInfo.findMany.mockResolvedValue([
        { country: "UK" },
        { country: "Canada" },
      ]);

      const all = await getAllTouringInfo();
      expect(all).toHaveLength(2);
    });
  });

  /* ─── Promoter Applications ────────────────────────────────────────── */

  describe("submitPromoterApplication", () => {
    it("creates a promoter application", async () => {
      const data = {
        name: "Jane Smith",
        email: "jane@example.com",
        city: "London",
        country: "United Kingdom",
        countryCode: "GB",
        company: "LaughCo",
      };
      mockPrisma.promoterApplication.create.mockResolvedValue({
        id: "pa1",
        status: "pending",
        ...data,
      });

      const app = await submitPromoterApplication(data);
      expect(app.status).toBe("pending");
    });
  });

  describe("getPromoterApplications", () => {
    it("returns all applications without filters", async () => {
      mockPrisma.promoterApplication.findMany.mockResolvedValue([
        { id: "pa1", status: "pending" },
      ]);

      const apps = await getPromoterApplications();
      expect(apps).toHaveLength(1);
    });

    it("filters by status", async () => {
      mockPrisma.promoterApplication.findMany.mockResolvedValue([]);

      await getPromoterApplications({ status: "approved" });
      expect(mockPrisma.promoterApplication.findMany).toHaveBeenCalledWith({
        where: { status: "approved" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("filters by country", async () => {
      mockPrisma.promoterApplication.findMany.mockResolvedValue([]);

      await getPromoterApplications({ country: "UK" });
      expect(mockPrisma.promoterApplication.findMany).toHaveBeenCalledWith({
        where: { country: "UK" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("updatePromoterStatus", () => {
    it("approves an application", async () => {
      mockPrisma.promoterApplication.update.mockResolvedValue({
        id: "pa1",
        status: "approved",
        notes: "Looks good",
      });

      const app = await updatePromoterStatus("pa1", "approved", "Looks good");
      expect(app.status).toBe("approved");
      expect(mockPrisma.promoterApplication.update).toHaveBeenCalledWith({
        where: { id: "pa1" },
        data: { status: "approved", notes: "Looks good" },
      });
    });

    it("rejects an application without notes", async () => {
      mockPrisma.promoterApplication.update.mockResolvedValue({
        id: "pa1",
        status: "rejected",
      });

      await updatePromoterStatus("pa1", "rejected");
      expect(mockPrisma.promoterApplication.update).toHaveBeenCalledWith({
        where: { id: "pa1" },
        data: { status: "rejected" },
      });
    });
  });

  /* ─── Translations ─────────────────────────────────────────────────── */

  describe("getTranslation", () => {
    it("returns a single translation", async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue({
        namespace: "common",
        key: "welcome",
        locale: "es",
        value: "Bienvenido",
      });

      const t = await getTranslation("common", "welcome", "es");
      expect(t?.value).toBe("Bienvenido");
    });

    it("returns null for missing translation", async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);
      const t = await getTranslation("common", "missing", "fr");
      expect(t).toBeNull();
    });
  });

  describe("getTranslations", () => {
    it("returns all translations for namespace and locale", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { key: "hello", value: "Hola" },
        { key: "goodbye", value: "Adios" },
      ]);

      const translations = await getTranslations("common", "es");
      expect(translations).toHaveLength(2);
    });
  });

  describe("setTranslation", () => {
    it("upserts a translation", async () => {
      mockPrisma.translationKey.upsert.mockResolvedValue({
        namespace: "common",
        key: "hello",
        locale: "fr",
        value: "Bonjour",
      });

      const t = await setTranslation("common", "hello", "fr", "Bonjour");
      expect(t.value).toBe("Bonjour");
    });
  });

  describe("getSupportedLocales", () => {
    it("returns distinct locales", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { locale: "en" },
        { locale: "es" },
        { locale: "fr" },
      ]);

      const locales = await getSupportedLocales();
      expect(locales).toEqual(["en", "es", "fr"]);
    });
  });

  describe("getLocaleCompleteness", () => {
    it("calculates percentage of translated keys", async () => {
      mockPrisma.translationKey.count
        .mockResolvedValueOnce(100) // total en keys
        .mockResolvedValueOnce(75); // translated es keys

      const result = await getLocaleCompleteness("es");
      expect(result.percentage).toBe(75);
      expect(result.total).toBe(100);
      expect(result.translated).toBe(75);
    });

    it("returns 100% when no baseline keys exist", async () => {
      mockPrisma.translationKey.count.mockResolvedValueOnce(0);

      const result = await getLocaleCompleteness("ja");
      expect(result.percentage).toBe(100);
    });
  });
});
