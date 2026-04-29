import { expect, test } from "@playwright/test";

const publicRoutes = [
  {
    path: "/",
    heading: /Find the right comedy night/i,
  },
  {
    path: "/schedule",
    heading: "Schedule",
  },
  {
    path: "/venues",
    heading: "Venues",
  },
  {
    path: "/comedians",
    heading: "Comedians",
  },
] as const;

test.describe("production smoke", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  for (const route of publicRoutes) {
    test(`${route.path} responds and renders a primary heading`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });

      expect(response, `expected a response for ${route.path}`).not.toBeNull();
      expect(response?.ok(), `expected ${route.path} to return a successful response`).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    });
  }
});
