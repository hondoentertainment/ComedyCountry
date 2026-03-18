-- CreateTable
CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventReminder_eventId_userId_kind_key" ON "EventReminder"("eventId", "userId", "kind");

-- CreateIndex
CREATE INDEX "EventReminder_eventId_userId_kind_idx" ON "EventReminder"("eventId", "userId", "kind");
