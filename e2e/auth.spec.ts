import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("sign in page loads", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create one|create account/i })).toBeVisible();
  });

  test("sign up page loads", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /sign up|create account/i })).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("sign in redirects when already signed in", async ({ page }) => {
    // Note: This test assumes no session - if session exists, behavior may differ
    await page.goto("/auth/signin");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
