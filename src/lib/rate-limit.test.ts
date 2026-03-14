import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const result = checkRateLimit("test-key-1", { limit: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("decrements remaining count", () => {
    const key = "test-key-2";
    checkRateLimit(key, { limit: 3, windowSeconds: 60 });
    const r2 = checkRateLimit(key, { limit: 3, windowSeconds: 60 });
    expect(r2.remaining).toBe(1);
    const r3 = checkRateLimit(key, { limit: 3, windowSeconds: 60 });
    expect(r3.remaining).toBe(0);
    expect(r3.success).toBe(true);
  });

  it("rejects requests over the limit", () => {
    const key = "test-key-3";
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { limit: 3, windowSeconds: 60 });
    }
    const over = checkRateLimit(key, { limit: 3, windowSeconds: 60 });
    expect(over.success).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("returns a resetAt timestamp", () => {
    const result = checkRateLimit("test-key-4", { limit: 10, windowSeconds: 60 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
