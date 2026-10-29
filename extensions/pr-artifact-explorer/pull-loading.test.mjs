import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-pull-loading-"));
process.env.COPILOT_HOME = sharedHome;

const pullPayload = (title) => ({
  pullRequest: {
    number: 1803,
    title,
    url: "https://github.com/o/r/pull/1803",
    state: "open",
    author: "octo",
    baseRef: "main",
    updatedAt: new Date().toISOString(),
  },
  artifacts: [],
  runs: [],
  artifactCount: 0,
  runCount: 0,
});

test("PR detail loading covers header, summary, badge and table", async (t) => {
  const { loadPlaywright } = await import("./capture.mjs");
  let chromium;
  try {
    chromium = await loadPlaywright();
  } catch (error) {
    return t.skip(error.message.split("\n")[0]);
  }
  let browser;
  for (const options of [{}, { channel: "chrome" }, { channel: "msedge" }]) {
    try {
      browser = await chromium.launch({ headless: true, ...options });
      break;
    } catch {
      // try the next channel
    }
  }
  if (!browser) return t.skip("Chromium is not available");

  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `pull-loading-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await browser.close();
    await stopInstance(instanceId);
    await rm(sharedHome, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  let mode = "ok";
  let title = "First title";
  let release;
  let gate = Promise.resolve();
  await page.route("**/api/pulls/1803?*", async (route) => {
    await gate;
    if (mode === "fail") {
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upstream exploded" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pullPayload(title)),
    });
  });
  const closeGate = () => {
    gate = new Promise((resolve) => {
      release = resolve;
    });
  };
  const snapshot = () =>
    page.evaluate(() => ({
      busy: document.querySelector("#view")?.getAttribute("aria-busy") ?? null,
      skeletons: [...document.querySelectorAll("[data-skeleton]")].map((el) => el.dataset.skeleton),
      title: document.querySelector("h1.page-title")?.textContent ?? null,
      badge: document.querySelector(".pr-summary .state-badge")?.textContent?.trim() ?? null,
      table: Boolean(document.querySelector("#view .artifact-list-box:not([data-skeleton])")),
      flashError: document.querySelector("#view .flash-error")?.textContent ?? null,
    }));

  const base = server.url ?? `${server.origin}/`;
  await page.goto(`${base}#/pull/o%2Fr/1803`);
  await page.waitForSelector("h1.page-title");
  let s = await snapshot();
  assert.match(s.title, /First title/);
  assert.equal(s.busy, null);

  // Forced refresh: nothing from the old header is shown while loading.
  closeGate();
  title = "Second title";
  await page.click("[data-refresh-view]");
  await page.waitForSelector("[data-pull-loading]");
  s = await snapshot();
  assert.deepEqual(new Set(s.skeletons), new Set(["title", "action", "badge", "summary", "table"]));
  assert.equal(s.busy, "true");
  assert.equal(s.title, null, "no stale heading while loading");
  assert.equal(s.badge, null, "no stale badge while loading");
  assert.equal(s.table, false);
  release();
  await page.waitForFunction(() => document.querySelector("h1.page-title")?.textContent.includes("Second title"));
  s = await snapshot();
  assert.equal(s.skeletons.length, 0);
  assert.equal(s.busy, null);
  assert.equal(s.badge, "Open");
  assert.equal(s.table, true);

  // Failure: explicit error with Retry, no stuck skeleton.
  closeGate();
  mode = "fail";
  await page.click("[data-refresh-view]");
  await page.waitForSelector("[data-pull-loading]");
  release();
  await page.waitForSelector("#view .flash-error");
  s = await snapshot();
  assert.equal(s.skeletons.length, 0);
  assert.equal(s.busy, null);
  assert.match(s.flashError, /Upstream exploded|Unable/);
  mode = "ok";
  title = "Recovered title";
  await page.click("#view [data-refresh-view]");
  await page.waitForFunction(() => document.querySelector("h1.page-title")?.textContent.includes("Recovered title"));

  // A late response must not overwrite a different route.
  closeGate();
  title = "Late title";
  await page.click("[data-refresh-view]");
  await page.waitForSelector("[data-pull-loading]");
  await page.evaluate(() => {
    location.hash = "#/docs";
  });
  await page.waitForFunction(() => !document.querySelector("[data-pull-loading]"));
  release();
  await page.waitForTimeout(300);
  s = await snapshot();
  assert.equal(s.title?.includes("Late title") ?? false, false);
  assert.equal(s.skeletons.length, 0);
  assert.equal(s.busy, null);
  assert.deepEqual(errors, []);
});
