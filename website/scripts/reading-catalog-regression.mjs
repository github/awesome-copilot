import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const browser = await chromium.launch();
const catalogs = ["agents", "instructions", "skills", "plugins", "extensions", "learning-hub"];
const articles = ["/instruction/a11y/", "/learning-hub/github-copilot-app/"];
const hostSelector = '[class*="_scrollHost_"]';
const headerSelector = "[data-reading-header]";
let checks = 0;

async function open(page, route) {
  const response = await page.goto(new URL(route, baseUrl).href, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  assert.equal(response.status(), 200, route);
  await page.waitForFunction(() =>
    [...document.querySelectorAll("astro-island")].every((island) => !island.hasAttribute("ssr")),
  );
  await page.evaluate(() => document.fonts.ready);
}

async function catalog(page, route) {
  await open(page, `/${route}/`);
  const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
  await nav.scrollIntoViewIfNeeded();
  const previous = nav.getByRole("button", { name: "Previous Page", exact: true });
  assert.equal(await previous.getAttribute("aria-disabled"), "true");
  const centers = await nav.locator("[rel]").evaluateAll((controls) => {
    const center = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    return controls.map((control) => {
      const text = control.querySelector('[class*="Pagination__controlText"]');
      const arrow = control.querySelector("svg");
      return {
        control: center(control),
        arrow: center(arrow),
        text: getComputedStyle(text).display === "none" ? null : center(text),
      };
    });
  });
  for (const { control, arrow, text } of centers) {
    assert.ok(Math.abs(control - arrow) <= 1, `${route}: arrow/control centers`);
    if (text !== null) assert.ok(Math.abs(control - text) <= 1, `${route}: label/control centers`);
  }
  const next = nav.getByRole("button", { name: "Next Page", exact: true });
  if (await next.getAttribute("aria-disabled") !== "true") {
    await next.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.id === "catalog");
    assert.equal(await page.locator("#catalog").getAttribute("tabindex"), "-1");
    assert.equal(await nav.locator('[aria-current="page"]').innerText(), "2");
    await previous.click();
    await page.waitForFunction(() => document.activeElement?.id === "catalog");
    assert.equal(await nav.locator('[aria-current="page"]').innerText(), "1");
  }
  console.log(`PASS ${route}: pagination centers and keyboard/focus handoff`);
  checks++;
}

