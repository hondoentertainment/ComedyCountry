import { prisma } from "./prisma";

/**
 * Phase 18: Internationalization (i18n) Framework
 * Locale detection, translation helpers, number/date formatting per locale.
 */

/* ─── Supported Locales ───────────────────────────────────────────────── */

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currencySymbolPosition: "before" | "after";
  };
  defaultCurrency: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    dateFormat: "MM/DD/YYYY",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "before" },
    defaultCurrency: "USD",
  },
  {
    code: "en-GB",
    name: "English (UK)",
    nativeName: "English (UK)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "before" },
    defaultCurrency: "GBP",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Espanol",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    numberFormat: { decimal: ",", thousands: ".", currencySymbolPosition: "after" },
    defaultCurrency: "EUR",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Francais",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    numberFormat: { decimal: ",", thousands: " ", currencySymbolPosition: "after" },
    defaultCurrency: "EUR",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    dateFormat: "DD.MM.YYYY",
    numberFormat: { decimal: ",", thousands: ".", currencySymbolPosition: "after" },
    defaultCurrency: "EUR",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "Nihongo",
    direction: "ltr",
    dateFormat: "YYYY/MM/DD",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "before" },
    defaultCurrency: "JPY",
  },
  {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Portugues (Brasil)",
    direction: "ltr",
    dateFormat: "DD/MM/YYYY",
    numberFormat: { decimal: ",", thousands: ".", currencySymbolPosition: "before" },
    defaultCurrency: "BRL",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "Hangugeo",
    direction: "ltr",
    dateFormat: "YYYY.MM.DD",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "before" },
    defaultCurrency: "KRW",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "Arabiyyah",
    direction: "rtl",
    dateFormat: "DD/MM/YYYY",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "after" },
    defaultCurrency: "AED",
  },
  {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "Zhongwen",
    direction: "ltr",
    dateFormat: "YYYY-MM-DD",
    numberFormat: { decimal: ".", thousands: ",", currencySymbolPosition: "before" },
    defaultCurrency: "CNY",
  },
];

export const DEFAULT_LOCALE = "en";

/* ─── Locale Detection ────────────────────────────────────────────────── */

