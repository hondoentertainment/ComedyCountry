import { applyEnvDefaults, assertEnv, validateEnv } from "@/lib/env";

describe("applyEnvDefaults", () => {
  it("falls back to DATABASE_URL for DIRECT_DATABASE_URL", () => {
    const env = applyEnvDefaults({
      DATABASE_URL: "postgresql://user:password@localhost:5432/punchline_atlas",
    });

    expect(env.DIRECT_DATABASE_URL).toBe(env.DATABASE_URL);
  });

  it("uses the Vercel production URL when NEXTAUTH_URL is unset", () => {
    const env = applyEnvDefaults({
      VERCEL_PROJECT_PRODUCTION_URL: "punchline-atlas.vercel.app",
    });

    expect(env.NEXTAUTH_URL).toBe("https://punchline-atlas.vercel.app");
  });
});

describe("validateEnv", () => {
  it("accepts the minimum required production env", () => {
    const result = validateEnv({
      DATABASE_URL: "postgresql://user:password@localhost:5432/punchline_atlas",
      NEXTAUTH_SECRET: "12345678901234567890123456789012",
      NEXTAUTH_URL: "https://punchlineatlas.com",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("reports missing and invalid required env values", () => {
    const result = validateEnv({
      DATABASE_URL: "",
      NEXTAUTH_SECRET: "",
      NEXTAUTH_URL: "not-a-url",
    });

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["DATABASE_URL", "NEXTAUTH_SECRET"]);
    expect(result.errors).toContain("NEXTAUTH_URL: NEXTAUTH_URL must be a valid URL");
  });

  it("warns about risky production configuration", () => {
    const result = validateEnv({
      DATABASE_URL: "postgresql://user:password@localhost:5432/punchline_atlas",
      NEXTAUTH_SECRET: "change-me-in-production",
      NEXTAUTH_URL: "http://punchlineatlas.com",
      NODE_ENV: "production",
      GOOGLE_CLIENT_ID: "client-id-only",
    });

    expect(result.warnings).toContain(
      "NEXTAUTH_SECRET looks like a placeholder and should be replaced before production"
    );
    expect(result.warnings).toContain("NEXTAUTH_URL should use https in production");
    expect(result.warnings).toContain("Google OAuth is only partially configured");
  });

  it("warns when defaults are filling production gaps", () => {
    const result = validateEnv({
      DATABASE_URL: "postgresql://user:password@localhost:5432/punchline_atlas",
      NEXTAUTH_SECRET: "12345678901234567890123456789012",
      VERCEL_PROJECT_PRODUCTION_URL: "punchline-atlas.vercel.app",
      NODE_ENV: "production",
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL for migrations"
    );
    expect(result.warnings).toContain(
      "NEXTAUTH_URL is not set explicitly; falling back to the Vercel deployment URL"
    );
  });
});

describe("assertEnv", () => {
  it("throws in production when required env is missing", () => {
    expect(() =>
      assertEnv({
        NODE_ENV: "production",
        DATABASE_URL: "",
        NEXTAUTH_SECRET: "",
        NEXTAUTH_URL: "",
      })
    ).toThrow(/Environment validation failed/);
  });
});
