-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('CLUB', 'THEATER', 'BAR', 'FESTIVAL', 'OPEN_MIC');

-- CreateEnum
CREATE TYPE "TouringStatus" AS ENUM ('TOURING', 'REGIONAL', 'LOCAL', 'RETIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ShowType" AS ENUM ('HEADLINE', 'FEATURE', 'OPEN_MIC', 'FESTIVAL', 'PODCAST_LIVE');

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capacity" INTEGER,
    "website" TEXT,
    "type" "VenueType" NOT NULL DEFAULT 'CLUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePhoto" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenuePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSocialLink" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "VenueSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comedian" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headshotUrl" TEXT,
    "bio" TEXT,
    "yearsActiveFrom" INTEGER,
    "yearsActiveTo" INTEGER,
    "representation" TEXT,
    "touringStatus" "TouringStatus" NOT NULL DEFAULT 'UNKNOWN',
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comedian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComedianGenre" (
    "id" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "genre" TEXT NOT NULL,

    CONSTRAINT "ComedianGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComedianSocialLink" (
    "id" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ComedianSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComedianPodcastLink" (
    "id" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "podcastName" TEXT NOT NULL,
    "episodeUrl" TEXT,

    CONSTRAINT "ComedianPodcastLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComedianSpecial" (
    "id" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT,
    "releaseYear" INTEGER,
    "url" TEXT,

    CONSTRAINT "ComedianSpecial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeChannel" (
    "id" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "subscriberCount" INTEGER,
    "videoCount" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "showtime" TEXT,
    "ticketUrl" TEXT,
    "priceMin" DECIMAL(10,2),
    "priceMax" DECIMAL(10,2),
    "showType" "ShowType" NOT NULL DEFAULT 'HEADLINE',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventComedian" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'headline',

    CONSTRAINT "EventComedian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "profileName" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "ComedianFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComedianFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComedianTierRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comedianId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComedianTierRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_state_city_idx" ON "Venue"("state", "city");

-- CreateIndex
CREATE INDEX "Venue_type_idx" ON "Venue"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Comedian_slug_key" ON "Comedian"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeChannel_comedianId_key" ON "YouTubeChannel"("comedianId");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeChannel_channelId_key" ON "YouTubeChannel"("channelId");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "EventReview_eventId_idx" ON "EventReview"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReview_eventId_userId_key" ON "EventReview"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ComedianFollow_userId_comedianId_key" ON "ComedianFollow"("userId", "comedianId");

-- CreateIndex
CREATE INDEX "ComedianTierRating_comedianId_idx" ON "ComedianTierRating"("comedianId");

-- CreateIndex
CREATE UNIQUE INDEX "ComedianTierRating_userId_comedianId_key" ON "ComedianTierRating"("userId", "comedianId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueFollow_userId_venueId_key" ON "VenueFollow"("userId", "venueId");

-- AddForeignKey
ALTER TABLE "VenuePhoto" ADD CONSTRAINT "VenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueSocialLink" ADD CONSTRAINT "VenueSocialLink_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianGenre" ADD CONSTRAINT "ComedianGenre_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianSocialLink" ADD CONSTRAINT "ComedianSocialLink_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianPodcastLink" ADD CONSTRAINT "ComedianPodcastLink_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianSpecial" ADD CONSTRAINT "ComedianSpecial_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeChannel" ADD CONSTRAINT "YouTubeChannel_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventComedian" ADD CONSTRAINT "EventComedian_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventComedian" ADD CONSTRAINT "EventComedian_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianFollow" ADD CONSTRAINT "ComedianFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianFollow" ADD CONSTRAINT "ComedianFollow_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianTierRating" ADD CONSTRAINT "ComedianTierRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComedianTierRating" ADD CONSTRAINT "ComedianTierRating_comedianId_fkey" FOREIGN KEY ("comedianId") REFERENCES "Comedian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueFollow" ADD CONSTRAINT "VenueFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueFollow" ADD CONSTRAINT "VenueFollow_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

