import { prisma } from "./prisma";

/**
 * Phase 18: International Expansion & Localization
 */

/* ─── International Scenes ─────────────────────────────────────────── */

export async function getInternationalScenes(filters?: {
  country?: string;
  region?: string;
  isActive?: boolean;
}) {
  return prisma.internationalScene.findMany({
    where: {
      ...(filters?.country ? { country: filters.country } : {}),
      ...(filters?.region ? { region: filters.region } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: { festivals: true },
    orderBy: { city: "asc" },
  });
}

export async function getSceneByCity(city: string, country: string) {
  return prisma.internationalScene.findUnique({
    where: { city_country: { city, country } },
    include: { festivals: true },
  });
}

export async function createInternationalScene(data: {
  city: string;
  country: string;
  countryCode: string;
  region?: string;
  description?: string;
  language?: string;
  timezone: string;
  currency?: string;
  venueCount?: number;
  comedianCount?: number;
  imageUrl?: string;
}) {
  return prisma.internationalScene.create({ data });
}

/* ─── Festival Circuit ─────────────────────────────────────────────── */

export async function getFestivalCircuit(filters?: {
  country?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.festivalCircuit.findMany({
    where: {
      ...(filters?.country ? { country: filters.country } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.startDate ? { startDate: { gte: filters.startDate } } : {}),
      ...(filters?.endDate ? { endDate: { lte: filters.endDate } } : {}),
    },
    include: { scene: true },
    orderBy: { startDate: "asc" },
  });
}

export async function getFestivalById(id: string) {
  return prisma.festivalCircuit.findUnique({
    where: { id },
    include: { scene: true },
  });
}

export async function createFestival(data: {
  name: string;
  sceneId?: string;
  city: string;
  country: string;
  countryCode: string;
  startDate?: Date;
  endDate?: Date;
  website?: string;
  description?: string;
  showCount?: number;
  attendeeCapacity?: number;
  category?: string;
  isRecurring?: boolean;
  recurringMonth?: number;
  imageUrl?: string;
}) {
  return prisma.festivalCircuit.create({ data });
}

export async function getUpcomingFestivals(limit: number = 10) {
  const now = new Date();
  return prisma.festivalCircuit.findMany({
    where: { startDate: { gte: now } },
    include: { scene: true },
    orderBy: { startDate: "asc" },
    take: limit,
  });
}

/* ─── Comedy Styles ────────────────────────────────────────────────── */

export async function getComedyStyles(country?: string) {
  return prisma.comedyStyle.findMany({
    where: country ? { country } : {},
    orderBy: { name: "asc" },
  });
}

export async function createComedyStyle(data: {
  name: string;
  country: string;
  description: string;
  examples?: string[];
  relatedGenres?: string[];
}) {
  return prisma.comedyStyle.create({
    data: {
      ...data,
      examples: data.examples ?? [],
      relatedGenres: data.relatedGenres ?? [],
    },
  });
}

export async function getComedyStyleByName(name: string) {
  return prisma.comedyStyle.findUnique({ where: { name } });
}

/* ─── Currency Conversion ──────────────────────────────────────────── */

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
) {
  if (from === to) return { amount, converted: amount, rate: 1 };

  // Try direct rate
  const direct = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
  });

  if (direct) {
    return { amount, converted: amount * direct.rate, rate: direct.rate };
  }

  // Try inverse rate
  const inverse = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: to, toCurrency: from } },
  });

  if (inverse && inverse.rate !== 0) {
    const rate = 1 / inverse.rate;
    return { amount, converted: amount * rate, rate };
  }

  throw new Error(`No exchange rate found for ${from} -> ${to}`);
}

export async function updateCurrencyRates(
  rates: { fromCurrency: string; toCurrency: string; rate: number }[],
) {
  const results = [];
  for (const r of rates) {
    const result = await prisma.currencyRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
        },
      },
      update: { rate: r.rate },
      create: r,
    });
    results.push(result);
  }
  return results;
}

export async function getCurrencyRate(from: string, to: string) {
  return prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
  });
}

/* ─── Touring Info ─────────────────────────────────────────────────── */

export async function getTouringInfo(country: string) {
  return prisma.touringInfo.findUnique({ where: { country } });
}

export async function createTouringInfo(data: {
  country: string;
  countryCode: string;
  visaRequired?: boolean;
  visaType?: string;
  processingTime?: string;
  workPermitRequired?: boolean;
  taxInfo?: string;
  tips?: string[];
  resources?: unknown;
}) {
  return prisma.touringInfo.create({
    data: {
      country: data.country,
      countryCode: data.countryCode,
      visaRequired: data.visaRequired,
      visaType: data.visaType,
      processingTime: data.processingTime,
      workPermitRequired: data.workPermitRequired,
      taxInfo: data.taxInfo,
      tips: data.tips ?? [],
    } as Parameters<typeof prisma.touringInfo.create>[0]["data"],
  });
}

export async function getAllTouringInfo() {
  return prisma.touringInfo.findMany({ orderBy: { country: "asc" } });
}

/* ─── Promoter Applications ────────────────────────────────────────── */

export async function submitPromoterApplication(data: {
  name: string;
  email: string;
  company?: string;
  city: string;
  country: string;
  countryCode: string;
  website?: string;
  venueCount?: number;
  experience?: string;
}) {
  return prisma.promoterApplication.create({ data });
}

export async function getPromoterApplications(filters?: {
  status?: string;
  country?: string;
}) {
  return prisma.promoterApplication.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.country ? { country: filters.country } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePromoterStatus(
  id: string,
  status: string,
  notes?: string,
) {
  return prisma.promoterApplication.update({
    where: { id },
    data: { status, ...(notes !== undefined ? { notes } : {}) },
  });
}

/* ─── Translations ─────────────────────────────────────────────────── */

export async function getTranslation(
  namespace: string,
  key: string,
  locale: string,
) {
  return prisma.translationKey.findUnique({
    where: { namespace_key_locale: { namespace, key, locale } },
  });
}

export async function getTranslations(namespace: string, locale: string) {
  return prisma.translationKey.findMany({
    where: { namespace, locale },
    orderBy: { key: "asc" },
  });
}

export async function setTranslation(
  namespace: string,
  key: string,
  locale: string,
  value: string,
) {
  return prisma.translationKey.upsert({
    where: { namespace_key_locale: { namespace, key, locale } },
    update: { value },
    create: { namespace, key, locale, value },
  });
}

export async function getSupportedLocales() {
  const results = await prisma.translationKey.findMany({
    select: { locale: true },
    distinct: ["locale"],
    orderBy: { locale: "asc" },
  });
  return results.map((r: { locale: string }) => r.locale);
}

export async function getLocaleCompleteness(locale: string) {
  // Get total unique keys from the "en" baseline
  const totalKeys = await prisma.translationKey.count({
    where: { locale: "en" },
  });

  if (totalKeys === 0) return { locale, total: 0, translated: 0, percentage: 100 };

  const translated = await prisma.translationKey.count({
    where: { locale },
  });

  const percentage = Math.round((translated / totalKeys) * 100);

  return { locale, total: totalKeys, translated, percentage };
}
