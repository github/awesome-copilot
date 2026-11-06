import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const website = fileURLToPath(new URL("..", import.meta.url));
const data = JSON.parse(await fs.readFile(path.join(website, "public", "data", "extensions.json"), "utf8"));
const overrides = JSON.parse(await fs.readFile(path.join(website, "..", "extensions", "external.json"), "utf8"))
  .filter(item => item.pluginName);
assert.ok(overrides.length, "At least one registered external canvas gallery must be exercised");
const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const output = process.env.SCREENSHOT_DIR;
if (output) await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  ...(process.platform === "win32" && !process.env.CHROME_BIN ? { channel: "msedge" } : {}),
  timeout: 30_000,
});
const failures = [];
let currentPage;

try {
  for (const colorScheme of ["dark", "light"]) {
    const context = await browser.newContext({ colorScheme, reducedMotion: "reduce" });
    await context.addInitScript({ path: require.resolve("axe-core/axe.min.js") });
    const page = await context.newPage();
    currentPage = page;
    page.setDefaultTimeout(15_000);
    page.on("pageerror", error => failures.push(error.message));
    for (const override of overrides) {
      const item = data.items.find(entry => entry.pluginName === override.pluginName);
      assert.ok(item?.external && item.readme, "The gallery owner must retain its external README");
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(new URL(`/extension/${item.id}/`, base).href, {
          waitUntil: "domcontentloaded", timeout: 30_000,
        });
        assert.equal(response.status(), 200);
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
        await page.getByRole("heading", { name: item.name, level: 1, exact: true }).waitFor();
        const preview = page.locator("#preview");
        const images = preview.locator("img");
        assert.equal(await images.count(), override.screenshots.gallery.length);
        for (const image of await images.all()) await image.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll("#preview img")]
          .every(image => image.complete && image.naturalWidth === 1280 && image.naturalHeight === 720));
        assert.ok(await preview.locator("figcaption").count() > 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
          `${item.id}: ${colorScheme} ${width}px must fit without horizontal document overflow`);
        const icon = page.locator('img[aria-hidden="true"][width="32"][height="32"]');
        assert.equal(await icon.count(), 1);
        const iconBox = await icon.boundingBox();
        assert.ok(iconBox.width <= 32.5 && iconBox.height <= 32.5);
        const install = page.locator("[data-hero-actions]").getByRole("link", { name: "Open in Copilot app", exact: true });
        assert.equal(await install.getAttribute("href"),
          `ghapp://plugins/install?source=${encodeURIComponent(`${item.pluginName}@awesome-copilot`)}`);
        const violations = await page.evaluate(async () => (await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })).violations.filter(item => ["critical", "serious"].includes(item.impact))
          .map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
        assert.deepEqual(violations, [], `${item.id}: blocking accessibility findings`);
        if (output) {
          await page.getByRole("heading", { name: item.name, level: 1, exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `${item.id}-${colorScheme}-${width}.png`), fullPage: true });
        }
        console.log(`PASS ${item.id}: ${colorScheme} ${width}px, ${await images.count()} real screenshots, install link, icon size, layout, and accessibility`);
      }
    }
    await context.close();
  }
  assert.deepEqual(failures, [], "External extension pages must hydrate without renderer errors");
} catch (error) {
  if (output && currentPage && !currentPage.isClosed()) {
    try {
      await currentPage.screenshot({ path: path.join(output, "external-extension-first-failure.png"), fullPage: true });
    } catch (captureError) {
      console.error("Could not capture browser failure evidence:", captureError.message);
    }
  }
  throw error;
} finally {
  await browser.close();
}
