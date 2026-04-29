import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {},
}));

vi.mock("./freshness", () => ({
  getTargetCityCoverage: vi.fn(async () => []),
}));

import { inspectImportPayload, resolveImportOptions } from "./import";

describe("resolveImportOptions", () => {
  afterEach(() => {
    delete process.env.IMPORT_STRICT_TARGET_CITIES;
    delete process.env.IMPORT_MAX_VENUES;
    delete process.env.IMPORT_MAX_EVENTS;
  });

  it("uses env-backed import guardrails when explicit options are absent", () => {
    process.env.IMPORT_STRICT_TARGET_CITIES = "true";
    process.env.IMPORT_MAX_VENUES = "25";
    process.env.IMPORT_MAX_EVENTS = "60";

    const resolved = resolveImportOptions();

    expect(resolved.strictTargetCities).toBe(true);
    expect(resolved.maxVenues).toBe(25);
    expect(resolved.maxEvents).toBe(60);
  });
});

describe("inspectImportPayload", () => {
  it("flags duplicate venues and events without turning them into fatal errors", () => {
    const inspection = inspectImportPayload({
      venues: [
        { name: "Room One", city: "New York", state: "NY" },
        { name: "Room One", city: "New York", state: "NY" },
      ],
      events: [
        {
          venue: { name: "Room One", city: "New York", state: "NY" },
          date: "2026-05-10T00:00:00.000Z",
          showtime: "8:00 PM",
          comedians: [{ slug: "maya-ramirez" }],
        },
        {
          venue: { name: "Room One", city: "New York", state: "NY" },
          date: "2026-05-10T00:00:00.000Z",
          showtime: "8:00 PM",
          comedians: [{ slug: "maya-ramirez" }],
        },
      ],
    });

    expect(inspection.fatalErrors).toHaveLength(0);
    expect(inspection.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["duplicate-venue", "duplicate-event"]),
    );
  });

  it("blocks non-target city imports when strict target city mode is enabled", () => {
    const inspection = inspectImportPayload(
      {
        venues: [{ name: "Seattle Laugh Lab", city: "Seattle", state: "WA" }],
        events: [
          {
            venue: { name: "Seattle Laugh Lab", city: "Seattle", state: "WA" },
            date: "2026-05-12T00:00:00.000Z",
            comedians: [{ slug: "darius-brooks" }],
          },
        ],
      },
      { strictTargetCities: true },
    );

    expect(inspection.fatalErrors).toHaveLength(2);
    expect(inspection.fatalErrors.join(" ")).toContain("Non-target city");
  });
});
