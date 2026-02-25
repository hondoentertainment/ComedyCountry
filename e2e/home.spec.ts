import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads and displays hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Find comedy|Anywhere/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/Discover venues|track comedian tours/i)).toBeVisible();
  });

  test("hero links navigate to main sections", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Venues" }).filter({ hasText: "Venues" }).first().click();
    await expect(page).toHaveURL("/venues");
  });

  test("has Explore venues section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Explore venues" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View all venues" })).toBeVisible();
  });

  test("has Upcoming Shows section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Upcoming Shows" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View full schedule →" })).toBeVisible();
  });

  test("View all venues link works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View all venues" }).first().click();
    await expect(page).toHaveURL("/venues");
  });

  test("View full schedule link works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View full schedule" }).click();
    await expect(page).toHaveURL("/schedule");
  });

  test("venue link in Explore venues navigates to venue detail", async ({ page }) => {
    await page.goto("/");
    const venueLink = page.locator('a[href^="/venues/"]').first();
    const count = await venueLink.count();
    if (count > 0) {
      const href = await venueLink.getAttribute("href");
      await venueLink.click();
      await expect(page).toHaveURL(new RegExp(`^${(href ?? "").replace("/", "\\/")}`));
    }
  });
});
