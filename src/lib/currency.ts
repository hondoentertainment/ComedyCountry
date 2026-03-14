import { prisma } from "./prisma";

/**
 * Phase 18: Multi-Currency Support
 * Conversion rates, display formatting, Stripe currency handling.
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  stripeSupported: boolean;
  stripeMinAmount: number; // minimum charge amount in smallest unit
}

export interface ConversionResult {
  from: string;
  to: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  formattedOriginal: string;
  formattedConverted: string;
}

/* ─── Supported Currencies ────────────────────────────────────────────── */

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", decimals: 2, stripeSupported: true, stripeMinAmount: 30 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", decimals: 0, stripeSupported: true, stripeMinAmount: 50 },
  { code: "KRW", name: "South Korean Won", symbol: "\u20A9", decimals: 0, stripeSupported: true, stripeMinAmount: 1000 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", decimals: 2, stripeSupported: true, stripeMinAmount: 1000 },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", decimals: 2, stripeSupported: false, stripeMinAmount: 0 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", decimals: 2, stripeSupported: true, stripeMinAmount: 200 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2, stripeSupported: true, stripeMinAmount: 300 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2, stripeSupported: true, stripeMinAmount: 50 },
];

/* ─── Get currency info ───────────────────────────────────────────────── */

export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return SUPPORTED_CURRENCIES.find(
    (c) => c.code === code.toUpperCase(),
  );
}

/* ─── Format currency amount ──────────────────────────────────────────── */

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string = "en",
): string {
  const info = getCurrencyInfo(currencyCode);

  if (!info) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  const formatted = amount.toFixed(info.decimals);
  const parts = formatted.split(".");
  const intPart = parts[0];

  // Add thousands separator
  const groups: string[] = [];
  let remaining = intPart.replace("-", "");
  while (remaining.length > 3) {
    groups.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  groups.unshift(remaining);

  const separator = locale === "de" || locale === "fr" || locale === "es" || locale === "pt-BR" ? "." : ",";
  const decimalMark = separator === "." ? "," : ".";

  let display = groups.join(separator);
  if (info.decimals > 0) {
    display += decimalMark + (parts[1] || "0".repeat(info.decimals));
  }

  const isNeg = amount < 0;
  if (isNeg) display = display.replace("-", "");

  const result = `${info.symbol}${display}`;
  return isNeg ? `-${result}` : result;
}

/* ─── Convert currency using database rates ───────────────────────────── */

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<ConversionResult> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    return {
      from: fromUpper,
      to: toUpper,
      originalAmount: amount,
      convertedAmount: amount,
      rate: 1,
      formattedOriginal: formatCurrency(amount, fromUpper),
      formattedConverted: formatCurrency(amount, toUpper),
    };
  }

  // Try direct rate
  let rate: number | null = null;

  const direct = await prisma.currencyRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: fromUpper, toCurrency: toUpper },
    },
  });

  if (direct) {
    rate = direct.rate;
  } else {
    // Try inverse rate
    const inverse = await prisma.currencyRate.findUnique({
      where: {
        fromCurrency_toCurrency: { fromCurrency: toUpper, toCurrency: fromUpper },
      },
    });

    if (inverse && inverse.rate !== 0) {
      rate = 1 / inverse.rate;
    }
  }

  if (rate === null) {
    // Try USD as intermediary
    const fromToUSD = await prisma.currencyRate.findUnique({
      where: {
        fromCurrency_toCurrency: { fromCurrency: fromUpper, toCurrency: "USD" },
      },
    });

    const usdToTarget = await prisma.currencyRate.findUnique({
      where: {
        fromCurrency_toCurrency: { fromCurrency: "USD", toCurrency: toUpper },
      },
    });

    if (fromToUSD && usdToTarget) {
      rate = fromToUSD.rate * usdToTarget.rate;
    }
  }

  if (rate === null) {
    throw new Error(`No exchange rate found for ${fromUpper} -> ${toUpper}`);
  }

  const convertedAmount = Math.round(amount * rate * 100) / 100;

  return {
    from: fromUpper,
    to: toUpper,
    originalAmount: amount,
    convertedAmount,
    rate,
    formattedOriginal: formatCurrency(amount, fromUpper),
    formattedConverted: formatCurrency(convertedAmount, toUpper),
  };
}

/* ─── Stripe currency helpers ─────────────────────────────────────────── */

/**
 * Convert a display amount to Stripe's smallest unit amount.
 * e.g., $10.50 USD -> 1050 (cents), 1000 JPY -> 1000 (yen, no decimals)
 */
export function toStripeAmount(amount: number, currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  if (!info) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }
  if (!info.stripeSupported) {
    throw new Error(`Currency ${currencyCode} is not supported by Stripe`);
  }

  return Math.round(amount * Math.pow(10, info.decimals));
}

/**
 * Convert a Stripe smallest-unit amount back to display amount.
 * e.g., 1050 cents USD -> $10.50, 1000 JPY -> 1000
 */
export function fromStripeAmount(
  stripeAmount: number,
  currencyCode: string,
): number {
  const info = getCurrencyInfo(currencyCode);
  if (!info) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }

  return stripeAmount / Math.pow(10, info.decimals);
}

/**
 * Check if an amount meets Stripe's minimum charge for a currency.
 */
export function meetsStripeMinimum(
  amount: number,
  currencyCode: string,
): boolean {
  const info = getCurrencyInfo(currencyCode);
  if (!info || !info.stripeSupported) return false;

  const stripeAmount = toStripeAmount(amount, currencyCode);
  return stripeAmount >= info.stripeMinAmount;
}

/**
 * Get the minimum charge amount in display currency.
 */
export function getStripeMinimumAmount(currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  if (!info || !info.stripeSupported) {
    throw new Error(`Currency ${currencyCode} is not supported by Stripe`);
  }

  return info.stripeMinAmount / Math.pow(10, info.decimals);
}

/**
 * Get all Stripe-supported currencies.
 */
export function getStripeSupportedCurrencies(): CurrencyInfo[] {
  return SUPPORTED_CURRENCIES.filter((c) => c.stripeSupported);
}

/* ─── Bulk rate fetching ──────────────────────────────────────────────── */

export async function getAllRatesForCurrency(
  baseCurrency: string,
): Promise<Record<string, number>> {
  const rates = await prisma.currencyRate.findMany({
    where: { fromCurrency: baseCurrency.toUpperCase() },
  });

  const result: Record<string, number> = {};
  for (const rate of rates) {
    result[rate.toCurrency] = rate.rate;
  }

  return result;
}

export async function getConversionTable(
  baseCurrency: string,
  amount: number,
): Promise<Array<{ currency: string; amount: number; formatted: string }>> {
  const rates = await getAllRatesForCurrency(baseCurrency);

  const results: Array<{ currency: string; amount: number; formatted: string }> = [
    {
      currency: baseCurrency.toUpperCase(),
      amount,
      formatted: formatCurrency(amount, baseCurrency),
    },
  ];

  for (const [currency, rate] of Object.entries(rates)) {
    const converted = Math.round(amount * rate * 100) / 100;
    results.push({
      currency,
      amount: converted,
      formatted: formatCurrency(converted, currency),
    });
  }

  return results;
}
