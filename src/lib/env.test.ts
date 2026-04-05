import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so buildEnv() re-runs on each import
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validateEnv reports missing required vars", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;

    // validateEnv is a pure function that doesn't throw
    const { validateEnv } = await import("@/lib/env");
    const result = validateEnv();

    expect(result.valid).toBe(false);
    expect(result.missing).toContain("DATABASE_URL");
    expect(result.missing).toContain("NEXTAUTH_SECRET");
    expect(result.missing).toContain("NEXTAUTH_URL");
  });

  it("validateEnv passes when all required vars are present", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    const { validateEnv } = await import("@/lib/env");
    const result = validateEnv();

    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("assertEnv throws a clear message listing missing vars when not in test mode", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const { assertEnv } = await import("@/lib/env");

    expect(() => assertEnv()).toThrowError(
      /Missing required environment variables: DATABASE_URL, NEXTAUTH_SECRET/
    );
  });

  it("assertEnv does not throw in test environment", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";

    const { assertEnv } = await import("@/lib/env");

    expect(() => assertEnv()).not.toThrow();
  });

  it("validateEnv warns about placeholder NEXTAUTH_SECRET", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.NEXTAUTH_SECRET = "change-me-in-production";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    const { validateEnv } = await import("@/lib/env");
    const result = validateEnv();

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("NEXTAUTH_SECRET is set to the default placeholder"),
      ])
    );
  });
});
