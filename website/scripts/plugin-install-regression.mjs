import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:4321";
const details = [
  ["/plugin/ai-ready/", "ai-ready"],
  ["/plugin/agent-council/", "agent-council"],
  ["/extension/daily-focus-board/", "ember"],
  ["/extension/azure-cost-health-check/", "azure-cost-health-check"],
  ["/extension/coffilot/", null],
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const route of ["/plugins/", "/extensions/"]) {
    const response = await page.goto(new URL(route, base).href);
    assert.equal(response.status(), 200, route);
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
    const links = page.locator('#catalog a[href^="vscode://chat-plugin/install"]');
    assert.ok(await links.count() > 0, `${route}: visible VS Code actions`);
    for (const link of await links.all()) {
      const url = new URL(await link.getAttribute("href"));
      assert.equal(url.searchParams.get("source"), "github/awesome-copilot");
      assert.ok(url.searchParams.get("plugin"));
      assert.match(await link.getAttribute("aria-label"), /^Install in VS Code: .+$/);
      assert.equal(await link.evaluate((element) => element.parentElement.closest("a, button")), null,
        "install action is not nested inside the card link");
    }
    console.log(`PASS ${route}: catalog install links`);
  }
  for (const [route, plugin] of details) {
    const response = await page.goto(new URL(route, base).href);
    assert.equal(response.status(), 200, route);
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
    const link = page.locator("[data-hero-actions]").getByRole("link", { name: "Install in VS Code", exact: true });
    assert.equal(await link.count(), plugin ? 1 : 0, route);
    if (plugin) {
      assert.equal(await link.getAttribute("href"),
        `vscode://chat-plugin/install?source=github%2Fawesome-copilot&plugin=${plugin}`, route);
    }
    console.log(`PASS ${route}: owning-plugin install eligibility`);
  }
} finally {
  await browser.close();
}
