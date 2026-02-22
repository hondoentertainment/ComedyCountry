import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search bar is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByPlaceholder("Search…")).toBeVisible();
  });

  test("search page shows message for short query", async ({ page }) => {
    await page.goto("/search?q=a");
    await expect(page.getByText(/Enter at least 2 characters/i)).toBeVisible();
  });

  test("search page with valid query shows results or empty", async ({ page }) => {
    await page.goto("/search?q=comedy");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    // Either results or "No results" or sections
    const hasResults = await page.getByText(/Comedians|Venues|Events|No results/).first().isVisible();
    expect(hasResults).toBeTruthy();
  });

  test("search input triggers dropdown on nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const searchInput = page.getByPlaceholder("Search…");
    await searchInput.fill("comedy");
    await searchInput.press("Tab");
    // Dropdown may show "Searching…" or results
    await expect(
      page.getByText(/Searching|Comedians|Venues|Events|No results|View all results/)
    ).toBeVisible({ timeout: 5000 });
  });
});
