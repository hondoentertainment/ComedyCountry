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

// =============================================================================
// Comedy Genome / Recommendation Engine Enhancements
// =============================================================================

/**
 * Genre affinity vector: maps genre strings to numeric affinity scores [0-1].
 */
export interface GenreAffinityVector {
  [genre: string]: number;
}

/**
 * Build a genre affinity vector from user signals.
 * Weights:
 *   follow:    2.0
 *   check-in:  1.5
 *   review 4+: rating/2
 *   review 3:  1.0
 *   review <3: 0 (negative signal)
 *   tier S/A:  3.0/2.5
 *   tier B:    2.0
 *   tier C/D:  1.0/0.5
 *   tier F:    0
 */
export function buildGenreAffinityVector(
  signals: {
    followGenres: string[];
    checkInGenres: string[];
    reviewedGenres: Array<{ genres: string[]; rating: number }>;
    tierRatedGenres: Array<{ genres: string[]; tier: string }>;
  },
): GenreAffinityVector {
  const raw: Record<string, number> = {};
  let totalWeight = 0;

  const add = (genres: string[], weight: number) => {
    for (const g of genres) {
      const key = normalizeComedyKey(g);
      raw[key] = (raw[key] ?? 0) + weight;
      totalWeight += weight;
    }
  };

  // Follow signals
  add(signals.followGenres, 2.0);

  // Check-in signals
  add(signals.checkInGenres, 1.5);

  // Review signals
  for (const r of signals.reviewedGenres) {
    const weight = r.rating >= 4 ? r.rating / 2 : r.rating >= 3 ? 1 : 0;
    if (weight > 0) add(r.genres, weight);
  }

  // Tier rating signals
  const tierWeights: Record<string, number> = { S: 3, A: 2.5, B: 2, C: 1, D: 0.5, F: 0 };
  for (const t of signals.tierRatedGenres) {
    const weight = tierWeights[t.tier] ?? 1;
    if (weight > 0) add(t.genres, weight);
  }

  // Normalize to [0, 1]
  if (totalWeight === 0) return {};
  const maxVal = Math.max(...Object.values(raw), 1);
  const vector: GenreAffinityVector = {};
  for (const [key, val] of Object.entries(raw)) {
    vector[key] = Math.round((val / maxVal) * 100) / 100;
  }
  return vector;
}

/**
 * Compute cosine similarity between two attribute score maps.
 * Returns a value between 0 and 1.
 */
export function cosineSimilarity(a: AttributeScoreMap, b: AttributeScoreMap): number {
  const allKeysSet = new Set([...Object.keys(a), ...Object.keys(b)]);
  const allKeys = Array.from(allKeysSet);
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const key of allKeys) {
    const va = a[key] ?? 0;
    const vb = b[key] ?? 0;
    dotProduct += va * vb;
    magnitudeA += va * va;
    magnitudeB += vb * vb;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (denominator === 0) return 0;
  return Math.round((dotProduct / denominator) * 100) / 100;
}

/**
 * Score similarity between two comedians based on their genre vectors.
 * Returns a similarity score between 0 and 100.
 */
export function scoreComedianSimilarity(
  genresA: string[],
  genresB: string[],
): { similarity: number; sharedAttributes: string[] } {
  if (genresA.length === 0 || genresB.length === 0) {
    return { similarity: 0, sharedAttributes: [] };
  }

  const scoresA = emptyAttributeScores();
  addWeightedAttributes(scoresA, genresA, 1);
  const normalizedA = normalizeAttributeScores(scoresA);

  const scoresB = emptyAttributeScores();
  addWeightedAttributes(scoresB, genresB, 1);
  const normalizedB = normalizeAttributeScores(scoresB);

  const similarity = cosineSimilarity(normalizedA, normalizedB);
  const similarityPct = Math.round(similarity * 100);

  // Find shared high-scoring attributes
  const sharedAttributes: string[] = [];
  for (const key of Object.keys(normalizedA)) {
    if ((normalizedA[key] ?? 0) >= 0.5 && (normalizedB[key] ?? 0) >= 0.5) {
      sharedAttributes.push(key);
    }
  }

  return {
    similarity: similarityPct,
    sharedAttributes: sharedAttributes.slice(0, 4),
  };
}

/**
 * Score how well a comedian matches a user's taste profile.
 * Combines attribute overlap, genre affinity, and negative signal penalties.
 */
