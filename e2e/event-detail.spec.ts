import { test, expect } from "@playwright/test";

test.describe("Event Detail", () => {
  test("navigates to event from schedule", async ({ page }) => {
    await page.goto("/schedule");
    const eventLink = page.locator('a[href^="/events/"]').first();
    const count = await eventLink.count();
    if (count > 0) {
      const href = await eventLink.getAttribute("href");
      await eventLink.click();
      await expect(page).toHaveURL(new RegExp(`/events/`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("event page shows reviews section when present", async ({ page }) => {
    await page.goto("/schedule");
    const eventLink = page.locator('a[href^="/events/"]').first();
    if ((await eventLink.count()) > 0) {
      await eventLink.click();
      await expect(page.getByRole("heading", { name: /rate this show|reviews/i })).toBeVisible({ timeout: 5000 });
    }
  });
});
