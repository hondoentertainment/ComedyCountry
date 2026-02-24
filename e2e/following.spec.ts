import { test, expect } from "@playwright/test";

test.describe("Following Page", () => {
  test("redirects to signin when not authenticated", async ({ page }) => {
    await page.goto("/following");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("Following link in nav navigates to /following then redirects", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Following" }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
