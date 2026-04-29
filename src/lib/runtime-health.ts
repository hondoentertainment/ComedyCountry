import { prisma } from "@/lib/prisma";
import { validateEnv } from "@/lib/env";

type CheckStatus = "pass" | "warn" | "fail";
type RuntimeStatus = "ok" | "degraded" | "error";

type RuntimeCheck = {
  status: CheckStatus;
  latencyMs?: number;
  message?: string;
};

export type RuntimeHealthSnapshot = {
  status: RuntimeStatus;
  ready: boolean;
  service: string;
  environment: string;
  timestamp: string;
  release?: string;
  checks: {
    app: RuntimeCheck;
    env: RuntimeCheck;
    database: RuntimeCheck;
    observability: RuntimeCheck;
  };
  warnings: string[];
};

function getRelease() {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? undefined;
}

async function checkDatabase(): Promise<RuntimeCheck> {
  const start = Date.now();

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return {
      status: "pass",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connectivity check failed";
    return {
      status: "fail",
      latencyMs: Date.now() - start,
      message,
    };
  }
}

export async function getReadinessSnapshot(): Promise<RuntimeHealthSnapshot> {
  const envCheck = validateEnv();
  const databaseCheck = envCheck.valid
    ? await checkDatabase()
    : {
        status: "fail" as const,
        message: "Skipped because required environment validation failed",
      };

  const warnings = [...envCheck.warnings];
  const envMessages = [
    envCheck.missing.length > 0 ? `Missing: ${envCheck.missing.join(", ")}` : null,
    envCheck.errors.length > 0 ? `Invalid: ${envCheck.errors.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const observabilityConfigured = Boolean(
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  );

  const observabilityCheck: RuntimeCheck = observabilityConfigured
    ? { status: "pass" }
    : {
        status: process.env.NODE_ENV === "production" ? "warn" : "pass",
        message: observabilityConfigured ? undefined : "Sentry DSN is not configured",
      };

  if (observabilityCheck.status === "warn" && observabilityCheck.message) {
    warnings.push(observabilityCheck.message);
  }

  const failedChecks = [!envCheck.valid, databaseCheck.status === "fail"];
  const hasWarnings = warnings.length > 0 || observabilityCheck.status === "warn";

  return {
    status: failedChecks.some(Boolean) ? "error" : hasWarnings ? "degraded" : "ok",
    ready: !failedChecks.some(Boolean),
    service: "punchline-atlas",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    release: getRelease(),
    checks: {
      app: { status: "pass" },
      env: {
        status: envCheck.valid ? (warnings.length > 0 ? "warn" : "pass") : "fail",
        message: envMessages || undefined,
      },
      database: databaseCheck,
      observability: observabilityCheck,
    },
    warnings: [...new Set(warnings)],
  };
}
