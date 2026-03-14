import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrencyInfo,
  formatCurrency,
  convertCurrency,
  toStripeAmount,
  fromStripeAmount,
  meetsStripeMinimum,
  getStripeMinimumAmount,
  getStripeSupportedCurrencies,
  getAllRatesForCurrency,
  getConversionTable,
  SUPPORTED_CURRENCIES,
} from "./currency";

vi.mock("./prisma", () => ({
  prisma: {
    currencyRate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  currencyRate: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("currency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("includes USD", () => {
      const usd = SUPPORTED_CURRENCIES.find((c) => c.code === "USD");
      expect(usd).toBeDefined();
      expect(usd!.symbol).toBe("$");
      expect(usd!.decimals).toBe(2);
    });

    it("includes zero-decimal currencies", () => {
      const jpy = SUPPORTED_CURRENCIES.find((c) => c.code === "JPY");
      expect(jpy).toBeDefined();
      expect(jpy!.decimals).toBe(0);
    });

    it("includes non-Stripe currencies", () => {
      const nonStripe = SUPPORTED_CURRENCIES.filter((c) => !c.stripeSupported);
      expect(nonStripe.length).toBeGreaterThan(0);
    });
  });

  describe("getCurrencyInfo", () => {
    it("returns info for valid currency", () => {
      const info = getCurrencyInfo("USD");
      expect(info).toBeDefined();
      expect(info!.code).toBe("USD");
    });

    it("handles lowercase input", () => {
      const info = getCurrencyInfo("eur");
      expect(info).toBeDefined();
      expect(info!.code).toBe("EUR");
    });

    it("returns undefined for unknown currency", () => {
      expect(getCurrencyInfo("XYZ")).toBeUndefined();
    });
  });

  describe("formatCurrency", () => {
    it("formats USD amount", () => {
      expect(formatCurrency(29.99, "USD")).toBe("$29.99");
    });

    it("formats large amounts with commas", () => {
      expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    });

    it("formats GBP", () => {
      expect(formatCurrency(15.00, "GBP")).toBe("\u00A315.00");
    });

    it("formats JPY without decimals", () => {
      expect(formatCurrency(1500, "JPY")).toBe("\u00A51,500");
    });

    it("formats EUR", () => {
      expect(formatCurrency(49.99, "EUR")).toBe("\u20AC49.99");
    });

    it("handles negative amounts", () => {
      expect(formatCurrency(-10.50, "USD")).toBe("-$10.50");
    });

    it("handles zero", () => {
      expect(formatCurrency(0, "USD")).toBe("$0.00");
    });

    it("formats unknown currency with fallback", () => {
      expect(formatCurrency(10.50, "XYZ")).toBe("10.50 XYZ");
    });

    it("formats very large amounts", () => {
      expect(formatCurrency(1000000.00, "USD")).toBe("$1,000,000.00");
    });
  });

  describe("convertCurrency", () => {
    it("returns same amount for same currency", async () => {
      const result = await convertCurrency(100, "USD", "USD");

      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
      expect(result.formattedOriginal).toBe("$100.00");
      expect(result.formattedConverted).toBe("$100.00");
    });

    it("converts using direct rate", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue({
        fromCurrency: "USD",
        toCurrency: "EUR",
        rate: 0.85,
      });

      const result = await convertCurrency(100, "USD", "EUR");

      expect(result.convertedAmount).toBe(85);
      expect(result.rate).toBe(0.85);
    });

    it("converts using inverse rate", async () => {
      mockPrisma.currencyRate.findUnique
        .mockResolvedValueOnce(null) // No direct rate
        .mockResolvedValueOnce({ // Inverse rate
          fromCurrency: "EUR",
          toCurrency: "USD",
          rate: 1.18,
        });

      const result = await convertCurrency(100, "USD", "EUR");

      expect(result.rate).toBeCloseTo(1 / 1.18, 5);
      expect(result.convertedAmount).toBeCloseTo(84.75, 1);
    });

    it("converts via USD intermediary", async () => {
      mockPrisma.currencyRate.findUnique
        .mockResolvedValueOnce(null) // No direct GBP -> JPY
        .mockResolvedValueOnce(null) // No inverse JPY -> GBP
        .mockResolvedValueOnce({ fromCurrency: "GBP", toCurrency: "USD", rate: 1.27 }) // GBP -> USD
        .mockResolvedValueOnce({ fromCurrency: "USD", toCurrency: "JPY", rate: 148.5 }); // USD -> JPY

      const result = await convertCurrency(100, "GBP", "JPY");

      expect(result.rate).toBeCloseTo(1.27 * 148.5, 1);
    });

    it("throws when no rate available", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue(null);

      await expect(convertCurrency(100, "XYZ", "ABC")).rejects.toThrow(
        "No exchange rate found",
      );
    });

    it("handles case insensitive codes", async () => {
      mockPrisma.currencyRate.findUnique.mockResolvedValue({
        fromCurrency: "USD",
        toCurrency: "EUR",
        rate: 0.85,
      });

      const result = await convertCurrency(100, "usd", "eur");
      expect(result.from).toBe("USD");
      expect(result.to).toBe("EUR");
    });
  });

  describe("toStripeAmount", () => {
    it("converts USD to cents", () => {
      expect(toStripeAmount(10.50, "USD")).toBe(1050);
    });

    it("converts JPY directly (zero decimals)", () => {
      expect(toStripeAmount(1000, "JPY")).toBe(1000);
    });

    it("handles rounding", () => {
      expect(toStripeAmount(10.999, "USD")).toBe(1100);
    });

    it("throws for unsupported currency", () => {
      expect(() => toStripeAmount(10, "XYZ")).toThrow("Unsupported currency");
    });

    it("throws for non-Stripe currency", () => {
      expect(() => toStripeAmount(10, "CNY")).toThrow("not supported by Stripe");
    });
  });

  describe("fromStripeAmount", () => {
    it("converts cents to USD", () => {
      expect(fromStripeAmount(1050, "USD")).toBe(10.50);
    });

    it("converts JPY directly", () => {
      expect(fromStripeAmount(1000, "JPY")).toBe(1000);
    });

    it("converts GBP pence to pounds", () => {
      expect(fromStripeAmount(500, "GBP")).toBe(5.00);
    });

    it("throws for unknown currency", () => {
      expect(() => fromStripeAmount(100, "XYZ")).toThrow("Unsupported currency");
    });
  });

  describe("meetsStripeMinimum", () => {
    it("returns true when above minimum", () => {
      expect(meetsStripeMinimum(1.00, "USD")).toBe(true); // 100 cents >= 50
    });

    it("returns false when below minimum", () => {
      expect(meetsStripeMinimum(0.10, "USD")).toBe(false); // 10 cents < 50
    });

    it("returns true at exact minimum", () => {
      expect(meetsStripeMinimum(0.50, "USD")).toBe(true); // 50 cents = 50
    });

    it("returns false for non-Stripe currency", () => {
      expect(meetsStripeMinimum(100, "CNY")).toBe(false);
    });

    it("handles zero-decimal currencies", () => {
      expect(meetsStripeMinimum(50, "JPY")).toBe(true); // 50 >= 50
      expect(meetsStripeMinimum(10, "JPY")).toBe(false); // 10 < 50
    });
  });

  describe("getStripeMinimumAmount", () => {
    it("returns minimum for USD", () => {
      expect(getStripeMinimumAmount("USD")).toBe(0.50);
    });

    it("returns minimum for JPY", () => {
      expect(getStripeMinimumAmount("JPY")).toBe(50);
    });

    it("returns minimum for GBP", () => {
      expect(getStripeMinimumAmount("GBP")).toBe(0.30);
    });

    it("throws for non-Stripe currency", () => {
      expect(() => getStripeMinimumAmount("CNY")).toThrow("not supported by Stripe");
    });
  });

  describe("getStripeSupportedCurrencies", () => {
    it("returns only Stripe-supported currencies", () => {
      const supported = getStripeSupportedCurrencies();
      expect(supported.every((c) => c.stripeSupported)).toBe(true);
      expect(supported.length).toBeGreaterThan(0);
      expect(supported.length).toBeLessThan(SUPPORTED_CURRENCIES.length);
    });
  });

  describe("getAllRatesForCurrency", () => {
    it("returns rates map", async () => {
      mockPrisma.currencyRate.findMany.mockResolvedValue([
        { fromCurrency: "USD", toCurrency: "EUR", rate: 0.85 },
        { fromCurrency: "USD", toCurrency: "GBP", rate: 0.73 },
      ]);

      const rates = await getAllRatesForCurrency("USD");

      expect(rates.EUR).toBe(0.85);
      expect(rates.GBP).toBe(0.73);
    });

    it("returns empty map when no rates", async () => {
      mockPrisma.currencyRate.findMany.mockResolvedValue([]);

      const rates = await getAllRatesForCurrency("XYZ");
      expect(Object.keys(rates)).toHaveLength(0);
    });
  });

  describe("getConversionTable", () => {
    it("returns conversion table with base currency", async () => {
      mockPrisma.currencyRate.findMany.mockResolvedValue([
        { fromCurrency: "USD", toCurrency: "EUR", rate: 0.85 },
        { fromCurrency: "USD", toCurrency: "GBP", rate: 0.73 },
      ]);

      const table = await getConversionTable("USD", 100);

      expect(table.length).toBe(3); // USD + EUR + GBP
      expect(table[0].currency).toBe("USD");
      expect(table[0].amount).toBe(100);
      expect(table[1].currency).toBe("EUR");
      expect(table[1].amount).toBe(85);
    });
  });
});
