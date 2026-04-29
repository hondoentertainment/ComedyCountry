import { calculateAccessibilityScore } from "@/lib/accessibility-discovery";
import {
  getEventFreshnessSnapshot,
  getVenueFreshnessSnapshot,
  type FreshnessSnapshot,
} from "@/lib/freshness";

export interface TrustBadge {
  key: string;
  label: string;
  tone: "emerald" | "blue" | "amber" | "slate";
}

export interface EventTrustSummary {
  trustScore: number;
  badges: TrustBadge[];
  freshness: FreshnessSnapshot;
  accessibilityScore: number;
  lastVerifiedAt: Date | null;
  transparentPricing: boolean;
  antiScalping: boolean;
  controlledResale: boolean;
  fairWaitlist: boolean;
}

export interface VenueTrustSummary {
  trustScore: number;
  badges: TrustBadge[];
  freshness: FreshnessSnapshot;
  accessibilityScore: number;
  lastVerifiedAt: Date | null;
  sourceConfidence: number;
}

type EventTrustInput = {
  updatedAt: Date;
  date: Date;
  showtime?: string | null;
  ticketUrl?: string | null;
  priceMin?: { toString(): string } | number | null;
  priceMax?: { toString(): string } | number | null;
  comedians: Array<unknown>;
  accessibilityTags?: Array<{ type: string; verifiedBy?: string | null; verifiedAt?: Date | null }>;
  fairPricePolicy?: {
    showAllFees?: boolean;
    antiScalpingEnabled?: boolean;
    allowResale?: boolean;
    updatedAt?: Date | null;
  } | null;
  venue?: {
    updatedAt?: Date | null;
    website?: string | null;
  } | null;
};

type VenueTrustInput = {
  updatedAt: Date;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  accessibilityTags?: Array<{ type: string; verifiedBy?: string | null; verifiedAt?: Date | null }>;
  socialLinks?: Array<unknown>;
  upcomingEvents?: Array<{ fairPricePolicy?: object | null }>;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function dedupeBadges(badges: TrustBadge[]) {
  const seen = new Set<string>();
  return badges.filter((badge) => {
    if (seen.has(badge.key)) return false;
    seen.add(badge.key);
    return true;
  });
}

export function buildEventTrustSummary(event: EventTrustInput): EventTrustSummary {
  const freshness = getEventFreshnessSnapshot(event);
  const accessibility = calculateAccessibilityScore(event.accessibilityTags ?? []);

  const badges: TrustBadge[] = [];
  if (accessibility.total >= 25) {
    badges.push({
      key: "accessibility",
      label:
        accessibility.verifiedCount > 0 ? "Verified access info" : "Accessibility info",
      tone: "blue",
    });
  }
  if (event.fairPricePolicy?.showAllFees) {
    badges.push({ key: "transparent-pricing", label: "Transparent fees", tone: "emerald" });
  }
  if (event.fairPricePolicy?.antiScalpingEnabled) {
    badges.push({ key: "anti-scalping", label: "Anti-scalping", tone: "emerald" });
  }
  if (event.fairPricePolicy?.allowResale) {
    badges.push({ key: "controlled-resale", label: "Controlled resale", tone: "amber" });
  }
  if (event.fairPricePolicy) {
    badges.push({ key: "fair-waitlist", label: "Fair waitlist", tone: "amber" });
  }
  badges.push({
    key: "freshness",
    label:
      freshness.status === "fresh"
        ? "Fresh lineup"
        : freshness.status === "aging"
          ? "Needs recheck"
          : "Stale signals",
    tone:
      freshness.status === "fresh"
        ? "emerald"
        : freshness.status === "aging"
          ? "amber"
          : "slate",
  });

  const trustScore = round(
    freshness.score * 0.45 +
      accessibility.total * 0.25 +
      (event.fairPricePolicy ? 100 : 0) * 0.2 +
      (event.fairPricePolicy?.antiScalpingEnabled ? 100 : 0) * 0.1,
  );

  return {
    trustScore,
    badges: dedupeBadges(badges),
    freshness,
    accessibilityScore: accessibility.total,
    lastVerifiedAt: freshness.lastVerifiedAt,
    transparentPricing: !!event.fairPricePolicy?.showAllFees,
    antiScalping: !!event.fairPricePolicy?.antiScalpingEnabled,
    controlledResale: !!event.fairPricePolicy?.allowResale,
    fairWaitlist: !!event.fairPricePolicy,
  };
}

export function buildVenueTrustSummary(venue: VenueTrustInput): VenueTrustSummary {
  const freshness = getVenueFreshnessSnapshot(venue);
  const accessibility = calculateAccessibilityScore(venue.accessibilityTags ?? []);
  const fairCoverage = venue.upcomingEvents?.some((event) => !!event.fairPricePolicy) ?? false;
  const badges: TrustBadge[] = [];

  if (accessibility.total >= 25) {
    badges.push({
      key: "venue-accessibility",
      label:
        accessibility.verifiedCount > 0 ? "Verified venue access" : "Venue access info",
      tone: "blue",
    });
  }
  if (fairCoverage) {
    badges.push({ key: "venue-fair-ticketing", label: "Fair ticketing present", tone: "emerald" });
  }
  badges.push({
    key: "venue-freshness",
    label:
      freshness.status === "fresh"
        ? "Recently verified"
        : freshness.status === "aging"
          ? "Profile needs recheck"
          : "Profile is stale",
    tone:
      freshness.status === "fresh"
        ? "emerald"
        : freshness.status === "aging"
          ? "amber"
          : "slate",
  });

  const trustScore = round(
    freshness.score * 0.55 +
      accessibility.total * 0.3 +
      (fairCoverage ? 100 : 0) * 0.15,
  );

  return {
    trustScore,
    badges: dedupeBadges(badges),
    freshness,
    accessibilityScore: accessibility.total,
    lastVerifiedAt: freshness.lastVerifiedAt,
    sourceConfidence: freshness.sourceConfidence,
  };
}