async function article(page, route, desktop) {
  await open(page, route);
  await page.waitForFunction(() => document.querySelector("[data-reading-header]")?.dataset.visible !== undefined);
  assert.equal(await page.locator(hostSelector).locator("h1").count(), 1);
  const strip = page.locator(headerSelector);
  assert.equal(await strip.locator("h1").count(), 0);
  assert.equal(await strip.evaluate((element) => element.inert), true);
  const title = await page.locator(hostSelector).locator("h1").evaluate((heading) => {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((element) => element.remove());
    return copy.textContent.trim();
  });
  assert.equal(await strip.locator("[title]").getAttribute("title"), title);
  const initial = await page.locator(hostSelector).evaluate((host) => ({
    height: host.scrollHeight,
    boundary: host.querySelector("h1").closest("section").getBoundingClientRect().bottom -
      host.getBoundingClientRect().top + host.scrollTop -
      host.querySelector("[data-reading-header]").firstElementChild.offsetHeight,
  }));

  if (desktop) {
    // Cross the observer boundary in both directions. Neither visibility change
    // may change document height or the requested scroll position.
    for (const delta of [-2, 2, -2, 2]) {
      const requested = initial.boundary + delta;
      await page.locator(hostSelector).evaluate((host, top) => { host.scrollTop = top; }, requested);
      await page.waitForFunction(({ expected }) =>
        document.querySelector("[data-reading-header]").dataset.visible === String(expected),
      { expected: delta > 0 });
      const geometry = await page.locator(hostSelector).evaluate((host) => ({
        top: host.scrollTop, height: host.scrollHeight,
      }));
      assert.ok(Math.abs(geometry.top - requested) <= 1, `${route}: no transition scroll jump`);
      assert.equal(geometry.height, initial.height, `${route}: stable flow height`);
    }
    const rect = await strip.locator(":scope > div").boundingBox();
    assert.ok(rect.height <= 64, `${route}: compact title <=64px`);
    assert.ok(rect.y + rect.height <= 144, `${route}: combined chrome <=144px`);
    console.log(`PASS ${route}: strip ${rect.height}px, combined chrome ${rect.y + rect.height}px`);
  } else {
    await page.evaluate(() => window.scrollTo(0, 900));
    assert.equal(await strip.isVisible(), false);
  }

  const toc = page.getByRole("navigation", { name: "In this article", exact: true });
  const hasToc = await toc.count() > 0;
  const targetLink = hasToc ? toc.locator("a").nth(2) : null;
  const target = targetLink
    ? await targetLink.getAttribute("href")
    : `#${await page.locator("article h2[id]").nth(2).getAttribute("id")}`;
  if (targetLink) await targetLink.click();
  else await page.evaluate((hash) => { window.location.hash = hash; }, target);
  const targetTop = await page.locator(target).evaluate((element) => element.getBoundingClientRect().top);
  const chromeBottom = desktop
    ? await strip.locator(":scope > div").evaluate((element) => element.getBoundingClientRect().bottom)
    : 0;
  assert.ok(targetTop >= chromeBottom, `${route}: anchor clears reading chrome`);
  if (targetLink) assert.equal(await targetLink.getAttribute("aria-current"), "true");

  await page.locator(hostSelector).evaluate((host) => {
    if (matchMedia("(min-width: 75rem)").matches) host.scrollTop = host.scrollHeight;
    else window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => document.querySelector('[data-burst="true"]'));
  const reduced = await page.locator('[data-burst="true"]').first().evaluate((rider) => ({
    transition: getComputedStyle(rider).transitionProperty,
    animation: getComputedStyle(rider.querySelector('[class*="_confettiPiece_"]')).animationName,
  }));
  assert.equal(reduced.transition, "none", `${route}: reduced-motion rider`);
  assert.equal(reduced.animation, "none", `${route}: reduced-motion completion`);
  const back = page.getByRole("button", { name: "Back to top" });
  await back.click();
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  const scroll = await page.locator(hostSelector).evaluate((host) => ({ internal: host.scrollTop, window: window.scrollY }));
  assert.equal(desktop ? scroll.internal : scroll.window, 0);
  await page.waitForFunction(() => !document.querySelector('[data-burst="true"]'));
  assert.equal(await strip.isVisible(), false);
  await page.goto("about:blank");
  await open(page, `${route}${target}`);
  await page.waitForFunction(() => {
    const target = document.querySelector(":target");
    const header = document.querySelector("[data-reading-header]");
    if (!target || header?.dataset.visible === undefined) return false;
    const top = target.getBoundingClientRect().top;
    const bottom = header.dataset.visible === "true"
      ? header.firstElementChild.getBoundingClientRect().bottom : 0;
    return top >= bottom && top < window.innerHeight / 2;
  });
  checks++;
}

try {
  for (const colorScheme of ["light", "dark"]) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, colorScheme, reducedMotion: "reduce" });
      for (const route of catalogs) await catalog(page, route);
      for (const route of articles) await article(page, route, viewport.width >= 1200);
      await page.close();
    }
  }
  for (const route of articles) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 500 }, reducedMotion: "reduce" });
    await open(page, route);
    await page.locator(hostSelector).evaluate((host) => { host.scrollTop = 800; });
    await page.waitForFunction(() => document.querySelector("[data-reading-header]")?.dataset.visible === "false");
    assert.equal(await page.locator(headerSelector).isVisible(), false, `${route}: short viewport releases title`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector("[data-reading-header]")?.dataset.visible === "true");
    await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await page.waitForFunction(() => document.querySelector("[data-reading-header]")?.dataset.visible === "false");
    assert.equal(await page.locator(headerSelector).isVisible(), false, `${route}: enlarged text releases title`);
    await page.close();
    checks++;
  }
  for (const route of articles) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
    await open(page, route);
    await page.waitForFunction(() => document.querySelector("[data-reading-header]")?.dataset.visible !== undefined);
    await page.waitForFunction(() => {
      const heading = document.querySelector("h1");
      const typed = heading.querySelector('[aria-hidden="true"]');
      return !typed || typed.textContent === document.querySelector("[data-reading-header] [title]").textContent;
    });
    await page.waitForFunction(() => document.querySelector("h1").closest("section")
      .getAnimations({ subtree: true }).every((animation) => animation.playState === "finished"));
    await page.evaluate(() => {
      window.readingLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.readingLayoutShift += entry.value;
        }
      }).observe({ type: "layout-shift" });
    });
    await page.locator(hostSelector).evaluate((host) => { host.scrollTop = host.scrollHeight; });
    await page.waitForFunction(() => document.querySelector('[data-reading-header] [data-burst="true"]'));
    const motion = await page.locator(headerSelector).evaluate((header) => ({
      animation: getComputedStyle(header.querySelector('[class*="_confettiPiece_"]')).animationName,
      lineTransition: getComputedStyle(header.firstElementChild, "::after").transitionDuration,
      lineWidth: parseFloat(getComputedStyle(header.firstElementChild, "::after").width),
    }));
    assert.notEqual(motion.animation, "none", `${route}: original completion animation retained`);
    assert.notEqual(motion.lineTransition, "0s", `${route}: progress interpolation retained`);
    assert.ok(motion.lineWidth > 0, `${route}: green progress rule visible`);
    await page.getByRole("button", { name: "Back to top" }).click();
    await page.waitForFunction(() => document.querySelector('[class*="_scrollHost_"]').scrollTop === 0);
    const cls = await page.evaluate(() => window.readingLayoutShift);
    assert.ok(cls < 0.01, `${route}: local transition layout-shift budget (not field CWV): ${cls}`);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForFunction(() => window.scrollY > 0);
    assert.equal(await page.locator(headerSelector).isVisible(), false, `${route}: tablet title released`);
    const columns = await page.locator('[class*="_layout_"]').first().evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    assert.equal(columns, 1, `${route}: tablet sidebar moves into document flow`);
    await page.getByRole("button", { name: "Back to top" }).click();
    await page.waitForFunction(() => window.scrollY === 0);
    console.log(`PASS ${route}: normal progress/completion motion, transition CLS=${cls}, tablet document scrolling`);
    await page.close();
    checks++;
  }
  console.log(`Passed ${checks} reading/catalog scenarios (light/dark, desktop/tablet/mobile, motion, short viewport, enlarged text).`);
} finally {
  await browser.close();
}
