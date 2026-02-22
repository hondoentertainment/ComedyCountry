import { test, expect } from "@playwright/test";

test.describe("Venues Page", () => {
  test("loads venues list page", async ({ page }) => {
    await page.goto("/venues");
    await expect(page.getByRole("heading", { name: "Venues", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Browse comedy venues nationwide/i)
    ).toBeVisible();
  });

  test("has filter form with search, state, city, type", async ({ page }) => {
    await page.goto("/venues");
    await expect(page.getByPlaceholder("Search venues...")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /state/i })).toBeVisible();
    await expect(page.getByPlaceholder("City")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /type/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter" })).toBeVisible();
  });

  test("filter form submits and updates URL", async ({ page }) => {
    await page.goto("/venues");
    await page.getByPlaceholder("Search venues...").fill("test");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/search=test/);
  });

  test("displays venues found count", async ({ page }) => {
    await page.goto("/venues");
    await expect(page.getByText(/venue(s)? found/i)).toBeVisible();
  });

  test("venue list items are clickable", async ({ page }) => {
    await page.goto("/venues");
    const venueLinks = page.locator('main a[href^="/venues/"]').filter({
      hasNot: page.getByText("View all venues"),
    });
    const count = await venueLinks.count();
    if (count > 0) {
      await venueLinks.first().click();
      await expect(page).toHaveURL(/\/venues\/[^?]+$/);
    }
  });

  test("handles empty state when no venues match", async ({ page }) => {
    await page.goto("/venues?search=nonexistent-xyz-12345");
    await expect(page.getByText(/No venues found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse all venues" })).toBeVisible();
  });
});

test.describe("Venue Detail Page", () => {
  test("loads when valid venue ID", async ({ page }) => {
    await page.goto("/venues");
    const firstVenueLink = page.locator('main a[href^="/venues/"]').filter({
      hasNot: page.getByText("View all venues"),
    }).first();
    const count = await firstVenueLink.count();
    if (count > 0) {
      await firstVenueLink.click();
      await expect(page.getByRole("link", { name: "← Back to Venues" })).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("Back to Venues link returns to list", async ({ page }) => {
    await page.goto("/venues");
    const firstVenueLink = page.locator('main a[href^="/venues/"]').filter({
      hasNot: page.getByText("View all venues"),
    }).first();
    if ((await firstVenueLink.count()) > 0) {
      await firstVenueLink.click();
      await page.getByRole("link", { name: "← Back to Venues" }).click();
      await expect(page).toHaveURL("/venues");
    }
  });
});
