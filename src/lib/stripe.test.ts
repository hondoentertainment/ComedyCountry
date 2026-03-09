import { describe, it, expect } from "vitest";
import { getStripePriceId, getPlanName, isStripeConfigured } from "./stripe";

describe("Stripe utilities", () => {
  it("returns price ID for valid plans", () => {
    expect(getStripePriceId("FAN_PRO")).toBe("price_fan_pro");
    expect(getStripePriceId("COMEDIAN_PRO")).toBe("price_comedian_pro");
    expect(getStripePriceId("VENUE_PREMIUM")).toBe("price_venue_premium");
  });

  it("returns null for invalid plan", () => {
    expect(getStripePriceId("INVALID")).toBeNull();
  });

  it("returns plan names", () => {
    expect(getPlanName("FAN_PRO")).toBe("Fan Pro");
    expect(getPlanName("COMEDIAN_PREMIUM")).toBe("Comedian Premium");
    expect(getPlanName("UNKNOWN")).toBe("UNKNOWN");
  });

  it("detects Stripe configuration status", () => {
    // Without env vars set, should return false
    expect(isStripeConfigured()).toBe(false);
  });
});
