import { prisma } from "./prisma";
import { sendPushToUser } from "./push";

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check all active location alerts and notify users about events in their radius
 * that they haven't been notified about yet.
 * Uses Notification type "location_alert" to avoid duplicate sends.
 */
export async function processLocationAlerts(): Promise<{ alertsProcessed: number; notificationsCreated: number }> {
  const now = new Date();
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const alerts = await prisma.locationAlert.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true } },
    },
  });

  let notificationsCreated = 0;

  for (const alert of alerts) {
    const events = await prisma.event.findMany({
      where: {
        date: { gte: now, lte: twoWeeks },
      },
      include: {
        venue: { select: { id: true, name: true, city: true, state: true, latitude: true, longitude: true } },
        comedians: { include: { comedian: { select: { name: true } } } },
      },
    });

    const inRadius = events.filter((e) => {
      if (e.venue.latitude == null || e.venue.longitude == null) return false;
      const dist = haversineMi(
        alert.latitude,
        alert.longitude,
        e.venue.latitude,
        e.venue.longitude
      );
      return dist <= alert.radiusMi;
    });

    for (const event of inRadius) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: alert.userId,
          eventId: event.id,
          type: "location_alert",
        },
      });
      if (existing) continue;

      const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
      const title = event.title || comedianNames || "New comedy show";
      const dateStr = new Date(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: alert.userId },
      });
      if (pref?.inApp === false) continue;

      const notifTitle = `New show near you: ${title}`;
      const notifMessage = `${title} at ${event.venue.name} (${event.venue.city}, ${event.venue.state}) on ${dateStr}`;

      await prisma.notification.create({
        data: {
          userId: alert.userId,
          type: "location_alert",
          title: notifTitle,
          message: notifMessage,
          eventId: event.id,
          venueId: event.venueId,
        },
      });
      notificationsCreated++;

      try {
        await sendPushToUser(alert.userId, {
          title: notifTitle,
          body: notifMessage,
          url: `/events/${event.id}`,
        });
      } catch {
        // Push failures must not block in-app notifications
      }
    }
  }

  return { alertsProcessed: alerts.length, notificationsCreated };
}
