import { describe, it, expect } from "vitest";
import { formatEventPrice } from "./format";

describe("formatEventPrice", () => {
  it("returns null when both prices are null or undefined", () => {
    expect(formatEventPrice(null, null)).toBeNull();
    expect(formatEventPrice(undefined as never, undefined as never)).toBeNull();
    expect(formatEventPrice(null, undefined as never)).toBeNull();
    expect(formatEventPrice(undefined as never, null)).toBeNull();
  });

  it('returns "Free" when min is 0 and max is 0 or null', () => {
    expect(formatEventPrice(0, 0)).toBe("Free");
    expect(formatEventPrice(0, null)).toBe("Free");
    expect(formatEventPrice("0", "0")).toBe("Free");
  });

  it("returns single price when min and max are equal", () => {
    expect(formatEventPrice(25, 25)).toBe("$25");
    expect(formatEventPrice(100, 100)).toBe("$100");
  });

  it("returns single price when only min provided (max null)", () => {
    expect(formatEventPrice(50, null)).toBe("$50");
    expect(formatEventPrice(10, undefined as never)).toBe("$10");
  });

  it("returns range when both min and max are provided", () => {
    expect(formatEventPrice(25, 75)).toBe("$25–$75");
    expect(formatEventPrice(10, 50)).toBe("$10–$50");
  });

  it("handles string inputs", () => {
    expect(formatEventPrice("25", "75")).toBe("$25–$75");
    expect(formatEventPrice("0", "0")).toBe("Free");
  });

  it("handles objects with toString", () => {
    expect(formatEventPrice({ toString: () => "30" }, { toString: () => "60" })).toBe("$30–$60");
  });

  it('returns "Up to $X" when only max is provided', () => {
    expect(formatEventPrice(null, 50)).toBe("Up to $50");
    expect(formatEventPrice(undefined as never, 100)).toBe("Up to $100");
  });
});
