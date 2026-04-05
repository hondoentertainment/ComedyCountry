/** Validate required environment variables at startup and provide typed access. */

const requiredKeys = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

type RequiredKey = (typeof requiredKeys)[number];

const optionalKeys = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "EMAIL_FROM",
  "YOUTUBE_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "LOG_LEVEL",
  "CRON_SECRET",
  "SENTRY_DSN",
] as const;

type OptionalKey = (typeof optionalKeys)[number];

type EnvVars = Record<RequiredKey, string> & Record<OptionalKey, string | undefined>;

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Warn if NEXTAUTH_SECRET is the default placeholder
  if (process.env.NEXTAUTH_SECRET === "change-me-in-production") {
    warnings.push("NEXTAUTH_SECRET is set to the default placeholder — change this in production");
  }

  // Warn about missing optional vars that enable key features
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push("STRIPE_SECRET_KEY not set — payment processing will be disabled");
  }

  if (!process.env.SMTP_HOST) {
    warnings.push("SMTP_HOST not set — email sending will be disabled");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/** Call at server startup to halt if required vars are missing */
export function assertEnv(): void {
  if (process.env.NODE_ENV === "test") return;

  const { valid, missing, warnings } = validateEnv();

  for (const w of warnings) {
    console.warn(`⚠ ENV: ${w}`);
  }

  if (!valid) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in your .env file or deployment environment."
    );
  }
}

/**
 * Build a typed env object. Required keys are guaranteed to be strings;
 * optional keys may be undefined.
 */
function buildEnv(): EnvVars {
  // In non-test environments, validate immediately on import
  if (process.env.NODE_ENV !== "test") {
    assertEnv();
  }

  const env = {} as Record<string, string | undefined>;

  for (const key of requiredKeys) {
    env[key] = process.env[key];
  }
  for (const key of optionalKeys) {
    env[key] = process.env[key];
  }

  return env as EnvVars;
}

/** Typed, validated environment variables. Importing this module in non-test
 *  environments will throw immediately if any required variable is missing. */
export const env: EnvVars = buildEnv();
