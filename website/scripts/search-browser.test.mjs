// After the production website build:
// node --test website/scripts/search-browser.test.mjs
// SEARCH_DIST can point at an isolated production build.
// SEARCH_BASE_URL can exercise a running dev client against that production index.
// Set only SEARCH_BASE_URL to test an existing server without starting another.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = process.env.SEARCH_DIST || fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml" };
let server;
let browser;
let base;
let productionBase;
const iconArtwork = (markup) => markup
  .replace(/id="(?:skills-icon|learning-hub-icon)-[^"]+"/g, 'id="icon-clip"')
  .replace(/clip-path="url\(#[^)]+\)"/g, 'clip-path="url(#icon-clip)"');

before(async () => {
  if (process.env.SEARCH_BASE_URL && !process.env.SEARCH_DIST) {
    base = process.env.SEARCH_BASE_URL;
    browser = await chromium.launch({ headless: true });
    return;
  }
  await stat(resolve(root, "pagefind", "pagefind.js"));
  server = createServer(async (request, response) => {
    try {
      let path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
      if (path !== resolve(root) && !path.startsWith(`${resolve(root)}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
      response.end(await readFile(path));
    } catch (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  productionBase = `http://127.0.0.1:${server.address().port}`;
  base = process.env.SEARCH_BASE_URL || productionBase;
  browser = await chromium.launch({ headless: true });
});

async function connectProductionIndex(page) {
  if (!process.env.SEARCH_BASE_URL || !productionBase) return;
  await page.route("**/pagefind/**", async (route) => {
    const response = await route.fetch({
      url: `${productionBase}${new URL(route.request().url()).pathname}`,
    });
    await route.fulfill({ response });
  });
}

async function assertGroupIcon(result, expectedArtwork) {
  await result.waitFor();
  assert.equal(await result.locator("svg").count(), 0, "No repeated icon on individual results");
  assert.equal(await result.locator('[class*="resultContext"]').count(), 0, "No repeated type label");
  const group = result.locator("..");
  const icon = group.locator(':scope > p [aria-hidden="true"] svg');
  await icon.waitFor();
  assert.equal(await icon.count(), 1);
  assert.equal(iconArtwork(await icon.evaluate((element) => element.innerHTML)), iconArtwork(expectedArtwork));
  const size = await icon.boundingBox();
  assert.equal(size.width, 16);
  assert.equal(size.height, 16);
  const title = await result.locator('[class*="resultText"]').boundingBox();
  assert.ok(Math.abs(title.x - size.x - 24) <= 1, "Result titles align with the group heading text");
  assert.ok(title.y > size.y, "Category icon belongs above the results");
}

after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function searchData(page, term) {
  return page.evaluate(async (term) => {
    const pagefind = await import("/pagefind/pagefind.js");
    const response = await pagefind.search(term);
    return Promise.all(response.results.map(async (hit) => {
      const data = await hit.data();
      return { id: hit.id, url: data.url, meta: data.meta };
    }));
  }, term);
}

test("production Pagefind has one canvas and one plugin identity, not fallback/custom copies", async () => {
  const page = await browser.newPage();
  try {
    await connectProductionIndex(page);
    await page.goto(base);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('astro-island[client="load"]')]
        .every((island) => !island.hasAttribute("ssr")),
    );
    const hits = await searchData(page, "Artifact Explorer");
    for (const type of ["extension", "plugin"]) {
      const matches = hits.filter((hit) => hit.url === `/${type}/pr-artifact-explorer/`);
      assert.equal(matches.length, 1, JSON.stringify(hits));
      assert.equal(matches[0].meta.locale, "en");
      assert.equal(matches[0].meta.canonical, matches[0].url);
      assert.ok(matches[0].meta.description);
    }
    assert.ok(hits.every((hit) => !/^\/(ko-kr|es-es|ja-jp|pt-br|zh-cn)\//.test(hit.url)));
    assert.equal(new Set(hits.map((hit) => hit.meta.canonical)).size, hits.length);
    console.log(`Artifact Explorer: ${hits.length} distinct English destinations; one canvas and one plugin.`);
  } finally {
    await page.close();
  }
});

test("the real Spanish workshop remains searchable with its language context", async () => {
  const page = await browser.newPage();
  try {
    await connectProductionIndex(page);
    await page.goto(`${base}/es-es/learning-hub/copilot-workshops/app/`);
    assert.equal(await page.locator("html").getAttribute("lang"), "es-es");
    const hits = await searchData(page, "Copilot");
    assert.ok(hits.some((hit) => hit.url === "/es-es/learning-hub/copilot-workshops/app/"));
    assert.ok(hits.every((hit) => hit.meta.locale === "es-es"));
    console.log(`Spanish Copilot search: ${hits.length} translated destinations preserved.`);
  } finally {
    await page.close();
  }
});

for (const withIndex of [true, false]) {
  for (const width of [1440, 390]) {
    for (const [route, language, query] of [
      ["/es-es/learning-hub/copilot-workshops/app/", "es-es", "Copilot"],
      ["/ko-kr/extension/pr-artifact-explorer/", "en", "Artifact Explorer"],
    ]) {
      test(`content-language search: ${language}, ${width}px, Pagefind ${withIndex}`, async () => {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        try {
          if (withIndex) await connectProductionIndex(page);
          else await page.route("**/pagefind/**", (route) => route.abort());
          await page.goto(`${base}${route}`);
          await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
          assert.equal(await page.locator("html").getAttribute("lang"), language);
          const trigger = page.locator('button[aria-label="Search"]:visible');
          if (await trigger.count()) await trigger.click();
          else await page.getByLabel("Open Resources menu", { exact: true }).click();
          const input = page.locator('input[role="combobox"]:visible').first();
          await input.fill(query);
          const results = page.getByRole("listbox", { name: "Search results" });
          if (language === "es-es" && !withIndex) {
            await results.getByRole("status").filter({ hasText: "No results" }).waitFor();
            assert.equal(await results.getByRole("option").count(), 0);
          } else {
            await results.getByRole("option").first().waitFor();
            const hrefs = await results.getByRole("option").evaluateAll((links) =>
              links.map((link) => link.getAttribute("href")),
            );
            assert.equal(new Set(hrefs).size, hrefs.length);
            if (language === "es-es") {
              assert.ok(hrefs.every((href) => href.startsWith("/es-es/")), JSON.stringify(hrefs));
            } else {
              assert.ok(hrefs.includes("/extension/pr-artifact-explorer/"));
              assert.ok(hrefs.every((href) => !/^\/[a-z]{2}-[a-z]{2}\//i.test(href)), JSON.stringify(hrefs));
            }
          }
        } finally {
          await page.close();
        }
      });
    }
  }
}

for (const width of [1440, 390]) {
  test(`asynchronous result reordering clears keyboard selection at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    try {
      await page.route("**/pagefind/pagefind.js", route => route.fulfill({
        contentType: "text/javascript",
        body: `
          export async function search() {
            await new Promise(resolve => { window.releaseSearchResults = resolve; });
            return { results: [{ data: async () => ({
              url: "/learning-hub/async-result/",
              meta: { resourceTitle: "Artifact Explorer article", locale: "en" }
            }) }] };
          }
        `,
      }));
      await page.goto(base);
      await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
      if (width > 1200) await page.getByRole("button", { name: "Search", exact: true }).click();
      else await page.getByLabel("Open Resources menu", { exact: true }).click();
      const input = page.locator('input[role="combobox"]:visible').first();
      await input.fill("Artifact Explorer");
      const results = page.getByRole("listbox", { name: "Search results" });
      await results.getByRole("option").first().waitFor();
      await page.waitForFunction(() => typeof window.releaseSearchResults === "function");
      await input.press("Home");
      const selectedId = await input.getAttribute("aria-activedescendant");
      const selectedHref = await page.locator(`[id="${selectedId}"]`).getAttribute("href");
      await page.evaluate(() => window.releaseSearchResults());
      await results.locator('a[href="/learning-hub/async-result/"]').waitFor();
      assert.notEqual(await page.locator(`[id="${selectedId}"]`).getAttribute("href"), selectedHref,
        "Delayed article inserts ahead of the previously selected static result");
      assert.equal(await input.getAttribute("aria-activedescendant"), null,
        "Reordered results must not silently select a different destination");
      assert.equal(await results.locator('[aria-selected="true"]').count(), 0);
      assert.equal(await input.evaluate(element => document.activeElement === element), true);
      const url = page.url();
      await input.press("Enter");
      assert.equal(page.url(), url, "Enter without a fresh selection must not navigate");
      await input.press("Home");
      await input.press("Enter");
      await page.waitForURL("**/learning-hub/async-result/");
    } finally {
      await page.close();
    }
  });
}

for (const colorScheme of ["light", "dark"]) {
  for (const viewport of [
    { width: 1440, height: 900 }, { width: 1280, height: 600 },
    { width: 768, height: 1024 }, { width: 390, height: 844 },
  ]) {
    test(`typed keyboard search: ${colorScheme}, ${viewport.width}x${viewport.height}`, async () => {
      const context = await browser.newContext({ colorScheme, viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      try {
        await connectProductionIndex(page);
        await page.goto(base);
        await page.waitForFunction(() =>
          [...document.querySelectorAll('astro-island[client="load"]')]
            .every((island) => !island.hasAttribute("ssr")),
        );
        await page.evaluate(() => new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ));
        const expectedIcons = await page.locator('#resources [class*="resourceCard"]').evaluateAll((cards) =>
          Object.fromEntries(cards.map((card) => [
            new URL(card.querySelector("a").href).pathname,
            card.querySelector('[class*="resourceIcon"] svg').innerHTML,
          ])),
        );
        const trigger = page.locator('button[aria-label="Search"]:visible');
        const desktop = await trigger.count() > 0;
        if (desktop) {
          await trigger.click();
        } else {
          await page.getByLabel("Open Resources menu").click();
        }
        const input = page.locator('input[role="combobox"]:visible').first();
        await input.waitFor();
        if (desktop) {
          await input.press("Escape");
          await page.locator('button[aria-label="Search"]:focus').waitFor();
          await page.keyboard.press("Control+k");
          await input.waitFor();
        }
        const results = page.getByRole("listbox", { name: "Search results" });
        for (const [query, href, catalog] of [
          [".NET Self Learning Architect", "/agent/dotnet-self-learning-architect/", "/agents/"],
          [".NET Framework Upgrade Specialist", "/instruction/dotnet-upgrade/", "/instructions/"],
          ["Acquire Codebase Knowledge", "/skill/acquire-codebase-knowledge/", "/skills/"],
          ["Working with Canvas Extensions", "/learning-hub/working-with-canvas-extensions/", "/learning-hub/"],
        ]) {
          await input.fill(query);
          await assertGroupIcon(results.locator(`a[href="${href}"]`), expectedIcons[catalog]);
          const clipIds = await page.locator('clipPath[id^="skills-icon-"], clipPath[id^="learning-hub-icon-"]').evaluateAll((clips) =>
            clips.map((clip) => clip.id),
          );
          assert.equal(new Set(clipIds).size, clipIds.length, "Search artwork keeps independent clipping IDs");
        }
        await input.fill("Artifact Explorer");
        await results.locator('a[href="/extension/pr-artifact-explorer/"]').waitFor();
        await results.locator('a[href="/plugin/pr-artifact-explorer/"]').waitFor();
        const options = results.getByRole("option");
        const hrefs = await options.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
        assert.equal(new Set(hrefs).size, hrefs.length);
        assert.ok(hrefs.length <= 8);
        const canvas = results.locator('a[href="/extension/pr-artifact-explorer/"]');
        assert.match(await canvas.innerText(), /^Artifact Explorer\n.+/);
        for (const type of ["extension", "plugin"]) {
          await assertGroupIcon(results.locator(`a[href="/${type}/pr-artifact-explorer/"]`), expectedIcons[`/${type}s/`]);
        }
        assert.equal(await results.getByRole("group", { name: "Plugins", exact: true }).count(), 1);
        assert.equal(await results.getByRole("group", { name: "Extensions", exact: true }).count(), 1);
        const sections = await results.evaluate((listbox) =>
          [...listbox.querySelectorAll('[role="group"]')].map((group) => {
            const style = getComputedStyle(group);
            const heading = group.querySelector("p");
            const headingStyle = getComputedStyle(heading);
            return {
              dividerWidth: parseFloat(style.borderBlockStartWidth),
              dividerStyle: style.borderBlockStartStyle,
              weight: Number(headingStyle.fontWeight),
              semibold: Number(headingStyle.getPropertyValue("--brand-text-weight-semibold")),
              normal: Number(headingStyle.getPropertyValue("--brand-text-weight-normal")),
            };
          }),
        );
        assert.ok(sections.every((section) => section.weight === section.semibold && section.weight > section.normal),
          "Group headings use Primer's stronger semantic weight");
        assert.equal(sections[0].dividerWidth, 0, "No stray divider above the first group");
        assert.ok(sections.slice(1).every((section) => section.dividerWidth > 0 && section.dividerStyle === "solid"),
          "Solid dividers separate result groups");
        await canvas.hover();
        const highlight = await canvas.evaluate((row) => {
          const listbox = row.closest('[role="listbox"]');
          const box = listbox.getBoundingClientRect();
          const bounds = row.getBoundingClientRect();
          return {
            left: bounds.left, width: bounds.width,
            expectedLeft: box.left + listbox.clientLeft,
            expectedWidth: listbox.clientWidth,
            background: getComputedStyle(row).backgroundColor,
          };
        });
        assert.ok(Math.abs(highlight.left - highlight.expectedLeft) <= 1, "Hover starts at the panel's inner edge");
        assert.ok(Math.abs(highlight.width - highlight.expectedWidth) <= 1, "Hover spans the full panel width");
        assert.notEqual(highlight.background, "rgba(0, 0, 0, 0)", "Full-row hover is visibly filled");
        await page.mouse.move(0, 0);
        const bounds = await canvas.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
        await input.press("ArrowDown");
        const activeId = await input.getAttribute("aria-activedescendant");
        assert.equal(await page.locator(`[id="${activeId}"]`).getAttribute("aria-selected"), "true");
        assert.equal(await page.locator(`[id="${activeId}"]`).evaluate((row) => getComputedStyle(row).backgroundColor),
          highlight.background, "Keyboard selection uses the same full-row highlight");
        await input.fill("copilot");
        await results.getByRole("option").first().waitFor();
        for (const key of ["End", "Home", ...Array(8).fill("ArrowDown"), "ArrowUp"]) {
          await input.press(key);
          const selectedId = await input.getAttribute("aria-activedescendant");
          const visible = await page.locator(`[id="${selectedId}"]`).evaluate((row) => {
            const bounds = row.getBoundingClientRect();
            let top = 0;
            let bottom = innerHeight;
            for (let parent = row.parentElement; parent; parent = parent.parentElement) {
              if (!["auto", "scroll", "hidden"].includes(getComputedStyle(parent).overflowY)) continue;
              const clip = parent.getBoundingClientRect();
              top = Math.max(top, clip.top + parent.clientTop);
              bottom = Math.min(bottom, clip.top + parent.clientTop + parent.clientHeight);
            }
            return bounds.top >= top - 1 && bounds.bottom <= bottom + 1;
          });
          assert.ok(visible, `${key}: selected result stays within the visible scroll panel`);
          assert.equal(await input.evaluate((element) => element === document.activeElement), true,
            "Keyboard navigation retains combobox focus");
        }
        await input.press("End");
        await input.press("Home");
        const firstId = await input.getAttribute("aria-activedescendant");
        const expected = await page.locator(`[id="${firstId}"]`).getAttribute("href");
        await input.press("Enter");
        await page.waitForURL(`${base}${expected}`);
      } finally {
        await context.close();
      }
    });
  }
}
