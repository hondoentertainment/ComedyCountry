import type { SceneIntelligence } from "@/lib/scene-intelligence";
import type { EventTrustSummary } from "@/lib/trust";

export interface RoomFitResult {
  score: number;
  label: "Best room tonight" | "Strong fit" | "Worth tracking" | "Needs more signal";
  reasons: string[];
  explanation: string;
}

export interface RoomFitInput {
  showType: string;
  venue: {
    name: string;
    city: string;
    state: string;
    type: string;
    capacity?: number | null;
  };
  comedians: Array<{
    comedian?: {
      name: string;
      genres?: Array<{ genre: string }>;
    };
  }>;
  trust: EventTrustSummary;
  scene?: Pick<
    SceneIntelligence,
    "sceneScore" | "momentumScore" | "loyaltyScore" | "varietyScore"
  > | null;
  priceMin?: number | null;
  priceMax?: number | null;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function getRoomBaseline(type: string) {
  switch (type) {
    case "CLUB":
      return 96;
    case "THEATER":
      return 88;
    case "FESTIVAL":
      return 80;
    case "BAR":
      return 72;
    case "OPEN_MIC":
      return 66;
    default:
      return 70;
  }
}

function getLabel(score: number): RoomFitResult["label"] {
  if (score >= 80) return "Best room tonight";
  if (score >= 68) return "Strong fit";
  if (score >= 54) return "Worth tracking";
  return "Needs more signal";
}

export function scoreRoomFit(input: RoomFitInput): RoomFitResult {
  const lineupGenres = input.comedians.flatMap((entry) =>
    entry.comedian?.genres?.map((genre) => genre.genre) ?? [],
  );
  const roomBaseline = getRoomBaseline(input.venue.type);
  const sceneScore =
    input.scene
      ? (input.scene.sceneScore * 0.45 +
          input.scene.momentumScore * 0.25 +
          input.scene.loyaltyScore * 0.15 +
          input.scene.varietyScore * 0.15)
      : 58;
  const lineupSignal = input.comedians.length > 0 ? Math.min(100, 45 + input.comedians.length * 14) : 25;
  const pricingSignal =
    input.priceMin == null && input.priceMax == null
      ? 52
      : input.priceMax != null && input.priceMax <= 35
        ? 92
        : input.priceMax != null && input.priceMax <= 60
          ? 78
          : 64;

  const score = round(
    roomBaseline * 0.22 +
      sceneScore * 0.28 +
      input.trust.trustScore * 0.3 +
      lineupSignal * 0.12 +
      pricingSignal * 0.08,
  );

  const reasons: string[] = [];
  if (sceneScore >= 72) {
    reasons.push(`${input.venue.city} has enough scene momentum to support discovery`);
  }
  if (input.trust.trustScore >= 72) {
    reasons.push("Trust signals are strong enough to convert hesitation into a yes");
  }
  if (roomBaseline >= 88) {
    reasons.push(`${input.venue.name} is the kind of room fans already trust for comedy`);
  }
  if (lineupGenres.length > 0) {
    reasons.push(`The lineup reads clearly for ${lineupGenres.slice(0, 2).join(" / ")} fans`);
  } else if (input.comedians.length > 0) {
    reasons.push("The lineup is visible, even if the taste shape is still sparse");
  } else {
    reasons.push("This room still needs stronger lineup data before it can punch through");
  }
  if (input.trust.freshness.status === "stale") {
    reasons.push("The event needs a freshness pass before this can be a fully trusted recommendation");
  }

  const label = getLabel(score);
  const explanation =
    label === "Best room tonight"
      ? `Best room tonight because the scene is active, the room type fits comedy, and the trust layer is unusually strong.`
      : label === "Strong fit"
        ? `Strong fit because the room, scene, and trust signals line up well enough to recommend with confidence.`
        : label === "Worth tracking"
          ? `Worth tracking because some signals are promising, but the room fit still needs fresher or clearer evidence.`
          : `Needs more signal before this can be treated like a trusted room-fit recommendation.`;

  return {
    score,
    label,
    reasons: reasons.slice(0, 4),
    explanation,
  };
}

