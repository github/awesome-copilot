import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const browser = await chromium.launch();
const results = [];
const iconArtwork = (markup) => markup
  .replace(/id="(?:skills-icon|learning-hub-icon)-[^"]+"/g, 'id="icon-clip"')
  .replace(/clip-path="url\(#[^)]+\)"/g, 'clip-path="url(#icon-clip)"');

try {
  for (const colorScheme of ["light", "dark"]) {
    for (const width of [1440, 1200, 1024, 390]) {
      const page = await browser.newPage({
        colorScheme,
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      try {
        await page.addInitScript(() => {
          window.__layoutShiftScore = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__layoutShiftScore += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });
        await page.goto(baseUrl);
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
        await page.evaluate(() => document.fonts.ready);
        const hero = page.locator('[class*="heroFrameInner"]');
        const learning = hero.getByRole("link", { name: "Explore Learning Hub" });
        await learning.waitFor();
        assert.equal(await learning.getAttribute("href"), "/learning-hub/");
        const learningIcon = learning.locator('[aria-hidden="true"] svg');
        assert.equal(await learningIcon.count(), 1);
        assert.equal(
          iconArtwork(await learningIcon.evaluate((element) => element.innerHTML)),
          iconArtwork(await page.locator('#resources a[href="/learning-hub/"] [class*="resourceIcon"] svg').evaluate((element) => element.innerHTML)),
          "Primary CTA reuses the Learning Hub artwork",
        );
        assert.ok(await learningIcon.evaluate((element) => {
          const color = getComputedStyle(element).color;
          return [...element.querySelectorAll("path")].every((path) => {
            const style = getComputedStyle(path);
            return (style.fill === "none" || style.fill === color) &&
              (style.stroke === "none" || style.stroke === color);
          });
        }), "CTA icon follows the button's foreground color");
        assert.equal(
          await hero.getByRole("link", { name: "View on GitHub" }).getAttribute("href"),
          "https://github.com/github/awesome-copilot",
        );
        const secondary = hero.getByRole("link", { name: "View on GitHub" });
        for (const state of ["rest", "hover", "focus"]) {
          if (state === "hover") await secondary.hover();
          if (state === "focus") {
            await page.mouse.move(0, 0);
            await secondary.focus();
          }
          const colors = await secondary.evaluate((button, state) => {
            const sample = document.createElement("span");
            sample.style.position = "absolute";
            sample.style.backgroundColor = `var(--brand-button-secondary-bgColor-${state === "focus" ? "rest" : state})`;
            button.append(sample);
            const expected = getComputedStyle(sample).backgroundColor;
            sample.remove();
            return { actual: getComputedStyle(button).backgroundColor, expected };
          }, state);
          assert.equal(colors.actual, colors.expected, `${colorScheme}: secondary CTA uses Primer's ${state} surface`);
        }
        await page.mouse.move(0, 0);
        await secondary.evaluate((button) => button.blur());
        const bounds = await learning.boundingBox();
        assert.ok(bounds && bounds.y + bounds.height <= 900, "Primary CTA fits the viewport");
        assert.equal(await page.locator('[class*="resourceIcon"] svg').count(), 6);
        const extensionCard = page.locator("#resources").getByRole("link", { name: /^Extensions / });
        assert.equal(await extensionCard.getAttribute("href"), "/extensions/");
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          `No horizontal overflow at ${width}px`,
        );
        assert.notEqual(
          await hero.evaluate((element) => getComputedStyle(element).backgroundImage),
          "none",
        );
        const grid = await hero.evaluate((element) => {
          const style = getComputedStyle(element, "::before");
          return {
            image: style.backgroundImage,
            fade: style.maskImage,
            pointerEvents: style.pointerEvents,
          };
        });
        assert.ok(grid.image.includes("linear-gradient") && !grid.image.includes("radial-gradient"));
        assert.ok(grid.fade.includes("radial-gradient"), "Grid fades outward from the lower focal area");
        assert.equal(grid.pointerEvents, "none");
        if (width === 1440) {
          const heroBounds = await hero.boundingBox();
          const capturePixels = async (x, y) => {
            const png = await page.screenshot({
              clip: { x: Math.ceil(heroBounds.x + x), y: Math.ceil(heroBounds.y + y), width: 120, height: 64 },
            });
            return page.evaluate(async (base64) => {
              const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
              const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
              const canvas = new OffscreenCanvas(image.width, image.height);
              const context = canvas.getContext("2d");
              context.drawImage(image, 0, 0);
              return Array.from(context.getImageData(0, 0, image.width, image.height).data);
            }, png.toString("base64"));
          };
          const center = heroBounds.width / 2 - 60;
          const lower = heroBounds.height - 72;
          const sampleRegions = async () => ({
            focal: await capturePixels(center, lower),
            top: await capturePixels(center, 24),
            edge: await capturePixels(16, lower),
          });
          const withGrid = await sampleRegions();
          const hideGrid = await page.addStyleTag({ content: ".heading-grid::before { background-image: none !important; }" });
          const withoutGrid = await sampleRegions();
          await hideGrid.evaluate((element) => element.remove());
          const visiblePixels = withGrid.focal.filter((value, index) =>
            index % 4 !== 3 && Math.abs(value - withoutGrid.focal[index]) >= 12,
          ).length;
          assert.ok(visiblePixels > 200, `${colorScheme}: lower grid must be visible in rendered pixels`);
          const contrast = (region) => withGrid[region].reduce((sum, value, index) =>
            sum + (index % 4 === 3 ? 0 : Math.abs(value - withoutGrid[region][index])), 0,
          );
          assert.ok(contrast("top") < contrast("focal") * 0.1, `${colorScheme}: headline area stays quiet`);
          assert.ok(contrast("edge") < contrast("focal") * 0.5, `${colorScheme}: grid fades at the sides`);
        }
        const bottom = page.locator("#learning-hub");
        assert.equal(await bottom.locator('[class*="CTABanner-container--border-gridlines"]').count(), 0,
          "Use the outer frame without nested banner gridlines");
        const bannerBackgrounds = await bottom.evaluate((element) => ({
          frame: getComputedStyle(element).backgroundColor,
          surface: getComputedStyle(element.querySelector('[class*="CTABanner-container--background"]')).backgroundColor,
        }));
        assert.notEqual(bannerBackgrounds.frame, "rgba(0, 0, 0, 0)", "Background reaches the frame edges");
        assert.equal(bannerBackgrounds.frame, bannerBackgrounds.surface, "No contrasting side strips inside the banner");
        assert.equal(await bottom.getByRole("link", { name: "Watch on YouTube", exact: true }).getAttribute("href"), "https://www.youtube.com/@GitHub/featured");
        assert.equal(await bottom.getByRole("link", { name: "Read the docs", exact: true }).getAttribute("href"), "https://docs.github.com/en/copilot");
        assert.equal(await bottom.getByRole("link").count(), 2, "No repeated Learning Hub CTA or detached video link");
        const nav = page.getByRole("navigation", { name: "Primary", exact: true });
        const navBounds = await nav.boundingBox();
        assert.ok(navBounds && navBounds.height <= 80, "Navigation remains a single compact row");
        const cls = await page.evaluate(() => window.__layoutShiftScore);
        assert.ok(cls < 0.1, `Landing layout shift stays below 0.1, measured ${cls}`);
        if (width < 1200) {
          await page.getByLabel("Open Resources menu", { exact: true }).click();
          const menu = page.getByRole("navigation", { name: "Resources", exact: true });
          await menu.getByRole("link", { name: "Extensions", exact: true }).waitFor();
          assert.equal(await menu.getByRole("link", { name: "Extensions", exact: true }).getAttribute("href"), "/extensions/");
          await page.keyboard.press("Escape");
          assert.equal(await menu.isVisible(), false);
        } else {
          await nav.locator("summary:visible").click();
          assert.equal(await nav.getByRole("link", { name: "Extensions", exact: true }).getAttribute("href"), "/extensions/");
          await page.keyboard.press("Escape");
        }
        const footerLogo = page.locator('footer a[aria-label="GitHub"]');
        assert.equal(await footerLogo.getAttribute("href"), "https://github.com");
        const mark = await footerLogo.evaluate((element) => {
          const style = getComputedStyle(element, "::before");
          return {
            width: style.width, height: style.height, mask: style.maskImage,
            color: style.backgroundColor,
            wordmarkColor: getComputedStyle(element.querySelector("svg")).fill,
          };
        });
        assert.equal(mark.width, "32px");
        assert.equal(mark.height, "32px");
        assert.notEqual(mark.mask, "none");
        assert.equal(mark.color, mark.wordmarkColor, "Footer mark matches the wordmark in both themes");
        const withMark = await footerLogo.screenshot();
        const hideMark = await page.addStyleTag({
          content: 'footer a[aria-label="GitHub"]::before { background-color: transparent !important; }',
        });
        const withoutMark = await footerLogo.screenshot();
        await hideMark.evaluate((element) => element.remove());
        const paintedPixels = await page.evaluate(async ({ before, after }) => {
          const pixels = async (data) => {
            const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
            const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
            const canvas = new OffscreenCanvas(image.width, image.height);
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, 32, image.height).data;
          };
          const a = await pixels(before);
          const b = await pixels(after);
          return a.filter((value, index) => index % 4 !== 3 && Math.abs(value - b[index]) > 16).length;
        }, { before: withMark.toString("base64"), after: withoutMark.toString("base64") });
        assert.ok(paintedPixels > 200, "Footer GitHub mark actually paints beside the wordmark");
        results.push(`${colorScheme} ${width}px: landing, icons, navigation, texture, footer mark`);
      } finally {
        await page.close();
      }
    }
  }

  for (const reducedMotion of ["no-preference", "reduce"]) {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
      try {
        await page.goto(baseUrl);
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
        await page.evaluate(() => document.fonts.ready);
        const cards = page.locator('#resources [class*="resourceCard"]');
        for (const card of await cards.all()) {
          await page.mouse.move(0, 0);
          await card.scrollIntoViewIfNeeded();
          const measure = () => card.evaluate((element) => {
            const action = element.querySelector('[class*="Card__action___"]');
            const label = element.querySelector('[class*="Card__actionLabel___"]');
            const clip = element.querySelector('[class*="Card__actionLabelClip"]');
            const arrow = action.querySelector("svg");
            return {
              action: action.getBoundingClientRect().toJSON(),
              label: label.getBoundingClientRect().toJSON(),
              arrow: arrow.getBoundingClientRect().toJSON(),
              transform: getComputedStyle(clip).transform,
              opacity: Number(getComputedStyle(clip).opacity),
            };
          });
          const initial = await measure();
          assert.equal(initial.opacity, width < 768 ? 1 : 0);
          await card.hover();
          if (width >= 768 && reducedMotion === "no-preference") {
            await page.waitForTimeout(140);
            const expanding = await measure();
            assert.ok(expanding.action.width > initial.action.width, "Border grows before text appears");
            assert.ok(expanding.arrow.x > initial.arrow.x, "Arrow travels from left to right");
            assert.equal(expanding.opacity, 0, "Label waits until the outline has expanded");
          }
          await page.waitForFunction(
            (element) => getComputedStyle(element).opacity === "1",
            await card.locator('[class*="Card__actionLabelClip"]').elementHandle(),
          );
          const expanded = await measure();
          assert.ok(expanded.label.left - expanded.action.left >= 24, "Expanded label clears the rounded end");
          assert.ok(expanded.label.top >= expanded.action.top && expanded.label.bottom <= expanded.action.bottom);
          assert.ok(expanded.arrow.right <= expanded.action.right - 4, "Arrow stays inside the outline");
          assert.equal(expanded.transform, "none", "Label fades in without a sliding transform");
          assert.equal(expanded.opacity, 1);
          await page.mouse.move(0, 0);
          if (width >= 768 && reducedMotion === "no-preference") {
            await page.waitForTimeout(160);
            assert.ok((await measure()).opacity < 0.001, "Label is hidden during outline collapse");
          }
          await page.waitForTimeout(400);
          await card.getByRole("link").focus();
          await page.waitForFunction(
            (element) => getComputedStyle(element).opacity === "1",
            await card.locator('[class*="Card__actionLabelClip"]').elementHandle(),
          );
          const focused = await measure();
          assert.equal(focused.opacity, 1, "Keyboard focus reveals the same label");
          assert.equal(focused.action.width, expanded.action.width);
          await card.getByRole("link").evaluate((element) => element.blur());
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        results.push(`${reducedMotion} ${width}px: staged padded card CTAs, hover and keyboard focus`);
      } finally {
        await page.close();
      }
    }
  }

  const page = await browser.newPage();
  try {
    await page.goto(baseUrl);
    const cardIcons = await page.locator('#resources [class*="resourceIcon"] svg').evaluateAll((icons) =>
      icons.map((icon) => icon.innerHTML),
    );
    const catalogs = ["agents", "instructions", "skills", "plugins", "extensions", "learning-hub"];
    for (const [index, catalog] of catalogs.entries()) {
      await page.goto(`${baseUrl}/${catalog}/`);
      const icon = page.locator('svg[class*="heroIcon"], [class*="heroIcon"] svg');
      assert.equal(iconArtwork(await icon.evaluate((element) => element.innerHTML)), iconArtwork(cardIcons[index]), `${catalog}: reuse the catalog artwork exactly`);
    }
    results.push("All six homepage icons match their catalog artwork");
    for (const prefix of ["", "/ko-kr"]) {
      await page.goto(`${baseUrl}${prefix}/extension/pr-artifact-explorer/`);
      const images = page.locator("main img");
      assert.ok(await images.count() >= 2, "Preview and embedded README image are present");
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll("main img")];
        return images.length >= 2 && images.every((image) => image.complete && image.naturalWidth > 0);
      });
      const sources = await images.evaluateAll((elements) => elements.map((image) => image.src));
      assert.ok(sources.every((src) => !src.includes("/extension/pr-artifact-explorer/assets/")));
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const colorScheme of ["light", "dark"]) {
          await page.emulateMedia({ colorScheme });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(() =>
            [...document.querySelectorAll("main img")].every((image) => image.complete && image.naturalWidth > 0),
          );
          const spacing = await page.locator("img[data-markdown-block-image]").evaluate((image) => {
            const block = image.closest("picture") ?? image;
            const before = block.previousElementSibling.getBoundingClientRect();
            const after = block.nextElementSibling.getBoundingClientRect();
            const bounds = image.getBoundingClientRect();
            const style = getComputedStyle(image);
            return {
              top: bounds.top - before.bottom,
              bottom: after.top - bounds.bottom,
              marginTop: style.marginTop,
              marginBottom: style.marginBottom,
              width: bounds.width,
              available: image.closest("[data-reading-content]").getBoundingClientRect().width,
            };
          });
          assert.equal(spacing.marginTop, "24px");
          assert.equal(spacing.marginBottom, "24px");
          assert.ok(spacing.top >= 24 && spacing.bottom >= 24,
            `${prefix} ${width}px ${colorScheme}: rendered image separates adjacent content: ${JSON.stringify(spacing)}`);
          assert.ok(spacing.width <= spacing.available, "Embedded images stay responsive");
          assert.equal(await page.locator("main img:not([data-markdown-block-image])").count(), 1,
            "The dedicated preview gallery keeps its own layout");
        }
      }
      results.push(`${prefix || "/"}: preview and README images load`);
    }
    await page.goto(baseUrl);
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(
      await page.locator(".heading-grid").evaluate((element) => getComputedStyle(element).backgroundImage),
      "none",
    );
    assert.equal(
      await page.locator(".heading-grid").evaluate((element) => getComputedStyle(element, "::before").backgroundImage),
      "none",
    );
    results.push("Forced colors: heading texture disabled");
  } finally {
    await page.close();
  }
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
