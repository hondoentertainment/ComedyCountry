import { prisma } from "@/lib/prisma";

export interface ComedyPassportSummary {
  showsAttended: number;
  scenesExplored: number;
  comediansSeen: number;
  venuesVisited: number;
  hometownScene?: string;
  currentStreak: number;
  nextMilestone: string;
  topScenes: Array<{ city: string; state: string; count: number }>;
  recentMemories: Array<{
    eventId: string;
    title: string;
    venueName: string;
    city: string;
    state: string;
    date: string;
  }>;
}

export async function getComedyPassportSummary(
  userId: string,
): Promise<ComedyPassportSummary> {
  const attendances = await prisma.eventAttendance.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          venue: {
            select: {
              name: true,
              city: true,
              state: true,
            },
          },
          comedians: {
            select: { comedianId: true },
          },
        },
      },
    },
  });

  const sceneCounts = new Map<string, { city: string; state: string; count: number }>();
  const comedianIds = new Set<string>();
  const venueKeys = new Set<string>();

  for (const attendance of attendances) {
    const city = attendance.event.venue.city;
    const state = attendance.event.venue.state;
    const key = `${city}|${state}`;
    const existing = sceneCounts.get(key) ?? { city, state, count: 0 };
    existing.count += 1;
    sceneCounts.set(key, existing);

    venueKeys.add(`${attendance.event.venue.name}|${key}`);
    attendance.event.comedians.forEach((comedian) => comedianIds.add(comedian.comedianId));
  }

  const sortedScenes = Array.from(sceneCounts.values()).sort(
    (a, b) => b.count - a.count,
  );
  const hometownScene = sortedScenes[0]
    ? `${sortedScenes[0].city}, ${sortedScenes[0].state}`
    : undefined;

  const uniqueDateKeys = Array.from(
    new Set(
      attendances.map((attendance) =>
        new Date(attendance.event.date).toISOString().slice(0, 10),
      ),
    ),
  ).sort();

  let currentStreak = 0;
  if (uniqueDateKeys.length > 0) {
    let previousDate: Date | null = null;
    for (let index = uniqueDateKeys.length - 1; index >= 0; index -= 1) {
      const currentDate = new Date(uniqueDateKeys[index]);
      if (!previousDate) {
        currentStreak = 1;
        previousDate = currentDate;
        continue;
      }

      const dayDiff = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (dayDiff <= 45) {
        currentStreak += 1;
        previousDate = currentDate;
      } else {
        break;
      }
    }
  }

  const nextMilestoneTarget =
    attendances.length < 5 ? 5 : attendances.length < 10 ? 10 : Math.ceil((attendances.length + 1) / 5) * 5;
  const nextMilestone =
    attendances.length === 0
      ? "Attend your first live show to start your passport."
      : `${nextMilestoneTarget - attendances.length} more show${nextMilestoneTarget - attendances.length === 1 ? "" : "s"} to hit ${nextMilestoneTarget} passport stamps.`;

  return {
    showsAttended: attendances.length,
    scenesExplored: sceneCounts.size,
    comediansSeen: comedianIds.size,
    venuesVisited: venueKeys.size,
    hometownScene,
    currentStreak,
    nextMilestone,
    topScenes: sortedScenes.slice(0, 5),
    recentMemories: attendances.slice(0, 4).map((attendance) => ({
      eventId: attendance.event.id,
      title:
        attendance.event.title ??
        attendance.event.venue.name,
      venueName: attendance.event.venue.name,
      city: attendance.event.venue.city,
      state: attendance.event.venue.state,
      date: attendance.event.date.toISOString(),
    })),
  };
}
