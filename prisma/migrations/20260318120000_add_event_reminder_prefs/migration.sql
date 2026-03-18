-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN "eventReminder24h" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "eventReminder1h" BOOLEAN NOT NULL DEFAULT true;
