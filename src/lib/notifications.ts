import { prisma } from "./prisma";

/**
 * Generate notifications for all users who follow the comedians or venue
 * associated with a newly created event.
 */
export async function generateEventNotifications(event: {
  id: string;
  title: string | null;
  venueId: string;
  venue: { name: string; city: string; state: string };
  comedians: Array<{ comedian: { id: string; name: string } }>;
  date: Date;
}) {
  const comedianIds = event.comedians.map((ec) => ec.comedian.id);
  const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
  const displayTitle = event.title || comedianNames || "New Show";

  // Find all users who follow any of the comedians or the venue
  const [comedianFollowers, venueFollowers] = await Promise.all([
    comedianIds.length > 0
      ? prisma.comedianFollow.findMany({
          where: { comedianId: { in: comedianIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
    prisma.venueFollow.findMany({
      where: { venueId: event.venueId },
      select: { userId: true },
    }),
  ]);

  // Deduplicate user IDs
  const userIds = Array.from(
    new Set([
      ...comedianFollowers.map((f) => f.userId),
      ...venueFollowers.map((f) => f.userId),
    ])
  );

  if (userIds.length === 0) return 0;

  // Only notify users with in-app notifications enabled (default is true)
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, inApp: false },
    select: { userId: true },
  });
  const disabledUserIds = new Set(prefs.map((p) => p.userId));
  const eligibleUserIds = userIds.filter((id) => !disabledUserIds.has(id));

  if (eligibleUserIds.length === 0) return 0;

  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  await prisma.notification.createMany({
    data: eligibleUserIds.map((userId) => ({
      userId,
      type: "new_event",
      title: displayTitle,
      message: `${displayTitle} at ${event.venue.name} (${event.venue.city}, ${event.venue.state}) on ${dateStr}`,
      eventId: event.id,
      venueId: event.venueId,
      comedianId: comedianIds[0] || null,
    })),
  });

  return eligibleUserIds.length;
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
