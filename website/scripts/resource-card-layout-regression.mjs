import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const widths = [320, 390, 543, 544, 682, 696, 767, 768, 1024, 1279, 1280, 1366, 1439, 1440, 1919, 1920, 2560];
const browser = await chromium.launch();

try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ colorScheme, reducedMotion: "reduce", deviceScaleFactor: 1.375 });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base);
      await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "html { scrollbar-gutter: stable; }" });
      const homeFrame = await page.locator('[class*="heroFrameInner"]').boundingBox();
      const frameSelectors = [
        '#resources [class*="Grid-module__Grid___"]',
        '[class*="ctaFrameInner"]',
        ...(width >= 768 ? ['nav[aria-label="Primary"]'] : []),
      ];
      for (const selector of frameSelectors) {
        const frame = await page.locator(selector).boundingBox();
        assert.ok(Math.abs(frame.x - homeFrame.x) < 1, `${width}px: ${selector} aligns with the hero`);
        assert.ok(Math.abs(frame.width - homeFrame.width) < 1, `${width}px: ${selector} matches the hero width`);
      }
      const cards = page.locator('#resources [class*="resourceCard"]');
      const columns = await cards.evaluateAll((elements) =>
        new Set(elements.map((element) => Math.round(element.getBoundingClientRect().left))).size,
      );
      assert.equal(columns, width < 768 ? 1 : width < 1280 ? 2 : 3, `${width}px: responsive column count`);
      for (const card of await cards.all()) {
        await card.getByRole("link").focus();
        const result = await card.evaluate((element) => {
          const label = element.querySelector('[class*="Card__actionLabel___"]');
          const action = element.querySelector('[class*="Card__action___"]');
          const labelBounds = label.getBoundingClientRect();
          const actionBounds = action.getBoundingClientRect();
          const circleBounds = action.querySelector('[class*="Card__actionIcon--arrowOnly"]').getBoundingClientRect();
          const cardBounds = element.getBoundingClientRect();
          return {
            text: label.textContent,
            labelHeight: labelBounds.height,
            lineHeight: parseFloat(getComputedStyle(label).lineHeight),
            textWidth: label.scrollWidth,
            availableWidth: label.clientWidth,
            labelLeft: labelBounds.left,
            labelRight: labelBounds.right,
            actionLeft: actionBounds.left,
            actionRight: actionBounds.right,
            circleRight: circleBounds.right,
            endRadius: actionBounds.height / 2,
            cardRight: cardBounds.right,
            fontSize: getComputedStyle(label).fontSize,
          };
        });
        const message = `${colorScheme} ${width}px ${result.text}`;
        assert.ok(result.labelHeight <= result.lineHeight + 1, `${message}: single-line label`);
        assert.ok(result.textWidth <= result.availableWidth + 1, `${message}: no clipping or ellipsis`);
        assert.ok(result.actionRight <= result.cardRight, `${message}: action stays in its card`);
        assert.ok(result.labelRight < result.actionRight, `${message}: label stays within the control`);
        assert.ok(result.labelLeft - result.actionLeft >= result.endRadius, `${message}: text clears the left curve`);
        assert.ok(result.actionRight - result.labelRight >= result.endRadius, `${message}: text clears the right curve`);
        assert.ok(result.actionRight - result.circleRight >= 4 && result.actionRight - result.circleRight <= 6,
          `${message}: chevron circle keeps its original inset at the right edge`);
        assert.equal(result.fontSize, "16px", `${message}: preserve readable button type`);
        await card.getByRole("link").evaluate((element) => element.blur());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.goto(new URL("agents/", base).href);
      await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
      await page.addStyleTag({ content: "html { scrollbar-gutter: stable; }" });
      const catalogFrame = await page.locator('[class*="heroInner"]').boundingBox();
      assert.ok(Math.abs(homeFrame.x - catalogFrame.x) < 1, `${width}px: homepage and catalog share the same inset`);
      assert.ok(Math.abs(homeFrame.width - catalogFrame.width) < 1, `${width}px: homepage and catalog share the same width`);
    }
    await page.close();
  }
  console.log(`PASS ${widths.length * 2} responsive layouts: consistent homepage/catalog frames, correct columns, and single-line CTA labels from 320px to 2560px.`);
} finally {
  await browser.close();
}
