import { test, expect } from "@playwright/test";

test.describe("Pagination", () => {
  test("venues page shows pagination when enough results", async ({ page }) => {
    await page.goto("/venues");
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    const prevLink = page.getByRole("link", { name: "Previous" });
    const nextLink = page.getByRole("link", { name: "Next" });
    const paginationVisible = await pagination.isVisible();
    if (paginationVisible) {
      const hasPrev = await prevLink.isVisible();
      const hasNext = await nextLink.isVisible();
      expect(hasPrev || hasNext).toBeTruthy();
    }
  });

  test("schedule pagination next navigates", async ({ page }) => {
    await page.goto("/schedule");
    const nextLink = page.getByRole("link", { name: "Next" });
    if (await nextLink.isVisible()) {
      await nextLink.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test("comedians pagination previous navigates", async ({ page }) => {
    await page.goto("/comedians?page=2");
    const prevLink = page.getByRole("link", { name: "Previous" });
    if (await prevLink.isVisible()) {
      await prevLink.click();
      await expect(page).toHaveURL(/comedians/);
      await expect(page).not.toHaveURL(/page=2/);
    }
  });
});
