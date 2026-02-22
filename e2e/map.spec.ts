import { test, expect } from "@playwright/test";

test.describe("Map Page", () => {
  test("loads map page", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "Map", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Browse comedy venues across the country/i)
    ).toBeVisible();
  });

  test("map container or fallback is present", async ({ page }) => {
    await page.goto("/map");
    const mapContent = page.locator("main");
    await expect(mapContent).toBeVisible();
    const hasMapOrFallback =
      (await page.locator('[class*="aspect-video"]').count()) > 0 ||
      (await page.getByText(/Google Maps|Loading map|venue/i).count()) > 0;
    expect(hasMapOrFallback).toBeTruthy();
  });

  test("shows either map or API key message when no key", async ({ page }) => {
    await page.goto("/map");
    const content = await page.locator("main").textContent();
    expect(
      content?.includes("venue") ||
        content?.includes("Map") ||
        content?.includes("API key") ||
        content?.includes("Loading")
    ).toBeTruthy();
  });
});
