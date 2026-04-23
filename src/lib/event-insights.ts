type EventComedianEntry = {
  role?: string | null;
  comedian: {
    name: string;
    genres?: Array<{ genre: string }>;
  };
};

type EventInsightInput = {
  date: Date;
  showtime?: string | null;
  showType: string;
  venue: {
    name: string;
    city: string;
    state: string;
    type: string;
    capacity?: number | null;
  };
  comedians: EventComedianEntry[];
  totalCapacity?: number;
  totalSold?: number;
  reviewCount?: number;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLineupBreakdown(comedians: EventComedianEntry[]) {
  const grouped = comedians.reduce<Record<string, string[]>>((acc, entry) => {
    const role = (entry.role ?? "headline").toLowerCase();
    if (!acc[role]) acc[role] = [];
    acc[role].push(entry.comedian.name);
    return acc;
  }, {});

  return {
    headline: grouped.headline ?? [],
    feature: grouped.feature ?? [],
    host: grouped.host ?? [],
    all: comedians.map((entry) => entry.comedian.name),
  };
}

export function getEventVibeTags(input: EventInsightInput) {
  const tags = new Set<string>();
  const genres = unique(
    input.comedians.flatMap((entry) =>
      (entry.comedian.genres ?? []).map((genre) => genre.genre),
    ),
  );

  tags.add(titleCase(input.showType));

  if (input.venue.type === "CLUB") tags.add("Club room");
  if (input.venue.type === "THEATER") tags.add("Big room");
  if (input.venue.type === "BAR") tags.add("Loose crowd");
  if (input.venue.type === "OPEN_MIC") tags.add("Discovery night");

  if (input.showtime) {
    const normalized = input.showtime.toLowerCase();
    if (normalized.includes("10") || normalized.includes("11") || normalized.includes("late")) {
      tags.add("Late set energy");
    } else if (normalized.includes("7") || normalized.includes("8")) {
      tags.add("Prime-time show");
    }
  }

  if (genres.includes("observational")) tags.add("Smart writing");
  if (genres.includes("storytelling")) tags.add("Story-heavy");
  if (genres.includes("dark")) tags.add("Dark edge");
  if (genres.includes("absurdist")) tags.add("Left-turn bits");
  if (genres.includes("crowd work")) tags.add("Crowd-work upside");
  if (genres.includes("improv")) tags.add("Loose set");

  return Array.from(tags).slice(0, 5);
}

export function getEventUrgency(input: EventInsightInput) {
  const now = Date.now();
  const hoursAway = Math.max(0, (input.date.getTime() - now) / (1000 * 60 * 60));
  const soldPct =
    input.totalCapacity && input.totalCapacity > 0
      ? Math.round(((input.totalSold ?? 0) / input.totalCapacity) * 100)
      : null;

  if (soldPct !== null && soldPct >= 95) {
    return {
      label: "Nearly gone",
      detail: `${soldPct}% of tracked inventory is already spoken for.`,
    };
  }

  if (soldPct !== null && soldPct >= 75) {
    return {
      label: "Selling fast",
      detail: `${soldPct}% of tracked inventory is already sold.`,
    };
  }

  if (hoursAway <= 24) {
    return {
      label: "Tonight or next up",
      detail: "Good pick if you want something soon without overthinking it.",
    };
  }

  if (input.reviewCount && input.reviewCount >= 10) {
    return {
      label: "Crowd-backed",
      detail: `${input.reviewCount} reviews give you a stronger read before you book.`,
    };
  }

  return {
    label: "Easy to plan ahead",
    detail: "Good candidate to save, share, or drop into your calendar now.",
  };
}

export function getCatalogSignals(input: EventInsightInput) {
  const lineup = getLineupBreakdown(input.comedians);
  const signals: string[] = [];

  if (lineup.headline.length > 0) {
    signals.push(
      lineup.headline.length === 1
        ? `Headliner: ${lineup.headline[0]}`
        : `${lineup.headline.length}-comic headline bill`,
    );
  }

  if (lineup.feature.length > 0) {
    signals.push(`${lineup.feature.length} support slot${lineup.feature.length > 1 ? "s" : ""}`);
  }

  if (lineup.host.length > 0) {
    signals.push(`Hosted by ${lineup.host[0]}`);
  }

  if (input.venue.capacity) {
    const roomSize =
      input.venue.capacity >= 400
        ? "Large room"
        : input.venue.capacity >= 175
          ? "Mid-size room"
          : "Intimate room";
    signals.push(`${roomSize} at ${input.venue.name}`);
  } else {
    signals.push(`${titleCase(input.venue.type)} in ${input.venue.city}`);
  }

  if (input.comedians.length >= 3) {
    signals.push("Multi-comic lineup");
  }

  return signals.slice(0, 4);
}
