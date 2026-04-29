import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.fn();
const originalEnv = { ...process.env };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: queryRawMock,
  },
}));

describe("getReadinessSnapshot", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("returns ready when env validates and the database is reachable", async () => {
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/punchline_atlas";
    process.env.NEXTAUTH_SECRET = "12345678901234567890123456789012";
    process.env.NEXTAUTH_URL = "https://punchlineatlas.com";
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.CRON_SECRET = "cron-secret";
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const { getReadinessSnapshot } = await import("@/lib/runtime-health");
    const snapshot = await getReadinessSnapshot();

    expect(snapshot.ready).toBe(true);
    expect(snapshot.status).toBe("ok");
    expect(snapshot.checks.database.status).toBe("pass");
  });

  it("returns not ready when required env is missing", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;

    const { getReadinessSnapshot } = await import("@/lib/runtime-health");
    const snapshot = await getReadinessSnapshot();

    expect(snapshot.ready).toBe(false);
    expect(snapshot.status).toBe("error");
    expect(snapshot.checks.env.status).toBe("fail");
    expect(queryRawMock).not.toHaveBeenCalled();
  });
});
