import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("displays brand link Punchline Atlas", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Punchline Atlas" })).toBeVisible();
  });

  test("desktop nav shows all main links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Venues" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Comedians" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Schedule" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Map" })).toBeVisible();
  });

  test("navigates to Venues from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Venues" }).click();
    await expect(page).toHaveURL("/venues");
  });

  test("navigates to Comedians from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Comedians" }).click();
    await expect(page).toHaveURL("/comedians");
  });

  test("navigates to Schedule from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Schedule" }).click();
    await expect(page).toHaveURL("/schedule");
  });

  test("navigates to Map from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Map" }).click();
    await expect(page).toHaveURL("/map");
  });

  test("brand link navigates to home", async ({ page }) => {
    await page.goto("/venues");
    await page.getByRole("link", { name: "Punchline Atlas" }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("mobile menu opens and shows links", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    const menuButton = page.getByRole("button", {
      name: "Open menu",
    });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByRole("link", { name: "Venues" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Comedians" })).toBeVisible();
  });

  test("mobile menu closes and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Venues" }).click();
    await expect(page).toHaveURL("/venues");
  });
});
