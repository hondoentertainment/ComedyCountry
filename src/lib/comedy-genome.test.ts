import { describe, expect, it } from "vitest";
import {
  addWeightedAttributes,
  describeStretch,
  emptyAttributeScores,
  normalizeAttributeScores,
  scoreAttributeOverlap,
  summarizeComedyDNA,
} from "./comedy-genome";

describe("comedy-genome", () => {
  it("maps genres into richer comedy attributes", () => {
    const scores = emptyAttributeScores();
    addWeightedAttributes(scores, ["dark", "crowd work"], 2);

    expect(scores.dark).toBeGreaterThan(0);
    expect(scores.club_energy).toBeGreaterThan(0);
    expect(scores.crowd_work).toBeGreaterThan(0);
  });

  it("normalizes attribute scores", () => {
    const normalized = normalizeAttributeScores({
      dark: 4,
      club_energy: 2,
    });

    expect(normalized.dark).toBe(1);
    expect(normalized.club_energy).toBe(0.5);
  });

  it("scores overlap between a profile and candidate genres", () => {
    const result = scoreAttributeOverlap(
      { dark: 1, club_energy: 0.6 },
      ["dark", "roast"],
    );

    expect(result.matchPct).toBeGreaterThan(0);
    expect(result.matchingAttributes).toContain("dark");
  });

  it("describes recommendation stretch levels", () => {
    expect(describeStretch(85, 0.3)).toBe("core");
    expect(describeStretch(55, 0.3)).toBe("stretch");
    expect(describeStretch(20, 0.3)).toBe("wildcard");
  });

  it("summarizes comedy DNA in readable language", () => {
    const summary = summarizeComedyDNA(
      { dark: 1, crowd_work: 0.8 },
      ["dark", "observational"],
      0.75,
    );

    expect(summary).toContain("Dark");
    expect(summary).toContain("high confidence");
  });
});