export function detectLocale(acceptLanguageHeader?: string | null): string {
  if (!acceptLanguageHeader) return DEFAULT_LOCALE;

  // Parse Accept-Language header: en-US,en;q=0.9,fr;q=0.8
  const locales = acceptLanguageHeader
    .split(",")
    .map((part) => {
      const [lang, qStr] = part.trim().split(";q=");
      const quality = qStr ? parseFloat(qStr) : 1.0;
      return { lang: lang.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { lang } of locales) {
    // Exact match
    const exact = SUPPORTED_LOCALES.find((l) => l.code === lang);
    if (exact) return exact.code;

    // Base language match (e.g., "en-US" matches "en")
    const baseLang = lang.split("-")[0];
    const baseMatch = SUPPORTED_LOCALES.find((l) => l.code === baseLang);
    if (baseMatch) return baseMatch.code;

    // Prefix match (e.g., "en" matches "en-GB")
    const prefixMatch = SUPPORTED_LOCALES.find((l) => l.code.startsWith(baseLang + "-"));
    if (prefixMatch) return prefixMatch.code;
  }

  return DEFAULT_LOCALE;
}

/* ─── Get locale config ───────────────────────────────────────────────── */

export function getLocaleConfig(locale: string): LocaleConfig {
  const config = SUPPORTED_LOCALES.find((l) => l.code === locale);
  if (config) return config;

  // Try base language
  const baseLang = locale.split("-")[0];
  const baseConfig = SUPPORTED_LOCALES.find((l) => l.code === baseLang);
  if (baseConfig) return baseConfig;

  // Fallback to default
  return SUPPORTED_LOCALES.find((l) => l.code === DEFAULT_LOCALE)!;
}

/* ─── Translation helpers ─────────────────────────────────────────────── */

export async function translate(
  namespace: string,
  key: string,
  locale: string,
  fallbackLocale: string = DEFAULT_LOCALE,
): Promise<string> {
  // Try the requested locale first
  const translation = await prisma.translationKey.findUnique({
    where: { namespace_key_locale: { namespace, key, locale } },
  });

  if (translation) return translation.value;

  // Fall back to default locale
  if (locale !== fallbackLocale) {
    const fallback = await prisma.translationKey.findUnique({
      where: { namespace_key_locale: { namespace, key, locale: fallbackLocale } },
    });
    if (fallback) return fallback.value;
  }

  // Return the key as last resort
  return key;
}

export async function translateBatch(
  namespace: string,
  keys: string[],
  locale: string,
  fallbackLocale: string = DEFAULT_LOCALE,
): Promise<Record<string, string>> {
  const translations = await prisma.translationKey.findMany({
    where: {
      namespace,
      key: { in: keys },
      locale,
    },
  });

  const result: Record<string, string> = {};
  const foundKeys = new Set(translations.map((t: { key: string }) => t.key));

  for (const t of translations) {
    result[t.key] = t.value;
  }

  // Fetch missing keys from fallback locale
  const missingKeys = keys.filter((k) => !foundKeys.has(k));
  if (missingKeys.length > 0 && locale !== fallbackLocale) {
    const fallbacks = await prisma.translationKey.findMany({
      where: {
        namespace,
        key: { in: missingKeys },
        locale: fallbackLocale,
      },
    });
    for (const t of fallbacks) {
      result[t.key] = t.value;
    }
  }

  // Fill remaining with key names
  for (const key of keys) {
    if (!result[key]) {
      result[key] = key;
    }
  }

  return result;
}

export async function getNamespaceTranslations(
  namespace: string,
  locale: string,
): Promise<Record<string, string>> {
  const translations = await prisma.translationKey.findMany({
    where: { namespace, locale },
    orderBy: { key: "asc" },
  });

  const result: Record<string, string> = {};
  for (const t of translations) {
    result[t.key] = t.value;
  }

  return result;
}

/* ─── Number formatting ───────────────────────────────────────────────── */

export function formatNumber(value: number, locale: string): string {
  const config = getLocaleConfig(locale);

  const isNeg = value < 0;
  const abs = Math.abs(value);
  const parts = abs.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1];

  // Add thousands separators
  const groups: string[] = [];
  let remaining = intPart;
  while (remaining.length > 3) {
    groups.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  groups.unshift(remaining);

  const formatted = groups.join(config.numberFormat.thousands) +
    config.numberFormat.decimal +
    decPart;

  return isNeg ? `-${formatted}` : formatted;
}

export function formatInteger(value: number, locale: string): string {
  const config = getLocaleConfig(locale);

  const isNeg = value < 0;
  const abs = Math.abs(Math.floor(value));
  const str = abs.toString();

  const groups: string[] = [];
  let remaining = str;
  while (remaining.length > 3) {
    groups.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  groups.unshift(remaining);

  const formatted = groups.join(config.numberFormat.thousands);
  return isNeg ? `-${formatted}` : formatted;
}

/* ─── Date formatting ─────────────────────────────────────────────────── */

export function formatDate(date: Date, locale: string): string {
  const config = getLocaleConfig(locale);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return config.dateFormat
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", year);
}

export function formatDateLong(date: Date, locale: string): string {
  try {
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    // Fallback for unsupported locales
    return date.toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

export function formatTime(date: Date, locale: string): string {
  try {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

/* ─── Supported locales list from database ────────────────────────────── */

export async function getAvailableLocales(): Promise<string[]> {
  const results = await prisma.translationKey.findMany({
    select: { locale: true },
    distinct: ["locale"],
    orderBy: { locale: "asc" },
  });

  return results.map((r: { locale: string }) => r.locale);
}

/* ─── Locale completeness check ───────────────────────────────────────── */

export async function checkLocaleCompleteness(locale: string): Promise<{
  locale: string;
  totalBaseKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completionPercentage: number;
}> {
  const [totalBaseKeys, translatedKeys] = await Promise.all([
    prisma.translationKey.count({ where: { locale: DEFAULT_LOCALE } }),
    prisma.translationKey.count({ where: { locale } }),
  ]);

  const missingKeys = Math.max(0, totalBaseKeys - translatedKeys);
  const completionPercentage =
    totalBaseKeys > 0
      ? Math.round((translatedKeys / totalBaseKeys) * 100)
      : locale === DEFAULT_LOCALE
        ? 100
        : 0;

  return {
    locale,
    totalBaseKeys,
    translatedKeys,
    missingKeys,
    completionPercentage,
  };
}

/* ─── Text direction helper ───────────────────────────────────────────── */

export function isRTL(locale: string): boolean {
  const config = getLocaleConfig(locale);
  return config.direction === "rtl";
}

/* ─── Get locale list with configs ────────────────────────────────────── */

export function getSupportedLocalesList(): LocaleConfig[] {
  return [...SUPPORTED_LOCALES];
}
