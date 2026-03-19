import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { haversineDistanceMi, boundingBoxMi, formatDistanceMi } from "./geo";

/**
 * Check all active location alerts and notify users about events in their radius
 * that they haven't been notified about yet.
 *
 * Uses bounding-box pre-filtering for performance, then exact haversine distance.
 * Sends both in-app notifications and push notifications.
 * Uses Notification type "location_alert" to avoid duplicate sends.
 */
export async function processLocationAlerts(): Promise<{
  alertsProcessed: number;
  notificationsCreated: number;
  pushSent: number;
}> {
  const now = new Date();
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const alerts = await prisma.locationAlert.findMany({
    where: { isActive: true },
  });

  let notificationsCreated = 0;
  let pushSent = 0;

  for (const alert of alerts) {
    // Pre-filter events by bounding box for better performance
    const box = boundingBoxMi(alert.latitude, alert.longitude, alert.radiusMi);

    const events = await prisma.event.findMany({
      where: {
        date: { gte: now, lte: twoWeeks },
        venue: {
          latitude: { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLon, lte: box.maxLon },
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        comedians: {
          include: { comedian: { select: { name: true } } },
        },
      },
    });

    // Exact distance filter
    const inRadius = events.filter((e) => {
      if (e.venue.latitude == null || e.venue.longitude == null) return false;
      const dist = haversineDistanceMi(
        alert.latitude,
        alert.longitude,
        e.venue.latitude,
        e.venue.longitude
      );
      return dist <= alert.radiusMi;
    });

    for (const event of inRadius) {
      // Check for existing notification to prevent duplicates
      const existing = await prisma.notification.findFirst({
        where: {
          userId: alert.userId,
          eventId: event.id,
          type: "location_alert",
        },
      });
      if (existing) continue;

      // Check user's notification preferences
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: alert.userId },
      });
      if (pref?.inApp === false) continue;

      const comedianNames = event.comedians
        .map((ec) => ec.comedian.name)
        .join(", ");
      const title = event.title || comedianNames || "New comedy show";
      const dateStr = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      // Calculate distance for display
      const distance =
        event.venue.latitude != null && event.venue.longitude != null
          ? formatDistanceMi(
              haversineDistanceMi(
                alert.latitude,
                alert.longitude,
                event.venue.latitude,
                event.venue.longitude
              )
            )
          : null;

      const distanceText = distance ? ` (${distance})` : "";
      const notifTitle = `New show near you: ${title}`;
      const notifMessage = `${title} at ${event.venue.name}${distanceText} — ${event.venue.city}, ${event.venue.state} on ${dateStr}`;

      // Create in-app notification
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

      // Send push notification
      try {
        const sent = await sendPushToUser(alert.userId, {
          title: notifTitle,
          body: notifMessage,
          url: `/events/${event.id}`,
          type: "new_show_nearby",
          tag: `location-alert-${event.id}`,
        });
        pushSent += sent;
      } catch {
        // Push failures must not block in-app notifications
      }
    }
  }

  return { alertsProcessed: alerts.length, notificationsCreated, pushSent };
}
