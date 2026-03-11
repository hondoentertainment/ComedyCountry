import { prisma } from "./prisma";

/**
 * Find events that ended 18-30 hours ago and may need review prompts.
 * Uses event date + showtime to estimate end time.
 */
export async function getEventsNeedingReviewPrompts() {
  const now = new Date();
  const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
  const eighteenHoursAgo = new Date(now.getTime() - 18 * 60 * 60 * 1000);

  // Find events whose date falls in the window (18-30 hours ago)
  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: thirtyHoursAgo,
        lte: eighteenHoursAgo,
      },
      attendees: { some: { status: "going" } },
    },
    include: {
      venue: { select: { name: true } },
      comedians: { include: { comedian: { select: { name: true } } } },
    },
  });

  return events;
}

/**
 * Find attendees of an event who RSVP'd "going" but haven't left a review.
 */
export async function getUnreviewedAttendees(eventId: string) {
  const attendees = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      status: "going",
    },
    select: { userId: true },
  });

  if (attendees.length === 0) return [];

  const userIds = attendees.map((a) => a.userId);

  // Find which users already reviewed
  const existingReviews = await prisma.eventReview.findMany({
    where: {
      eventId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const reviewedUserIds = new Set(existingReviews.map((r) => r.userId));

  return userIds.filter((id) => !reviewedUserIds.has(id));
}

/**
 * Create notification records prompting unreviewed attendees to review an event.
 */
export async function sendReviewPrompts(eventId: string) {
  const unreviewedUserIds = await getUnreviewedAttendees(eventId);

  if (unreviewedUserIds.length === 0) return 0;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: { select: { name: true } },
      comedians: { include: { comedian: { select: { name: true } } } },
    },
  });

  if (!event) return 0;

  const comedianNames = event.comedians.map((ec) => ec.comedian.name).join(", ");
  const eventTitle = event.title || comedianNames || "Comedy Show";

  await prisma.notification.createMany({
    data: unreviewedUserIds.map((userId) => ({
      userId,
      type: "review_prompt",
      title: "How was the show?",
      message: `You attended ${eventTitle} at ${event.venue.name}. Leave a review and help others discover great comedy!`,
      eventId,
      venueId: event.venueId,
    })),
  });

  return unreviewedUserIds.length;
}

/**
 * Orchestrate the full review prompt flow:
 * find events in the window, then send prompts for each.
 */
export async function processReviewPrompts() {
  const events = await getEventsNeedingReviewPrompts();
  let totalPromptsSent = 0;

  for (const event of events) {
    const sent = await sendReviewPrompts(event.id);
    totalPromptsSent += sent;
  }

  return {
    eventsProcessed: events.length,
    promptsSent: totalPromptsSent,
  };
}
