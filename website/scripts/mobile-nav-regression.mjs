import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const routes = ["/", "/agents/", "/instruction/dotnet-framework/", "/learning-hub/github-copilot-app/"];
const widths = [320, 390, 696, 768, 1024, 1199];
const browser = await chromium.launch();
const artwork = (markup) => markup
  .replace(/id="(?:skills-icon|learning-hub-icon)-[^"]+"/g, 'id="icon-clip"')
  .replace(/clip-path="url\(#[^)]+\)"/g, 'clip-path="url(#icon-clip)"');
let checks = 0;

async function assertExternalArrows(menu) {
  for (const [name, href] of [["Hooks", "/hooks/"], ["Workflows", "/workflows/"], ["Tools", "/tools/"]]) {
    const link = menu.getByRole("link", { name, exact: true });
    assert.equal(await link.getAttribute("href"), href, "Keep existing external redirects");
    const arrow = link.locator(".octicon-arrow-up-right");
    assert.equal(await arrow.count(), 1, `${name}: external-link arrow`);
    assert.equal(await arrow.getAttribute("aria-hidden"), "true");
    const bounds = await arrow.boundingBox();
    assert.equal(bounds.width, 16);
    assert.equal(bounds.height, 16);
  }
  assert.equal(await menu.locator('[class*="linkContent"] .octicon-arrow-up-right:visible').count(), 3,
    "Internal destinations do not receive external-link arrows");
}

try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ colorScheme, deviceScaleFactor: 1.375 });
    await page.goto(base);
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
    const expectedIcons = await page.locator('#resources [class*="resourceCard"]').evaluateAll((cards) =>
      Object.fromEntries(cards.map((card) => [
        new URL(card.querySelector("a").href).pathname,
        card.querySelector('[class*="resourceIcon"] svg').innerHTML,
      ])),
    );
    for (const route of routes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 568 });
        await page.goto(new URL(route, base).href);
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
        await page.evaluate(() => document.fonts.ready);
        // Reserve a classic scrollbar gutter: 100vw exceeds the header by 15px.
        await page.addStyleTag({ content: "html { scrollbar-gutter: stable; }" });
        const trigger = page.getByLabel("Open Resources menu", { exact: true });
        await trigger.click();
        const menu = page.getByRole("navigation", { name: "Resources", exact: true });
        await assertExternalArrows(menu);
        const iconSizes = await menu.locator('[class*="linkIcon"] svg').evaluateAll((icons) =>
          icons.map((icon) => ({ width: icon.getBoundingClientRect().width, height: icon.getBoundingClientRect().height })),
        );
        assert.ok(iconSizes.length > 0 && iconSizes.every(({ width, height }) => width === 16 && height === 16), "Compact 16px navigation icons");
        assert.equal(await menu.getByRole("link", { name: "Extensions", exact: true }).getAttribute("href"), "/extensions/");
        const bounds = await menu.evaluate((element) => {
          const header = element.closest("header");
          const x = (selector) => element.querySelector(selector).getBoundingClientRect().left;
          return {
            panel: element.getBoundingClientRect().toJSON(),
            header: header.getBoundingClientRect().toJSON(),
            brandX: header.querySelector("a > svg").getBoundingClientRect().left,
            contentX: x('[class*="linkContent"]'),
            searchX: x('[class*="inlineField"]'),
            heartX: x('[class*="heart"]'),
            scrollable: element.scrollHeight > element.clientHeight,
          };
        });
        assert.ok(Math.abs(bounds.panel.left - bounds.header.left) <= 1, `${route} ${width}: left edge`);
        assert.ok(Math.abs(bounds.panel.right - bounds.header.right) <= 1, `${route} ${width}: right edge`);
        assert.ok(Math.abs(bounds.panel.top - bounds.header.bottom) <= 1, "Panel meets header border");
        assert.ok(bounds.panel.bottom <= 569, "Menu fits the available viewport");
        assert.ok(bounds.scrollable, "Short screens scroll the menu instead of clipping actions");
        for (const key of ["contentX", "searchX", "heartX"]) {
          assert.ok(Math.abs(bounds[key] - bounds.brandX) <= 1, `${route} ${width}: ${key} aligns with wordmark`);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const icons = await menu.locator('[class*="mobileLink"]').evaluateAll((links) =>
          Object.fromEntries(links.map((link) => [new URL(link.href).pathname, link.querySelector("svg").innerHTML])),
        );
        for (const [path, expected] of Object.entries(expectedIcons)) {
          assert.equal(artwork(icons[path]), artwork(expected), `${path}: menu and card share artwork`);
        }
        const ids = await page.locator('clipPath[id^="skills-icon-"], clipPath[id^="learning-hub-icon-"]').evaluateAll((clips) =>
          clips.map((clip) => clip.id),
        );
        assert.equal(new Set(ids).size, ids.length, "Repeated icons have independent clipping IDs");
        const contribute = menu.getByRole("link", { name: "Contribute", exact: true });
        assert.equal(await contribute.locator(".octicon-arrow-up-right").count(), 1);
        await contribute.focus();
        const contributeBounds = await contribute.boundingBox();
        assert.ok(contributeBounds.y + contributeBounds.height <= 568,
          `${route} ${width}: last action remains reachable by keyboard: ${JSON.stringify(contributeBounds)}`);
        await page.keyboard.press("Escape");
        assert.equal(await menu.isVisible(), false);
        assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
        checks++;
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base);
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
    const primary = page.getByRole("navigation", { name: "Primary", exact: true });
    await primary.locator("summary:visible").click();
    await assertExternalArrows(primary);
    for (const [path, expected] of Object.entries(expectedIcons)) {
      if (path === "/learning-hub/") {
        assert.equal(await primary.locator(`a[href="${path}"]:visible svg`).count(), 0, "Desktop Learning Hub is text-only");
        continue;
      }
      const icon = primary.locator(`a[href="${path}"]:visible svg`).first();
      assert.equal(artwork(await icon.evaluate((element) => element.innerHTML)), artwork(expected), `${path}: desktop icon parity`);
      const size = await icon.boundingBox();
      assert.equal(size.width, 16);
      assert.equal(size.height, 16);
    }
    await page.close();
  }
  console.log(`PASS ${checks} mobile/tablet scenarios: scrollbar gutters, padding, short screens, keyboard access, and shared icons; desktop icons match too.`);
} finally {
  await browser.close();
}
