import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads and displays hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Punchline Atlas", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/The nationwide comedy intelligence platform/i)
    ).toBeVisible();
  });

  test("hero links navigate to main sections", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Venues" }).filter({ hasText: "Venues" }).first().click();
    await expect(page).toHaveURL("/venues");
  });

  test("has Recent Venues section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recent Venues" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View all venues →" })).toBeVisible();
  });

  test("has Upcoming Shows section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Upcoming Shows" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View full schedule →" })).toBeVisible();
  });

  test("View all venues link works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View all venues →" }).click();
    await expect(page).toHaveURL("/venues");
  });

  test("View full schedule link works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View full schedule →" }).click();
    await expect(page).toHaveURL("/schedule");
  });

  test("venue link in Recent Venues navigates to venue detail", async ({ page }) => {
    await page.goto("/");
    const venueLink = page.locator('a[href^="/venues/"]').first();
    const count = await venueLink.count();
    if (count > 0) {
      const href = await venueLink.getAttribute("href");
      await venueLink.click();
      await expect(page).toHaveURL(new RegExp(`^${href.replace("/", "\\/")}`));
    }
  });
});
