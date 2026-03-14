-- Backwards-compatible schema evolution for the comedy discovery moat rollout.

ALTER TABLE "EventReview"
ADD COLUMN "verifiedAttendance" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TasteProfile"
ADD COLUMN "attributeScores" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN "topAttributes" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "negativeSignals" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN "profileVersion" TEXT NOT NULL DEFAULT 'v2',
ADD COLUMN "profileSummary" TEXT,
ADD COLUMN "discoveryStretch" DOUBLE PRECISION NOT NULL DEFAULT 0.35;

ALTER TABLE "SocialProof"
ADD COLUMN "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "UserDiscoveryProfile"
ADD COLUMN "attributeWeights" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "explanationCache" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "profileVersion" TEXT NOT NULL DEFAULT 'v2';

CREATE TABLE "EventExperienceFeedback" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "verifiedAttendance" BOOLEAN NOT NULL DEFAULT false,
  "setQuality" INTEGER,
  "crowdFit" INTEGER,
  "roomVibe" INTEGER,
  "pacing" INTEGER,
  "valueForPrice" INTEGER,
  "openerStrength" INTEGER,
  "surpriseGuests" BOOLEAN,
  "wouldRecommend" BOOLEAN,
  "notes" TEXT,
  "moderationStatus" TEXT NOT NULL DEFAULT 'visible',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventExperienceFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventExperienceFeedback_eventId_userId_key"
ON "EventExperienceFeedback"("eventId", "userId");

CREATE INDEX "EventExperienceFeedback_eventId_moderationStatus_idx"
ON "EventExperienceFeedback"("eventId", "moderationStatus");

CREATE INDEX "EventExperienceFeedback_userId_createdAt_idx"
ON "EventExperienceFeedback"("userId", "createdAt");

CREATE TABLE "SceneInsightSnapshot" (
  "id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sceneScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "momentumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "loyaltyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "varietyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgTicketPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "activeVenues" INTEGER NOT NULL DEFAULT 0,
  "upcomingShows" INTEGER NOT NULL DEFAULT 0,
  "topAttributes" JSONB NOT NULL DEFAULT '[]',
  "featuredComedians" JSONB NOT NULL DEFAULT '[]',
  "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SceneInsightSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SceneInsightSnapshot_slug_key"
ON "SceneInsightSnapshot"("slug");

CREATE INDEX "SceneInsightSnapshot_city_state_idx"
ON "SceneInsightSnapshot"("city", "state");

CREATE INDEX "SceneInsightSnapshot_sceneScore_idx"
ON "SceneInsightSnapshot"("sceneScore");

CREATE INDEX "SceneInsightSnapshot_momentumScore_idx"
ON "SceneInsightSnapshot"("momentumScore");