export function scoreTasteMatch(
  profileAttributeScores: AttributeScoreMap,
  profileGenreAffinity: GenreAffinityVector,
  negativeSignals: AttributeScoreMap,
  comedianGenres: string[],
  discoveryStretch: number,
): {
  matchPct: number;
  matchingAttributes: string[];
  stretchLabel: "core" | "stretch" | "wildcard";
  penalizedAttributes: string[];
  explanation: string;
} {
  if (comedianGenres.length === 0 || Object.keys(profileAttributeScores).length === 0) {
    return {
      matchPct: 0,
      matchingAttributes: [],
      stretchLabel: "wildcard",
      penalizedAttributes: [],
      explanation: "Not enough data for a match score.",
    };
  }

  // Attribute overlap score
  const attributeOverlap = scoreAttributeOverlap(profileAttributeScores, comedianGenres);

  // Direct genre affinity score
  let genreAffinityScore = 0;
  let genreCount = 0;
  for (const genre of comedianGenres) {
    const key = normalizeComedyKey(genre);
    const affinity = profileGenreAffinity[key] ?? 0;
    genreAffinityScore += affinity;
    genreCount++;
  }
  const avgGenreAffinity = genreCount > 0 ? genreAffinityScore / genreCount : 0;
  const genrePct = Math.round(avgGenreAffinity * 100);

  // Negative signal penalty
  const comedianScores = emptyAttributeScores();
  addWeightedAttributes(comedianScores, comedianGenres, 1);
  const normalizedComedianScores = normalizeAttributeScores(comedianScores);

  let negativePenalty = 0;
  const penalizedAttributes: string[] = [];
  for (const [attr, weight] of Object.entries(normalizedComedianScores)) {
    const negativeWeight = negativeSignals[attr] ?? 0;
    if (negativeWeight > 0.3 && weight > 0.3) {
      negativePenalty += negativeWeight * weight * 15;
      penalizedAttributes.push(attr);
    }
  }

  // Combined score (weighted blend)
  const combinedPct = Math.max(
    0,
    Math.min(
      100,
      Math.round(attributeOverlap.matchPct * 0.6 + genrePct * 0.4 - negativePenalty),
    ),
  );

  const stretchLabel = describeStretch(combinedPct, discoveryStretch);
  const matchingLabels = attributeOverlap.matchingAttributes.slice(0, 3).map(getAttributeLabel);

  let explanation: string;
  if (combinedPct >= 75) {
    explanation = `Strong match: ${matchingLabels.join(", ")} align with your comedy DNA.`;
  } else if (combinedPct >= 45) {
    explanation = matchingLabels.length > 0
      ? `Partial match on ${matchingLabels.join(", ")}. Could be a rewarding stretch.`
      : "Some overlap with your taste profile. Worth exploring.";
  } else {
    explanation = "Outside your usual zone. A wildcard pick for discovery.";
  }

  if (penalizedAttributes.length > 0) {
    const penalizedLabels = penalizedAttributes.slice(0, 2).map(getAttributeLabel);
    explanation += ` (Note: you've bounced off ${penalizedLabels.join(", ")} before.)`;
  }

  return {
    matchPct: combinedPct,
    matchingAttributes: attributeOverlap.matchingAttributes,
    stretchLabel,
    penalizedAttributes,
    explanation,
  };
}

/**
 * Given a list of comedians with genres, rank them by similarity to a target comedian.
 */
export function rankBySimilarity(
  targetGenres: string[],
  candidates: Array<{ id: string; genres: string[] }>,
): Array<{ id: string; similarity: number; sharedAttributes: string[] }> {
  return candidates
    .map((c) => {
      const { similarity, sharedAttributes } = scoreComedianSimilarity(targetGenres, c.genres);
      return { id: c.id, similarity, sharedAttributes };
    })
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Compute a confidence score based on number of signals.
 * Returns a value between 0 and 1.
 */
export function computeConfidence(signalCounts: {
  follows: number;
  reviews: number;
  checkIns: number;
  tierRatings: number;
}): number {
  const total =
    signalCounts.follows * 2 +
    signalCounts.reviews * 3 +
    signalCounts.checkIns * 1.5 +
    signalCounts.tierRatings * 2;

  // 50 weighted signals = 1.0 confidence
  return Math.min(1, Math.round((total / 50) * 100) / 100);
}
