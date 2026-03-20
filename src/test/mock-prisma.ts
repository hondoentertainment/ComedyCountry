/**
 * Prisma Mock Factory
 *
 * Auto-generates a deeply-mocked Prisma client where every model method
 * is a `vi.fn()`. Supports all common Prisma operations out of the box.
 *
 * Usage in test files:
 *   import { createMockPrisma, type MockPrismaClient } from "@/test/mock-prisma";
 *
 *   const mockPrisma = createMockPrisma();
 *   vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
 *   // or for relative imports:
 *   vi.mock("./prisma", () => ({ prisma: mockPrisma }));
 *
 *   // Then use:
 *   mockPrisma.event.findMany.mockResolvedValue([...]);
 */

import { vi } from "vitest";

const PRISMA_METHODS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = any;

type MockModel = {
  [K in (typeof PRISMA_METHODS)[number]]: MockFn;
};

export type MockPrismaClient = {
  [model: string]: MockModel;
} & {
  $transaction: MockFn;
  $queryRaw: MockFn;
  $executeRaw: MockFn;
};

/**
 * Creates a Proxy-based mock Prisma client.
 * Any model access (e.g., `mockPrisma.event`) auto-generates a model
 * with all standard Prisma methods as `vi.fn()`.
 *
 * Models are lazily created and cached — the same object is returned
 * on repeated access.
 */
export function createMockPrisma(): MockPrismaClient {
  const models = new Map<string, MockModel>();

  function getOrCreateModel(name: string): MockModel {
    if (!models.has(name)) {
      const model = {} as MockModel;
      for (const method of PRISMA_METHODS) {
        model[method] = vi.fn();
      }
      models.set(name, model);
    }
    return models.get(name)!;
  }

  const transactionFn = vi.fn(async (fnOrArray: unknown) => {
    if (typeof fnOrArray === "function") {
      return (fnOrArray as (tx: MockPrismaClient) => unknown)(proxy);
    }
    // Array of promises
    return Promise.all(fnOrArray as Promise<unknown>[]);
  });

  const proxy = new Proxy(
    {
      $transaction: transactionFn,
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    } as MockPrismaClient,
    {
      get(target, prop: string) {
        if (prop in target) {
          return target[prop];
        }
        // Internal/Symbol properties
        if (typeof prop === "symbol" || prop.startsWith("_")) {
          return undefined;
        }
        return getOrCreateModel(prop);
      },
    }
  );

  return proxy;
}

/**
 * Resets all mock functions on a MockPrismaClient.
 * Call this in beforeEach() to ensure clean state.
 */
export function resetMockPrisma(mockPrisma: MockPrismaClient): void {
  mockPrisma.$transaction.mockClear();
  mockPrisma.$queryRaw.mockClear();
  mockPrisma.$executeRaw.mockClear();

  // Walk all cached models — the Proxy stores them internally,
  // but vi.clearAllMocks() already handles all vi.fn() instances.
  // This function is here for explicit targeted resets if needed.
}
