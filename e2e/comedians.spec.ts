import { test, expect } from "@playwright/test";

test.describe("Comedians Page", () => {
  test("loads comedians list page", async ({ page }) => {
    await page.goto("/comedians");
    await expect(page.getByRole("heading", { name: "Comedians", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Explore comedian profiles/i)
    ).toBeVisible();
  });

  test("has filter form with search, status, genre", async ({ page }) => {
    await page.goto("/comedians");
    await expect(page.getByPlaceholder("Search comedians...")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /touring status/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Genre/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter" })).toBeVisible();
  });

  test("filter form submits and updates URL", async ({ page }) => {
    await page.goto("/comedians");
    await page.getByPlaceholder("Search comedians...").fill("test");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/search=test/);
  });

  test("displays comedians found count", async ({ page }) => {
    await page.goto("/comedians");
    await expect(page.getByText(/comedian(s)? found/i)).toBeVisible();
  });

  test("comedian list items are clickable", async ({ page }) => {
    await page.goto("/comedians");
    const comedianLinks = page.locator('main a[href^="/comedians/"]').filter({
      hasNot: page.getByText("Browse all comedians"),
    });
    const count = await comedianLinks.count();
    if (count > 0) {
      await comedianLinks.first().click();
      await expect(page).toHaveURL(/\/comedians\/[^?]+$/);
    }
  });

  test("handles empty state when no comedians match", async ({ page }) => {
    await page.goto("/comedians?search=nonexistent-xyz-12345");
    await expect(page.getByText(/No comedians found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse all comedians" })).toBeVisible();
  });
});

test.describe("Comedian Detail Page", () => {
  test("loads when valid comedian slug", async ({ page }) => {
    await page.goto("/comedians");
    const firstComedianLink = page.locator('main a[href^="/comedians/"]').filter({
      hasNot: page.getByText("Browse all comedians"),
    }).first();
    const count = await firstComedianLink.count();
    if (count > 0) {
      await firstComedianLink.click();
      await expect(page.getByRole("link", { name: "← Back to Comedians" })).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("Back to Comedians link returns to list", async ({ page }) => {
    await page.goto("/comedians");
    const firstComedianLink = page.locator('main a[href^="/comedians/"]').filter({
      hasNot: page.getByText("Browse all comedians"),
    }).first();
    if ((await firstComedianLink.count()) > 0) {
      await firstComedianLink.click();
      await page.getByRole("link", { name: "← Back to Comedians" }).click();
      await expect(page).toHaveURL("/comedians");
    }
  });
});
