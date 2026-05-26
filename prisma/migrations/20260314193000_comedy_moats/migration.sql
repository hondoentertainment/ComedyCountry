-- Backwards-compatible schema evolution for the comedy discovery moat rollout.

DO $$ BEGIN
  CREATE TYPE "DiscoveryEntityType" AS ENUM ('EVENT', 'COMEDIAN', 'VENUE', 'CLIP', 'PODCAST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BuzzLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VIRAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "EventReview"
ADD COLUMN IF NOT EXISTS "verifiedAttendance" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "TasteProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dimensions" TEXT NOT NULL,
  "topGenres" TEXT NOT NULL,
  "attributeScores" TEXT NOT NULL DEFAULT '{}',
  "topAttributes" TEXT NOT NULL DEFAULT '[]',
  "negativeSignals" TEXT NOT NULL DEFAULT '{}',
  "profileVersion" TEXT NOT NULL DEFAULT 'v2',
  "profileSummary" TEXT,
  "discoveryStretch" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastComputed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TasteProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TasteProfile"
ADD COLUMN IF NOT EXISTS "attributeScores" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "topAttributes" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "negativeSignals" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "profileVersion" TEXT NOT NULL DEFAULT 'v2',
ADD COLUMN IF NOT EXISTS "profileSummary" TEXT,
ADD COLUMN IF NOT EXISTS "discoveryStretch" DOUBLE PRECISION NOT NULL DEFAULT 0.35;

CREATE UNIQUE INDEX IF NOT EXISTS "TasteProfile_userId_key" ON "TasteProfile"("userId");
CREATE INDEX IF NOT EXISTS "TasteProfile_userId_idx" ON "TasteProfile"("userId");

CREATE TABLE IF NOT EXISTS "SocialProof" (
  "id" TEXT NOT NULL,
  "entityType" "DiscoveryEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "friendsAttending" INTEGER NOT NULL DEFAULT 0,
  "totalAttending" INTEGER NOT NULL DEFAULT 0,
  "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "buzzLevel" "BuzzLevel" NOT NULL DEFAULT 'LOW',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialProof_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SocialProof"
ADD COLUMN IF NOT EXISTS "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialProof_entityType_entityId_key"
ON "SocialProof"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "SocialProof_buzzLevel_idx" ON "SocialProof"("buzzLevel");
CREATE INDEX IF NOT EXISTS "SocialProof_trendingScore_idx" ON "SocialProof"("trendingScore");

CREATE TABLE IF NOT EXISTS "UserDiscoveryProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preferredGenres" JSONB NOT NULL DEFAULT '[]',
  "preferredVenues" JSONB NOT NULL DEFAULT '[]',
  "preferredDays" JSONB NOT NULL DEFAULT '[]',
  "attributeWeights" JSONB NOT NULL DEFAULT '{}',
  "explanationCache" JSONB NOT NULL DEFAULT '[]',
  "profileVersion" TEXT NOT NULL DEFAULT 'v2',
  "averageSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discoveryOpenness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDiscoveryProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserDiscoveryProfile"
ADD COLUMN IF NOT EXISTS "attributeWeights" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "explanationCache" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "profileVersion" TEXT NOT NULL DEFAULT 'v2';

CREATE UNIQUE INDEX IF NOT EXISTS "UserDiscoveryProfile_userId_key"
ON "UserDiscoveryProfile"("userId");

CREATE INDEX IF NOT EXISTS "UserDiscoveryProfile_userId_idx"
ON "UserDiscoveryProfile"("userId");

CREATE TABLE IF NOT EXISTS "EventExperienceFeedback" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventExperienceFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventExperienceFeedback_eventId_userId_key"
ON "EventExperienceFeedback"("eventId", "userId");

CREATE INDEX IF NOT EXISTS "EventExperienceFeedback_eventId_moderationStatus_idx"
ON "EventExperienceFeedback"("eventId", "moderationStatus");

CREATE INDEX IF NOT EXISTS "EventExperienceFeedback_userId_createdAt_idx"
ON "EventExperienceFeedback"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "SceneInsightSnapshot" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SceneInsightSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SceneInsightSnapshot_slug_key"
ON "SceneInsightSnapshot"("slug");

CREATE INDEX IF NOT EXISTS "SceneInsightSnapshot_city_state_idx"
ON "SceneInsightSnapshot"("city", "state");

CREATE INDEX IF NOT EXISTS "SceneInsightSnapshot_sceneScore_idx"
ON "SceneInsightSnapshot"("sceneScore");

CREATE INDEX IF NOT EXISTS "SceneInsightSnapshot_momentumScore_idx"
ON "SceneInsightSnapshot"("momentumScore");
