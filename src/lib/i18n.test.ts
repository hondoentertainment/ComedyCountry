import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectLocale,
  getLocaleConfig,
  translate,
  translateBatch,
  getNamespaceTranslations,
  formatNumber,
  formatInteger,
  formatDate,
  formatDateLong,
  formatTime,
  getAvailableLocales,
  checkLocaleCompleteness,
  isRTL,
  getSupportedLocalesList,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "./i18n";

vi.mock("./prisma", () => ({
  prisma: {
    translationKey: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  translationKey: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("i18n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SUPPORTED_LOCALES", () => {
    it("includes English as default", () => {
      expect(DEFAULT_LOCALE).toBe("en");
      const en = SUPPORTED_LOCALES.find((l) => l.code === "en");
      expect(en).toBeDefined();
      expect(en!.defaultCurrency).toBe("USD");
    });

    it("includes multiple locales", () => {
      expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(5);
    });

    it("includes RTL languages", () => {
      const rtl = SUPPORTED_LOCALES.filter((l) => l.direction === "rtl");
      expect(rtl.length).toBeGreaterThan(0);
    });
  });

  describe("detectLocale", () => {
    it("returns default locale when no header", () => {
      expect(detectLocale()).toBe("en");
      expect(detectLocale(null)).toBe("en");
    });

    it("detects exact locale match", () => {
      expect(detectLocale("fr")).toBe("fr");
      expect(detectLocale("de")).toBe("de");
      expect(detectLocale("ja")).toBe("ja");
    });

    it("detects locale from Accept-Language with quality", () => {
      expect(detectLocale("fr;q=0.8,en;q=0.9")).toBe("en");
      expect(detectLocale("fr;q=0.9,en;q=0.8")).toBe("fr");
    });

    it("matches base language", () => {
      // en-US should match en
      expect(detectLocale("en-US")).toBe("en");
    });

    it("handles complex Accept-Language headers", () => {
      expect(detectLocale("de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("de");
    });

    it("falls back to default for unsupported locale", () => {
      expect(detectLocale("xx-XX")).toBe("en");
    });

    it("handles empty string", () => {
      expect(detectLocale("")).toBe("en");
    });
  });

  describe("getLocaleConfig", () => {
    it("returns config for known locale", () => {
      const config = getLocaleConfig("fr");
      expect(config.code).toBe("fr");
      expect(config.name).toBe("French");
      expect(config.defaultCurrency).toBe("EUR");
    });

    it("returns config for locale with region", () => {
      const config = getLocaleConfig("en-GB");
      expect(config.code).toBe("en-GB");
      expect(config.defaultCurrency).toBe("GBP");
    });

    it("falls back to base language", () => {
      const config = getLocaleConfig("es-MX");
      expect(config.code).toBe("es");
    });

    it("returns default for unknown locale", () => {
      const config = getLocaleConfig("xx");
      expect(config.code).toBe("en");
    });
  });

  describe("translate", () => {
    it("returns translation for requested locale", async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue({
        value: "Bienvenue",
      });

      const result = await translate("common", "welcome", "fr");
      expect(result).toBe("Bienvenue");
    });

    it("falls back to default locale when translation missing", async () => {
      mockPrisma.translationKey.findUnique
        .mockResolvedValueOnce(null) // requested locale
        .mockResolvedValueOnce({ value: "Welcome" }); // fallback

      const result = await translate("common", "welcome", "ja");
      expect(result).toBe("Welcome");
    });

    it("returns key when no translation found", async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);

      const result = await translate("common", "missing_key", "fr");
      expect(result).toBe("missing_key");
    });

    it("does not look up fallback when locale is default", async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);

      const result = await translate("common", "key", "en");
      expect(result).toBe("key");
      expect(mockPrisma.translationKey.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("translateBatch", () => {
    it("translates multiple keys", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValueOnce([
        { key: "hello", value: "Hola" },
        { key: "goodbye", value: "Adios" },
      ]);

      const result = await translateBatch("common", ["hello", "goodbye"], "es");
      expect(result.hello).toBe("Hola");
      expect(result.goodbye).toBe("Adios");
    });

    it("falls back for missing keys", async () => {
      mockPrisma.translationKey.findMany
        .mockResolvedValueOnce([{ key: "hello", value: "Hola" }]) // es
        .mockResolvedValueOnce([{ key: "goodbye", value: "Goodbye" }]); // en fallback

      const result = await translateBatch("common", ["hello", "goodbye"], "es");
      expect(result.hello).toBe("Hola");
      expect(result.goodbye).toBe("Goodbye");
    });

    it("uses key name when no translation at all", async () => {
      mockPrisma.translationKey.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await translateBatch("common", ["missing"], "fr");
      expect(result.missing).toBe("missing");
    });
  });

  describe("getNamespaceTranslations", () => {
    it("returns all translations for namespace and locale", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { key: "title", value: "Titre" },
        { key: "subtitle", value: "Sous-titre" },
      ]);

      const result = await getNamespaceTranslations("home", "fr");
      expect(result.title).toBe("Titre");
      expect(result.subtitle).toBe("Sous-titre");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers for English locale", () => {
      expect(formatNumber(1234.56, "en")).toBe("1,234.56");
    });

    it("formats numbers for German locale", () => {
      expect(formatNumber(1234.56, "de")).toBe("1.234,56");
    });

    it("formats numbers for French locale", () => {
      expect(formatNumber(1234.56, "fr")).toBe("1 234,56");
    });

    it("handles small numbers", () => {
      expect(formatNumber(5.50, "en")).toBe("5.50");
    });

    it("handles large numbers", () => {
      expect(formatNumber(1000000.99, "en")).toBe("1,000,000.99");
    });

    it("handles negative numbers", () => {
      expect(formatNumber(-42.50, "en")).toBe("-42.50");
    });

    it("handles zero", () => {
      expect(formatNumber(0, "en")).toBe("0.00");
    });
  });

  describe("formatInteger", () => {
    it("formats integers with thousands separators", () => {
      expect(formatInteger(1234567, "en")).toBe("1,234,567");
    });

    it("formats for German locale", () => {
      expect(formatInteger(1234567, "de")).toBe("1.234.567");
    });

    it("handles small numbers", () => {
      expect(formatInteger(42, "en")).toBe("42");
    });

    it("handles negative numbers", () => {
      expect(formatInteger(-500, "en")).toBe("-500");
    });
  });

  describe("formatDate", () => {
    const date = new Date(2026, 2, 15); // March 15, 2026

    it("formats date for US English", () => {
      expect(formatDate(date, "en")).toBe("03/15/2026");
    });

    it("formats date for UK English", () => {
      expect(formatDate(date, "en-GB")).toBe("15/03/2026");
    });

    it("formats date for German", () => {
      expect(formatDate(date, "de")).toBe("15.03.2026");
    });

    it("formats date for Japanese", () => {
      expect(formatDate(date, "ja")).toBe("2026/03/15");
    });

    it("formats date for Chinese", () => {
      expect(formatDate(date, "zh")).toBe("2026-03-15");
    });
  });

  describe("formatDateLong", () => {
    it("returns a long date string", () => {
      const date = new Date(2026, 2, 15);
      const result = formatDateLong(date, "en");
      expect(result).toContain("2026");
      expect(result).toContain("March");
      expect(result).toContain("15");
    });
  });

  describe("formatTime", () => {
    it("returns a formatted time string", () => {
      const date = new Date(2026, 2, 15, 20, 30);
      const result = formatTime(date, "en");
      expect(result).toBeTruthy();
    });
  });

  describe("getAvailableLocales", () => {
    it("returns list of locale codes from database", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { locale: "en" },
        { locale: "fr" },
        { locale: "es" },
      ]);

      const result = await getAvailableLocales();
      expect(result).toEqual(["en", "fr", "es"]);
    });

    it("returns empty array when no translations exist", async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([]);

      const result = await getAvailableLocales();
      expect(result).toEqual([]);
    });
  });

  describe("checkLocaleCompleteness", () => {
    it("returns completeness stats", async () => {
      mockPrisma.translationKey.count
        .mockResolvedValueOnce(100) // en base keys
        .mockResolvedValueOnce(75); // fr translated keys

      const result = await checkLocaleCompleteness("fr");

      expect(result.locale).toBe("fr");
      expect(result.totalBaseKeys).toBe(100);
      expect(result.translatedKeys).toBe(75);
      expect(result.missingKeys).toBe(25);
      expect(result.completionPercentage).toBe(75);
    });

    it("returns 100% for default locale with no keys", async () => {
      mockPrisma.translationKey.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await checkLocaleCompleteness("en");

      expect(result.completionPercentage).toBe(100);
    });

    it("handles zero base keys for non-default locale", async () => {
      mockPrisma.translationKey.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await checkLocaleCompleteness("fr");

      expect(result.completionPercentage).toBe(0);
    });
  });

  describe("isRTL", () => {
    it("returns true for Arabic", () => {
      expect(isRTL("ar")).toBe(true);
    });

    it("returns false for English", () => {
      expect(isRTL("en")).toBe(false);
    });

    it("returns false for unknown locale (defaults to en)", () => {
      expect(isRTL("xx")).toBe(false);
    });
  });

  describe("getSupportedLocalesList", () => {
    it("returns all supported locales", () => {
      const locales = getSupportedLocalesList();
      expect(locales.length).toBe(SUPPORTED_LOCALES.length);
      expect(locales[0].code).toBe("en");
    });

    it("returns a copy, not the original", () => {
      const locales = getSupportedLocalesList();
      locales.pop();
      expect(getSupportedLocalesList().length).toBe(SUPPORTED_LOCALES.length);
    });
  });
});
