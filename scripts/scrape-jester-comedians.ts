/**
 * Scrape all comedians from Jester Comedy App
 * https://jestercomedyapp.com/searchAllComedians.html
 *
 * Run: npx tsx scripts/scrape-jester-comedians.ts
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const JESTER_URL = "https://jestercomedyapp.com/searchAllComedians.html";
const OUTPUT_PATH = path.join(process.cwd(), "data", "jester-comedians.json");
const EXCLUDED_SLUGS = new Set(["comedian-dashboard", "search-all"]);

type JesterComedian = {
  name: string;
  slug: string;
  profileUrl?: string;
  headshotUrl?: string;
  source: "api" | "dom";
};

async function scrapeComedians(): Promise<JesterComedian[]> {
  const comedians: JesterComedian[] = [];
  const seenSlugs = new Set<string>();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Capture any API responses that might contain comedian data
  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("comedian") ||
      url.includes("comedians") ||
      url.includes("api") ||
      url.includes("firestore") ||
      url.includes("firebase")
    ) {
      try {
        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("json")) {
          const json = await response.json();
          extractFromApiResponse(json, comedians, seenSlugs);
        }
      } catch {
        // Ignore parse errors
      }
    }
  });

  console.log("Loading page...");
  await page.goto(JESTER_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait for content to render
  await page.waitForTimeout(2000);

  // Try to extract from DOM - look for comedian links/cards
  const domComedians = await page.evaluate(() => {
    const results: { name: string; url: string; img?: string }[] = [];
    const links = document.querySelectorAll('a[href*="comedian"], a[href*="comedians"]');
    links.forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const text = (a as HTMLAnchorElement).textContent?.trim();
      if (text && text.length > 1 && text.length < 100 && !href.includes("searchAll")) {
        const img = (a as HTMLAnchorElement).querySelector("img");
        results.push({
          name: text,
          url: href,
          img: img?.src,
        });
      }
    });
    // Also try data attributes or common card structures
    const cards = document.querySelectorAll("[data-comedian], .comedian-card, [class*='comedian']");
    cards.forEach((el) => {
      const link = (el as HTMLElement).querySelector("a") || (el as HTMLAnchorElement).closest?.("a");
      if (link) {
        const href = (link as HTMLAnchorElement).href;
        const text =
          (link as HTMLAnchorElement).textContent?.trim() ||
          (el as HTMLElement).getAttribute("data-name") ||
          "";
        if (text && !results.some((r) => r.url === href)) {
          results.push({
            name: text,
            url: href,
            img: (link as HTMLAnchorElement).querySelector("img")?.src,
          });
        }
      }
    });
    return results;
  });

  for (const c of domComedians) {
    const slug = slugify(c.name);
    if (EXCLUDED_SLUGS.has(slug) || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    comedians.push({
      name: c.name,
      slug,
      profileUrl: c.url,
      headshotUrl: c.img,
      source: "dom",
    });
  }

  // If we found few via DOM, try scrolling to load more (infinite scroll)
  if (comedians.length < 100) {
    console.log("Scrolling to load more comedians...");
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      const more = await page.evaluate(() => {
        const results: { name: string; url: string; img?: string }[] = [];
        document.querySelectorAll('a[href*="comedian"], a[href*="comedians"]').forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const text = (a as HTMLAnchorElement).textContent?.trim();
          if (text && text.length > 1 && text.length < 100 && !href.includes("searchAll")) {
            results.push({
              name: text,
              url: href,
              img: (a as HTMLAnchorElement).querySelector("img")?.src,
            });
          }
        });
        return results;
      });
      let added = 0;
      for (const c of more) {
        const slug = slugify(c.name);
        if (EXCLUDED_SLUGS.has(slug) || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        comedians.push({
          name: c.name,
          slug,
          profileUrl: c.url,
          headshotUrl: c.img,
          source: "dom",
        });
        added++;
      }
      if (added === 0) break;
    }
  }

  await browser.close();
  return comedians;
}

function extractFromApiResponse(
  data: unknown,
  comedians: JesterComedian[],
  seenSlugs: Set<string>
): void {
  if (!data || typeof data !== "object") return;
  const obj = data as Record<string, unknown>;
  const items =
    (obj.comedians as unknown[]) ||
    (obj.data as unknown[]) ||
    (Array.isArray(obj) ? obj : []);

  for (const item of items as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const name =
      (item.name as string) || (item.displayName as string) || (item.title as string) || "";
    if (!name) continue;
    const slug =
      (item.slug as string) || slugify(name);
    if (EXCLUDED_SLUGS.has(slug) || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    comedians.push({
      name,
      slug,
      profileUrl: item.url as string | undefined,
      headshotUrl: (item.headshotUrl as string) || (item.imageUrl as string) || (item.photo as string),
      source: "api",
    });
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Scraping comedians from Jester...");
  const comedians = await scrapeComedians();
  console.log(`Found ${comedians.length} comedians`);

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ comedians, scrapedAt: new Date().toISOString() }, null, 2)
  );
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
