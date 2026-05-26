import { z } from "zod";

const requiredEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
});

type EnvSource = NodeJS.ProcessEnv;

export type EnvValidationResult = {
  valid: boolean;
  missing: string[];
  errors: string[];
  warnings: string[];
};

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function applyEnvDefaults(env: EnvSource = process.env): EnvSource {
  const normalizedEnv = { ...env };

  for (const [key, value] of Object.entries(normalizedEnv)) {
    if (typeof value === "string") {
      normalizedEnv[key] = value.trim();
    }
  }

  if (!hasValue(normalizedEnv.DIRECT_DATABASE_URL) && hasValue(normalizedEnv.DATABASE_URL)) {
    normalizedEnv.DIRECT_DATABASE_URL = normalizedEnv.DATABASE_URL;
  }

  if (!hasValue(normalizedEnv.NEXTAUTH_URL)) {
    const vercelUrl =
      hasValue(env.VERCEL_PROJECT_PRODUCTION_URL) ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;

    if (hasValue(vercelUrl)) {
      normalizedEnv.NEXTAUTH_URL = normalizeUrl(vercelUrl!);
    }
  }

  return normalizedEnv;
}

function isLikelyPlaceholder(value: string | undefined) {
  if (!hasValue(value)) {
    return false;
  }

  const normalized = value!.trim().toLowerCase();
  return (
    normalized.includes("change-me") ||
    normalized.includes("your-") ||
    normalized.includes("placeholder") ||
    normalized === "secret" ||
    normalized === "changeme"
  );
}

function addPairWarning(
  env: EnvSource,
  warnings: string[],
  left: keyof EnvSource,
  right: keyof EnvSource,
  label: string
) {
  const leftPresent = hasValue(env[left]);
  const rightPresent = hasValue(env[right]);

  if (leftPresent !== rightPresent) {
    warnings.push(`${label} is only partially configured`);
  }
}

export function validateEnv(env: EnvSource = process.env): EnvValidationResult {
  const normalizedEnv = applyEnvDefaults(env);
  const missing = Object.keys(requiredEnvSchema.shape).filter((key) => !hasValue(normalizedEnv[key]));
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredParse = requiredEnvSchema.safeParse({
    DATABASE_URL: normalizedEnv.DATABASE_URL,
    NEXTAUTH_SECRET: normalizedEnv.NEXTAUTH_SECRET,
    NEXTAUTH_URL: normalizedEnv.NEXTAUTH_URL,
  });

  if (!requiredParse.success) {
    const fieldErrors = requiredParse.error.flatten().fieldErrors;

    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (missing.includes(field)) {
        continue;
      }

      for (const message of messages ?? []) {
        errors.push(`${field}: ${message}`);
      }
    }
  }

  if (isLikelyPlaceholder(normalizedEnv.NEXTAUTH_SECRET)) {
    warnings.push("NEXTAUTH_SECRET looks like a placeholder and should be replaced before production");
  } else if (
    hasValue(normalizedEnv.NEXTAUTH_SECRET) &&
    normalizedEnv.NEXTAUTH_SECRET!.trim().length < 32
  ) {
    warnings.push("NEXTAUTH_SECRET is shorter than 32 characters");
  }

  if (
    normalizedEnv.NODE_ENV === "production" &&
    hasValue(normalizedEnv.NEXTAUTH_URL) &&
    !normalizedEnv.NEXTAUTH_URL!.startsWith("https://")
  ) {
    warnings.push("NEXTAUTH_URL should use https in production");
  }

  if (!hasValue(normalizedEnv.SENTRY_DSN) && !hasValue(normalizedEnv.NEXT_PUBLIC_SENTRY_DSN)) {
    warnings.push("Sentry DSN is not configured");
  }

  if (!hasValue(normalizedEnv.CRON_SECRET) && !hasValue(normalizedEnv.CRON_API_KEY)) {
    warnings.push("Cron protection secret is not configured");
  }

  if (!hasValue(env.DIRECT_DATABASE_URL) && hasValue(normalizedEnv.DIRECT_DATABASE_URL)) {
    warnings.push("DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL for migrations");
  }

  if (
    !hasValue(env.NEXTAUTH_URL) &&
    hasValue(normalizedEnv.NEXTAUTH_URL) &&
    (hasValue(env.VERCEL_PROJECT_PRODUCTION_URL) || hasValue(env.VERCEL_URL))
  ) {
    warnings.push("NEXTAUTH_URL is not set explicitly; falling back to the Vercel deployment URL");
  }

  addPairWarning(normalizedEnv, warnings, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "Google OAuth");
  addPairWarning(normalizedEnv, warnings, "KV_REST_API_URL", "KV_REST_API_TOKEN", "Vercel KV");
  addPairWarning(
    normalizedEnv,
    warnings,
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "Web Push VAPID"
  );
  addPairWarning(normalizedEnv, warnings, "SENTRY_ORG", "SENTRY_PROJECT", "Sentry release");
  addPairWarning(
    normalizedEnv,
    warnings,
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
    "Sentry build upload"
  );

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
    warnings,
  };
}

export function assertEnv(env: EnvSource = process.env): void {
  if (env.NODE_ENV === "test") {
    return;
  }

  const { valid, missing, errors, warnings } = validateEnv(env);

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (!valid) {
    const parts = [
      missing.length > 0 ? `missing: ${missing.join(", ")}` : null,
      errors.length > 0 ? `errors: ${errors.join("; ")}` : null,
    ].filter(Boolean);

    const message = `Environment validation failed (${parts.join(" | ")})`;
    console.error(`[env] ${message}`);

    if (env.NODE_ENV === "production") {
      throw new Error(message);
    }
  }
}
