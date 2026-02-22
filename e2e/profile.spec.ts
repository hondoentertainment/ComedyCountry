import { test, expect } from "@playwright/test";

test.describe("Profile", () => {
  test("profile page redirects to signin when not authenticated", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("following page redirects to signin when not authenticated", async ({ page }) => {
    await page.goto("/following");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("settings page redirects to signin when not authenticated", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
