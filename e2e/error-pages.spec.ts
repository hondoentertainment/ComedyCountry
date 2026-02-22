import { test, expect } from "@playwright/test";

test.describe("404 Page", () => {
  test("shows 404 for non-existent route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Page not found/i })).toBeVisible();
  });

  test("404 has Go home link", async ({ page }) => {
    await page.goto("/nonexistent");
    await page.getByRole("link", { name: "Go home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("404 has Browse venues link", async ({ page }) => {
    await page.goto("/nonexistent");
    await page.getByRole("link", { name: "Browse venues" }).click();
    await expect(page).toHaveURL("/venues");
  });

  test("404 has Browse comedians link", async ({ page }) => {
    await page.goto("/nonexistent");
    await page.getByRole("link", { name: "Browse comedians" }).click();
    await expect(page).toHaveURL("/comedians");
  });

  test("404 has View schedule link", async ({ page }) => {
    await page.goto("/nonexistent");
    await page.getByRole("link", { name: "View schedule" }).click();
    await expect(page).toHaveURL("/schedule");
  });
});

test.describe("Invalid Venue/Comedian ID", () => {
  test("invalid venue ID shows 404", async ({ page }) => {
    await page.goto("/venues/invalid-id-12345");
    await expect(page.getByText("404")).toBeVisible();
  });

  test("invalid comedian slug shows 404", async ({ page }) => {
    await page.goto("/comedians/invalid-slug-xyz");
    await expect(page.getByText("404")).toBeVisible();
  });
});
