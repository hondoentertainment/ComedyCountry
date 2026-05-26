CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inApp" BOOLEAN NOT NULL DEFAULT true,
  "emailDigest" TEXT NOT NULL DEFAULT 'off',
  "eventReminder24h" BOOLEAN NOT NULL DEFAULT true,
  "eventReminder1h" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key"
ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference"
ADD COLUMN IF NOT EXISTS "eventReminder24h" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "NotificationPreference"
ADD COLUMN IF NOT EXISTS "eventReminder1h" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
