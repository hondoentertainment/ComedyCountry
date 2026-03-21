import { prisma } from "@/lib/prisma";

export interface EventExperienceInput {
  setQuality?: number;
  crowdFit?: number;
  roomVibe?: number;
  pacing?: number;
  valueForPrice?: number;
  openerStrength?: number;
  surpriseGuests?: boolean;
  wouldRecommend?: boolean;
  notes?: string;
}

export interface EventReputationSummary {
  reviewCount: number;
  averageRating: number | null;
  verifiedReviewCount: number;
  verifiedFeedbackCount: number;
  verifiedSignalRate: number;
  wouldRecommendRate: number | null;
  trustScore: number;
  topSignals: string[];
  feedbackAverages: Record<string, number | null>;
}

const FEEDBACK_FIELDS: Array<keyof EventExperienceInput> = [
  "setQuality",
  "crowdFit",
  "roomVibe",
  "pacing",
  "valueForPrice",
  "openerStrength",
];

const FEEDBACK_LABELS: Record<keyof EventExperienceInput, string> = {
  setQuality: "Strong set quality",
  crowdFit: "Great crowd fit",
  roomVibe: "Excellent room vibe",
  pacing: "Good pacing",
  valueForPrice: "Worth the price",
  openerStrength: "Strong opener lineup",
  surpriseGuests: "Surprise guests",
  wouldRecommend: "Would recommend",
  notes: "Notes",
};

export function clampRating(value?: number): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export async function hasVerifiedAttendance(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const [ticket, attendance] = await Promise.all([
    prisma.ticket.findFirst({
      where: {
        eventId,
        userId,
        status: { in: ["VALID", "USED"] },
      },
      select: { id: true, scannedAt: true },
    }),
    prisma.eventAttendance.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { id: true },
    }),
  ]);

  return Boolean(ticket?.scannedAt || ticket || attendance);
}

export function normalizeExperienceInput(
  input?: EventExperienceInput | null,
): EventExperienceInput | null {
  if (!input) return null;

  const normalized: EventExperienceInput = {
    setQuality: clampRating(input.setQuality),
    crowdFit: clampRating(input.crowdFit),
    roomVibe: clampRating(input.roomVibe),
    pacing: clampRating(input.pacing),
    valueForPrice: clampRating(input.valueForPrice),
    openerStrength: clampRating(input.openerStrength),
    surpriseGuests:
      typeof input.surpriseGuests === "boolean" ? input.surpriseGuests : undefined,
    wouldRecommend:
      typeof input.wouldRecommend === "boolean" ? input.wouldRecommend : undefined,
    notes: input.notes?.trim() || undefined,
  };

  const hasContent = Object.values(normalized).some(
    (value) => value !== undefined && value !== "",
  );

  return hasContent ? normalized : null;
}

export async function upsertEventExperienceFeedback(
  eventId: string,
  userId: string,
  input?: EventExperienceInput | null,
) {
  const normalized = normalizeExperienceInput(input);
  if (!normalized) return null;

  const verifiedAttendance = await hasVerifiedAttendance(eventId, userId);

  return prisma.eventExperienceFeedback.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      verifiedAttendance,
      ...normalized,
    },
    update: {
      verifiedAttendance,
      ...normalized,
    },
  });
}

export async function getEventReputationSummary(
  eventId: string,
): Promise<EventReputationSummary> {
  const [reviewAggregate, verifiedReviewCount, feedbackRows] = await Promise.all([
    prisma.eventReview.aggregate({
      where: { eventId },
      _count: true,
      _avg: { rating: true },
    }),
    prisma.eventReview.count({
      where: { eventId, verifiedAttendance: true },
    }),
    prisma.eventExperienceFeedback.findMany({
      where: { eventId, moderationStatus: "visible" },
      select: {
        verifiedAttendance: true,
        setQuality: true,
        crowdFit: true,
        roomVibe: true,
        pacing: true,
        valueForPrice: true,
        openerStrength: true,
        wouldRecommend: true,
        surpriseGuests: true,
      },
    }),
  ]);

  const verifiedFeedbackCount = feedbackRows.filter(
    (row) => row.verifiedAttendance,
  ).length;

  const feedbackAverages = Object.fromEntries(
    FEEDBACK_FIELDS.map((field) => {
      const values = feedbackRows
        .map((row) => (row as Record<string, unknown>)[field])
        .filter((value): value is number => typeof value === "number");
      const average =
        values.length > 0
          ? Math.round(
              (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
            ) / 10
          : null;
      return [field, average];
    }),
  ) as Record<string, number | null>;

  const recommendationVotes = feedbackRows.filter(
    (row) => typeof row.wouldRecommend === "boolean",
  );
  const recommendCount = recommendationVotes.filter(
    (row) => row.wouldRecommend,
  ).length;
  const wouldRecommendRate =
    recommendationVotes.length > 0
      ? Math.round((recommendCount / recommendationVotes.length) * 100)
      : null;

  const verifiedSignals = verifiedReviewCount + verifiedFeedbackCount;
  const totalSignals = reviewAggregate._count + feedbackRows.length;
  const verifiedSignalRate =
    totalSignals > 0 ? Math.round((verifiedSignals / totalSignals) * 100) : 0;

  const averageFeedbackScore =
    Object.values(feedbackAverages)
      .filter((value): value is number => typeof value === "number")
      .reduce((sum, value, _, all) => sum + value / all.length, 0) || 0;
  const trustScore = Math.min(
    100,
    Math.round(
      verifiedSignalRate * 0.45 +
        (wouldRecommendRate ?? 50) * 0.2 +
        averageFeedbackScore * 10 * 0.35,
    ),
  );

  const topSignals = Object.entries(feedbackAverages)
    .filter(([, value]) => typeof value === "number" && value >= 4)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([field]) => FEEDBACK_LABELS[field as keyof EventExperienceInput]);

  if (wouldRecommendRate !== null && wouldRecommendRate >= 80) {
    topSignals.unshift("Verified attendees would recommend it");
  }

  const uniqueTopSignals = Array.from(new Set(topSignals)).slice(0, 3);

  return {
    reviewCount: reviewAggregate._count,
    averageRating: reviewAggregate._avg.rating
      ? Math.round(reviewAggregate._avg.rating * 10) / 10
      : null,
    verifiedReviewCount,
    verifiedFeedbackCount,
    verifiedSignalRate,
    wouldRecommendRate,
    trustScore,
    topSignals: uniqueTopSignals,
    feedbackAverages,
  };
}
