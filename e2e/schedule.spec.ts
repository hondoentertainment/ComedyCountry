import { test, expect } from "@playwright/test";

test.describe("Schedule Page", () => {
  test("loads schedule page", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { name: "Schedule", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/National comedy calendar/i)
    ).toBeVisible();
  });

  test("has filter form with from date, city, state", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.locator('#from')).toBeVisible();
    await expect(page.getByPlaceholder("City")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /state/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter" })).toBeVisible();
  });

  test("filter form submits and updates URL", async ({ page }) => {
    await page.goto("/schedule");
    await page.getByPlaceholder("City").fill("New York");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/city=New\+?York/);
  });

  test("displays shows found count", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByText(/show(s)? found/i)).toBeVisible();
  });

  test("handles empty state when no shows", async ({ page }) => {
    await page.goto("/schedule?from=2030-01-01");
    await expect(page.getByText(/No shows found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
  });

  test("event items link to venues", async ({ page }) => {
    await page.goto("/schedule");
    const venueLinks = page.locator('main a[href^="/venues/"]');
    const count = await venueLinks.count();
    if (count > 0) {
      await venueLinks.first().click();
      await expect(page).toHaveURL(/\/venues\/[^?]+$/);
    }
  });

  test("event items link to comedians", async ({ page }) => {
    await page.goto("/schedule");
    const comedianLinks = page.locator('main a[href^="/comedians/"]');
    const count = await comedianLinks.count();
    if (count > 0) {
      await comedianLinks.first().click();
      await expect(page).toHaveURL(/\/comedians\/[^?]+$/);
    }
  });
});
