export type ComedyAttributeCategory =
  | "tone"
  | "style"
  | "delivery"
  | "experience";

export interface ComedyAttributeDefinition {
  key: string;
  label: string;
  category: ComedyAttributeCategory;
  description: string;
}

export type AttributeScoreMap = Record<string, number>;

export const COMEDY_ATTRIBUTE_TAXONOMY: ComedyAttributeDefinition[] = [
  {
    key: "dark",
    label: "Dark",
    category: "tone",
    description: "Sharp, taboo, or edgy material.",
  },
  {
    key: "clean",
    label: "Clean",
    category: "tone",
    description: "Broadly accessible material without explicit language.",
  },
  {
    key: "observational",
    label: "Observational",
    category: "style",
    description: "Finds laughs in everyday life and shared routines.",
  },
  {
    key: "storytelling",
    label: "Storytelling",
    category: "style",
    description: "Narrative-driven sets with strong premises and callbacks.",
  },
  {
    key: "crowd_work",
    label: "Crowd Work",
    category: "delivery",
    description: "Improvised audience interaction and in-room spontaneity.",
  },
  {
    key: "roast",
    label: "Roast",
    category: "tone",
    description: "Insult-forward, confrontational, or battle-style comedy.",
  },
  {
    key: "absurdist",
    label: "Absurdist",
    category: "style",
    description: "Surreal, oddball, or intentionally off-center ideas.",
  },
  {
    key: "political",
    label: "Political",
    category: "style",
    description: "Cultural, current events, and systems-focused material.",
  },
  {
    key: "physical",
    label: "Physical",
    category: "delivery",
    description: "Movement, act-outs, and high-energy performance.",
  },
  {
    key: "improvisational",
    label: "Improvisational",
    category: "delivery",
    description: "Loose, spontaneous, and moment-driven performance.",
  },
  {
    key: "club_energy",
    label: "Club Energy",
    category: "experience",
    description: "Late-night, intimate, laugh-packed room feel.",
  },
  {
    key: "theater_energy",
    label: "Theater Energy",
    category: "experience",
    description: "Bigger polished sets designed for larger rooms.",
  },
  {
    key: "podcaster_adjacent",
    label: "Podcaster Adjacent",
    category: "experience",
    description: "Audiences that overlap with comedy podcasts and fandoms.",
  },
  {
    key: "date_night",
    label: "Date Night",
    category: "experience",
    description: "Comfortable, social, easy-to-recommend comedy nights.",
  },
  {
    key: "experimental",
    label: "Experimental",
    category: "style",
    description: "Boundary-pushing sets and alt-room sensibilities.",
  },
];

const ATTRIBUTE_LABELS = Object.fromEntries(
  COMEDY_ATTRIBUTE_TAXONOMY.map((attribute) => [attribute.key, attribute.label]),
);

export const GENRE_ATTRIBUTE_MAP: Record<string, string[]> = {
  dark: ["dark", "club_energy"],
  clean: ["clean", "date_night"],
  observational: ["observational", "storytelling", "date_night"],
  storyteller: ["storytelling", "observational"],
  storytelling: ["storytelling", "observational"],
  absurdist: ["absurdist", "experimental"],
  surreal: ["absurdist", "experimental"],
  political: ["political", "observational"],
  roast: ["roast", "dark", "club_energy"],
  insult: ["roast", "dark"],
  improvised: ["improvisational", "crowd_work"],
  improv: ["improvisational", "crowd_work"],
  crowdwork: ["crowd_work", "club_energy"],
  "crowd work": ["crowd_work", "club_energy"],
  physical: ["physical", "improvisational"],
  character: ["experimental", "storytelling"],
  alt: ["experimental", "absurdist"],
  podcast: ["podcaster_adjacent", "storytelling"],
  interview: ["podcaster_adjacent", "observational"],
  theater: ["theater_energy", "storytelling"],
  club: ["club_energy", "crowd_work"],
  festival: ["experimental", "theater_energy"],
};

export function emptyAttributeScores(): AttributeScoreMap {
  return {};
}

export function addWeightedAttributes(
  scores: AttributeScoreMap,
  genres: string[],
  weight: number,
) {
  for (const genre of genres) {
    const normalizedGenre = normalizeComedyKey(genre);
    const attributes = GENRE_ATTRIBUTE_MAP[normalizedGenre] ?? [normalizedGenre];
    for (const attribute of attributes) {
      scores[attribute] = (scores[attribute] ?? 0) + weight;
    }
  }
}

export function normalizeComedyKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeAttributeScores(
  rawScores: AttributeScoreMap,
): AttributeScoreMap {
  const maxScore = Math.max(...Object.values(rawScores), 1);
  const normalized: AttributeScoreMap = {};

  for (const [key, value] of Object.entries(rawScores)) {
    normalized[key] = Math.round((value / maxScore) * 100) / 100;
  }

  return normalized;
}

export function getTopKeys(
  scores: AttributeScoreMap,
  limit = 5,
): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export function getAttributeLabel(attributeKey: string): string {
  return ATTRIBUTE_LABELS[attributeKey] ?? humanizeAttributeKey(attributeKey);
}

export function humanizeAttributeKey(attributeKey: string): string {
  return attributeKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function summarizeComedyDNA(
  attributeScores: AttributeScoreMap,
  topGenres: string[],
  confidence: number,
): string {
  const topAttributes = getTopKeys(attributeScores, 3).map(getAttributeLabel);
  const genreSummary = topGenres.slice(0, 2).join(", ");
  const confidenceBand =
    confidence >= 0.75 ? "high confidence" : confidence >= 0.4 ? "emerging confidence" : "early read";

  if (topAttributes.length === 0 && topGenres.length === 0) {
    return "Your comedy genome is still warming up. Follow comics and review shows to unlock a sharper read.";
  }

  if (topAttributes.length === 0) {
    return `Your comedy DNA leans toward ${genreSummary}. This is still an ${confidenceBand} profile.`;
  }

  const attributeSummary = topAttributes.join(", ");
  if (!genreSummary) {
    return `Your comedy DNA currently leans ${attributeSummary}. This is an ${confidenceBand} read.`;
  }

  return `Your comedy DNA leans ${attributeSummary}, with strong pull toward ${genreSummary}. This is an ${confidenceBand} read.`;
}

export function describeStretch(
  matchPct: number,
  discoveryOpenness = 0.35,
): "core" | "stretch" | "wildcard" {
  if (matchPct >= 75) return "core";
  if (matchPct >= Math.max(45, discoveryOpenness * 100)) return "stretch";
  return "wildcard";
}

export function scoreAttributeOverlap(
  profileScores: AttributeScoreMap,
  candidateGenres: string[],
): { matchPct: number; matchingAttributes: string[] } {
  if (candidateGenres.length === 0 || Object.keys(profileScores).length === 0) {
    return { matchPct: 0, matchingAttributes: [] };
  }

  const rawCandidateScores = emptyAttributeScores();
  addWeightedAttributes(rawCandidateScores, candidateGenres, 1);
  const candidateScores = normalizeAttributeScores(rawCandidateScores);

  let total = 0;
  const matchingAttributes: string[] = [];

  for (const [attribute, candidateWeight] of Object.entries(candidateScores)) {
    const affinity = profileScores[attribute] ?? 0;
    total += affinity * candidateWeight;
    if (affinity > 0) {
      matchingAttributes.push(attribute);
    }
  }

  return {
    matchPct: Math.min(100, Math.round((total / Object.keys(candidateScores).length) * 100)),
    matchingAttributes: matchingAttributes.slice(0, 4),
  };
}
