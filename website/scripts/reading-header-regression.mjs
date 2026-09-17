import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const routes = [
  "/instruction/dotnet-framework/",
  "/agent/accessibility/",
  "/plugin/accessibility-kanban/",
  "/extension/pr-artifact-explorer/",
  "/skill/acquire-codebase-knowledge/",
  "/learning-hub/github-copilot-app/",
];
const browser = await chromium.launch();
try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ colorScheme, viewport: { width: 1440, height: 900 } });
    for (const route of routes) {
      await page.goto(new URL(route, base).href);
      await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
      await page.evaluate(() => document.fonts.ready);
      const header = page.locator("[data-reading-header]");
      const host = page.locator('[class*="_scrollHost_"]');
      const geometry = await host.evaluate((element) => ({
        height: element.scrollHeight,
        boundary: element.querySelector("h1").closest("section").getBoundingClientRect().bottom -
          element.getBoundingClientRect().top + element.scrollTop -
          element.querySelector("[data-reading-header]").firstElementChild.offsetHeight,
      }));
      assert.equal(await header.evaluate((element) => element.inert), true);
      const samples = [];
      for (const delta of [-4, 1, 8, 30, 65]) {
        const requested = Math.ceil(geometry.boundary + delta);
        await host.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), requested);
        await page.waitForFunction((visible) =>
          document.querySelector("[data-reading-header]").dataset.visible === String(visible), delta > 0);
        await page.waitForTimeout(220);
        const state = await host.evaluate((element) => {
          const strip = element.querySelector("[data-reading-header]");
          const bounds = strip.firstElementChild.getBoundingClientRect();
          return {
            top: element.scrollTop, height: element.scrollHeight,
            headerTop: bounds.top, headerHeight: bounds.height, rootTop: element.getBoundingClientRect().top,
            opacity: getComputedStyle(strip.firstElementChild).opacity,
          };
        });
        assert.equal(state.height, geometry.height, `${route}: no flow-height change`);
        assert.ok(Math.abs(state.top - requested) <= 1, `${route}: no scroll jump`);
        if (delta > 0) {
          assert.equal(state.opacity, "1", `${route}: title visible before expanded hero leaves`);
          assert.equal(state.headerTop, state.rootTop, `${route}: strip stays pinned`);
          assert.ok(state.headerHeight <= 64);
          samples.push(state.headerHeight);
        }
      }
      assert.equal(new Set(samples).size, 1, `${route}: no compact-height bounce`);
      const action = header.locator("[data-reading-action] a, [data-reading-action] button");
      if (!route.startsWith("/learning-hub")) {
        assert.equal(await action.count(), 1, `${route}: primary install action remains available`);
        const actionBox = await action.boundingBox();
        const titleBox = await header.locator("[title]").boundingBox();
        assert.ok(actionBox.x >= titleBox.x + titleBox.width);
        const topActionBox = await page.getByRole("navigation", { name: "Primary", exact: true })
          .getByRole("link", { name: "Contribute", exact: true }).boundingBox();
        assert.ok(Math.abs(actionBox.x + actionBox.width - topActionBox.x - topActionBox.width) <= 1,
          `${route}: compact action shares the top bar's right edge`);
        const original = page.locator("[data-hero-actions] a, [data-hero-actions] button").first();
        assert.equal(await action.getAttribute("href"), await original.getAttribute("href"));
        assert.equal(await page.locator("[data-hero-actions]").evaluate((element) => element.inert), true);
        if (route.startsWith("/skill/")) {
          await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
          const command = (await page.locator("section pre").first().innerText()).trimEnd();
          await action.click();
          await page.waitForFunction(() =>
            document.querySelector("[data-reading-action] button")?.textContent.includes("Copied"),
          );
          assert.equal(await page.evaluate(() => navigator.clipboard.readText()), command);
          assert.equal(await header.evaluate((element) => element.inert), false, "Copy feedback keeps compact action accessible");
        }
        await action.focus();
        await host.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(80);
        assert.equal(await header.getAttribute("data-visible"), "true", "Focused action does not disappear");
        await page.locator("#main-content").focus();
        await page.waitForFunction(() => document.querySelector("[data-reading-header]").dataset.visible === "false");
      }

      const finish = await host.evaluate((element) =>
        element.querySelector("[data-reading-content]").getBoundingClientRect().bottom -
        element.getBoundingClientRect().top + element.scrollTop - element.clientHeight,
      );
      await host.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), Math.max(0, Math.floor(finish) - 3));
      await page.waitForTimeout(50);
      assert.equal(await header.locator('[data-burst="true"]').count(), 0, `${route}: not before article end`);
      await host.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), Math.ceil(finish) + 1);
      await page.waitForFunction(() => document.querySelector('[data-reading-header] [data-burst="true"]'));
      const completion = await host.evaluate((element) => ({
        beforeFooter: element.scrollTop < element.scrollHeight - element.clientHeight,
        animation: getComputedStyle(element.querySelector('[data-reading-header] [class*="_confettiPiece_"]')).animationName,
      }));
      assert.equal(completion.beforeFooter, true, `${route}: celebrate without scrolling to footer`);
      assert.notEqual(completion.animation, "none");
      if (await action.count()) await action.focus();

      for (const width of [1024, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
        await page.waitForFunction(() => document.querySelector("[data-reading-header]").inert);
        assert.equal(await header.locator(":scope > div").isVisible(), false);
        const overflow = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll("body *")].filter((element) =>
            element.getBoundingClientRect().right > innerWidth + 1 &&
            getComputedStyle(element).visibility !== "hidden",
          ).slice(0, 8).map((element) => `${element.tagName}.${element.className}`),
        }));
        assert.ok(overflow.width <= width, `${route}: no mobile overflow at ${width}px: ${JSON.stringify(overflow)}`);
        assert.equal(await page.locator("[data-hero-actions]").evaluateAll((elements) => elements.some((element) => element.inert)), false);
        assert.equal(await header.evaluate((element) => element.contains(document.activeElement)), false);
        if (route.startsWith("/instruction/")) {
          const trigger = page.locator("[data-hero-actions] button[aria-haspopup]");
          await trigger.click();
          await page.getByRole("menuitem", { name: "Install in VS Code Insiders", exact: true }).waitFor();
          await page.keyboard.press("Escape");
          assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Mobile install menu dismisses with Escape");
        }
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      console.log(`PASS ${colorScheme} ${route}: stable handoff, primary action, article-end confetti, tablet/mobile`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
