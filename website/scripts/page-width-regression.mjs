import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const routes = [
  "", "agents/", "instructions/", "skills/", "plugins/", "extensions/",
  "learning-hub/", "contributors/", "agent/accessibility/",
  "instruction/dotnet-upgrade/", "skill/acquire-codebase-knowledge/",
  "plugin/accessibility-kanban/", "extension/pr-artifact-explorer/",
  "learning-hub/github-copilot-app/", "learning-hub/cookbook/",
];
const widths = [390, 1024, 1440, 1600, 1919, 1920, 2560];
const frameSelector = [
  '[class*="heroFrameInner"]', '[class*="heroInner"]', '[class*="bodyInner"]',
  '[class*="sectionInner"]', '[class*="_catalog_"]', '[class*="catalogHeader"]',
  '[class*="recommendedInner"]', '[class*="ctaFrameInner"]',
  '#resources [class*="Grid-module__Grid___"]',
  '[class*="_wideFrame_"]',
].join(", ");
// Catalogs beside their filter rail. 6 per page never splits, so these also run
// at 50 per page, where the wide grid below the filters is a frame too.
const splitRoutes = new Set([
  "agents/", "instructions/", "skills/", "plugins/", "extensions/", "learning-hub/",
]);
const browser = await chromium.launch();

async function checkFrames(page, colorScheme, width, route) {
  const frames = await page.locator(frameSelector).evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return { name: element.className, x: box.x, right: box.right, width: box.width };
    }),
  );
  assert.ok(frames.length > 0, `${route}: content frames found`);
  const header = await page.getByRole("navigation", { name: "Primary", exact: true }).boundingBox();
  const expected = Math.min(1280, header.width);
  for (const frame of frames) {
    const label = `${colorScheme} ${width}px ${route || "homepage"} ${frame.name}`;
    assert.ok(frame.width <= 1281, `${label}: maximum width is 1280px, got ${frame.width}`);
    assert.ok(frame.x >= -1 && frame.right <= width + 1, `${label}: within viewport`);
    if (width >= 768) {
      assert.ok(Math.abs(frame.width - expected) <= 1, `${label}: matches header width ${expected}`);
      assert.ok(Math.abs(frame.x - header.x) <= 1, `${label}: aligns with header`);
    }
  }
  if (width >= 1600) {
    assert.ok(Math.abs(header.width - 1280) <= 1, `${route}: desktop frame fills the 1280px cap`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
    `${route}: no horizontal overflow`);
}

try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ colorScheme, reducedMotion: "reduce" });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        const response = await page.goto(new URL(route, base).href);
        assert.equal(response.status(), 200, route);
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
        await page.addStyleTag({ content: "html { scrollbar-gutter: stable; }" });
        await checkFrames(page, colorScheme, width, route);
        // The rail stacks above the cards below 1012px, so nothing splits there.
        if (width >= 1024 && splitRoutes.has(route)) {
          const trigger = page.locator('summary[aria-label^="Resource page size"]');
          await trigger.click();
          await page.locator("details", { has: trigger })
            .getByRole("menuitemradio", { name: "50", exact: true }).click();
          await page.locator('[class*="_wideFrame_"]').waitFor();
          await checkFrames(page, colorScheme, width, `${route} at 50 per page`);
        }
      }
      console.log(`PASS ${colorScheme} ${width}px: ${routes.length} page layouts share the 1280px cap`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
