import { describe, it, expect } from "vitest";
import {
  VENUE_TYPE_LABELS,
  SHOW_TYPE_LABELS,
  TOURING_STATUS_LABELS,
  PAGE_SIZE,
} from "./constants";

describe("constants", () => {
  describe("VENUE_TYPE_LABELS", () => {
    it("maps venue types to labels", () => {
      expect(VENUE_TYPE_LABELS.CLUB).toBe("Club");
      expect(VENUE_TYPE_LABELS.THEATER).toBe("Theater");
      expect(VENUE_TYPE_LABELS.BAR).toBe("Bar");
      expect(VENUE_TYPE_LABELS.FESTIVAL).toBe("Festival");
      expect(VENUE_TYPE_LABELS.OPEN_MIC).toBe("Open Mic");
    });
  });

  describe("SHOW_TYPE_LABELS", () => {
    it("maps show types to labels", () => {
      expect(SHOW_TYPE_LABELS.HEADLINE).toBe("Headline");
      expect(SHOW_TYPE_LABELS.FEATURE).toBe("Feature");
      expect(SHOW_TYPE_LABELS.OPEN_MIC).toBe("Open Mic");
      expect(SHOW_TYPE_LABELS.FESTIVAL).toBe("Festival");
      expect(SHOW_TYPE_LABELS.PODCAST_LIVE).toBe("Podcast Live");
    });
  });

  describe("TOURING_STATUS_LABELS", () => {
    it("maps touring statuses to labels", () => {
      expect(TOURING_STATUS_LABELS.TOURING).toBe("Touring");
      expect(TOURING_STATUS_LABELS.REGIONAL).toBe("Regional");
      expect(TOURING_STATUS_LABELS.LOCAL).toBe("Local");
      expect(TOURING_STATUS_LABELS.RETIRED).toBe("Retired");
      expect(TOURING_STATUS_LABELS.UNKNOWN).toBe("Unknown");
    });
  });

  describe("PAGE_SIZE", () => {
    it("is 20", () => {
      expect(PAGE_SIZE).toBe(20);
    });
  });
});
