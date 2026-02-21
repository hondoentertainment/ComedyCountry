/**
 * Sync YouTube channel stats (subscriberCount, videoCount) for all comedians.
 * Run: npm run db:sync-youtube
 * Requires YOUTUBE_API_KEY in .env
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchChannelStats } from "../src/lib/youtube";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY is not set. Add it to your .env file.");
    process.exit(1);
  }

  const channels = await prisma.youTubeChannel.findMany({
    include: { comedian: { select: { name: true } } },
  });

  if (channels.length === 0) {
    console.log("No YouTube channels to sync.");
    return;
  }

  console.log(`Syncing ${channels.length} YouTube channel(s)...`);

  let synced = 0;
  let failed = 0;

  for (const ch of channels) {
    try {
      const stats = await fetchChannelStats(ch.channelId);
      if (!stats) {
        console.warn(`  Skipped ${ch.comedian.name} (channel not found)`);
        continue;
      }

      await prisma.youTubeChannel.update({
        where: { id: ch.id },
        data: {
          channelId: stats.channelId,
          subscriberCount: stats.subscriberCount,
          videoCount: stats.videoCount,
          lastSyncedAt: new Date(),
        },
      });

      console.log(
        `  ✓ ${ch.comedian.name}: ${(stats.subscriberCount / 1000).toFixed(1)}K subs, ${stats.videoCount} videos`
      );
      synced++;
    } catch (err) {
      console.error(`  ✗ ${ch.comedian.name}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Synced: ${synced}, Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
