import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CaptureError, ControlledBrowser, captureScreenshot, loadPlaywright, resolveViewport } from "./capture.mjs";

test("viewport presets and validation", () => {
  assert.deepEqual(resolveViewport({ preset: "mobile" }).width, 390);
  assert.equal(resolveViewport({ preset: "tablet" }).height, 1024);
  assert.equal(resolveViewport({ preset: "desktop", orientation: "portrait" }).width, 900);
  assert.equal(resolveViewport({ preset: "custom", width: 500, height: 600 }).width, 500);
  assert.throws(() => resolveViewport({ preset: "watch" }), CaptureError);
  assert.throws(() => resolveViewport({ width: 10, height: 600 }), /between 200/);
});

test("non-http URLs are refused before any browser starts", async () => {
  await assert.rejects(captureScreenshot({ url: "file:///c:/x" }), { code: "invalid_url" });
  await assert.rejects(captureScreenshot({ url: "nope" }), { code: "invalid_url" });
});

test("URLs with embedded credentials are refused before any browser starts", async () => {
  const urls = ["http://user:pass@127.0.0.1:9/", "https://user@example.com/", "http://:secret@localhost/"];
  for (const url of urls) {
    await assert.rejects(captureScreenshot({ url }), { code: "invalid_url" });
    const browser = new ControlledBrowser();
    await assert.rejects(browser.navigate(url), { code: "invalid_url" });
    await browser.close();
  }
});

test("legacy Playwright path variable is rejected explicitly", async () => {
  const saved = process.env.PR_ARTIFACT_EXPLORER_PLAYWRIGHT;
  process.env.PR_ARTIFACT_EXPLORER_PLAYWRIGHT = join(tmpdir(), "no-such-playwright-dir");
  try {
    await assert.rejects(loadPlaywright(), (error) => {
      assert.equal(error.code, "playwright_config_unsupported");
      assert.match(error.message, /no longer supported/);
      assert.match(error.message, /npx playwright-core install chromium/);
      return true;
    });
  } finally {
    if (saved === undefined) delete process.env.PR_ARTIFACT_EXPLORER_PLAYWRIGHT;
    else process.env.PR_ARTIFACT_EXPLORER_PLAYWRIGHT = saved;
  }
});
test("real Chromium emulates the preset and saves a PNG", async (t) => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(`<meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0"><div style="height:1800px" id=t></div><script>document.getElementById('t').textContent=innerWidth+'x'+innerHeight</script></body>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const dir = await mkdtemp(join(tmpdir(), "pae-shot-"));
  t.after(async () => {
    server.close();
    await rm(dir, { recursive: true, force: true });
  });
  let shot;
  try {
    shot = await captureScreenshot({ url, preset: "mobile", outputDir: dir });
  } catch (error) {
    if (error.code === "playwright_missing" || error.code === "chromium_missing") {
      t.skip(error.message.split("\n")[0]);
      return;
    }
    throw error;
  }
  assert.equal(shot.source, "fresh-render");
  assert.equal(shot.page.innerWidth, 390);
  assert.equal(shot.page.innerHeight, 844);
  assert.equal(shot.page.devicePixelRatio, 3);
  const bytes = await readFile(shot.path);
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  assert.ok(existsSync(shot.path));
  const full = await captureScreenshot({ url, preset: "desktop", fullPage: true, outputDir: dir });
  assert.ok(full.bytes > 0 && full.fullPage);
  const fullPng = await readFile(full.path);
  assert.ok(fullPng.readUInt32BE(20) >= 1800, "full page height should cover the 1800px page");
});

test("controlled browser keeps real history, current state and viewport/zoom separation", async (t) => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html");
    res.setHeader("x-frame-options", "DENY");
    res.end(`<meta name=viewport content="width=device-width,initial-scale=1"><title>${req.url}</title><body><div id=t></div><script>document.getElementById('t').textContent=innerWidth+'x'+innerHeight;window.draft=window.draft||'';</script></body>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const dir = await mkdtemp(join(tmpdir(), "pae-ctl-"));
  const browser = new ControlledBrowser();
  t.after(async () => {
    await browser.close();
    server.close();
    await rm(dir, { recursive: true, force: true });
  });
  await assert.rejects(browser.history("back"), { code: "not_started" });
  await assert.rejects(browser.navigate("file:///x"), { code: "invalid_url" });
  let state;
  try {
    state = await browser.navigate(`${base}/one`, { preset: "tablet" });
  } catch (error) {
    if (error.code === "playwright_missing" || error.code === "chromium_missing") {
      t.skip(error.message.split("\n")[0]);
      return;
    }
    throw error;
  }
  assert.equal(state.page.innerWidth, 768);
  await browser.navigate(`${base}/two`);
  assert.match((await browser.history("back")).url, /\/one$/);
  assert.match((await browser.history("forward")).url, /\/two$/);
  assert.match((await browser.history("refresh")).url, /\/two$/);
  const resized = await browser.setViewport({ preset: "custom", width: 500, height: 700 });
  assert.equal(resized.page.innerWidth, 500);
  // Device-trait change recreates the context; the logical history must survive without about:blank.
  const mobile = await browser.setViewport({ preset: "mobile" });
  assert.equal(mobile.page.innerWidth, 390);
  assert.match(mobile.url, /\/two$/);
  const back = await browser.history("back");
  assert.match(back.url, /\/one$/);
  assert.equal(back.page.innerWidth, 390);
  assert.match((await browser.history("forward")).url, /\/two$/);
  assert.match((await browser.setViewport({ preset: "desktop" })).url, /\/two$/);
  assert.match((await browser.history("back")).url, /\/one$/);
  assert.match((await browser.history("back")).url, /\/one$/, "no entry before the first page is not an error and never reaches about:blank");
  await browser.history("forward");
  await assert.rejects(browser.navigate("http://127.0.0.1:1/"), { code: "navigation_failed" });
  const shot = await browser.screenshot({ outputDir: dir });
  assert.equal(shot.source, "controlled-current");
  assert.equal((await readFile(shot.path)).subarray(1, 4).toString(), "PNG");
  assert.equal((await browser.frame()).subarray(1, 4).toString(), "PNG");
  await browser.close();
  assert.equal(browser.active, false);
});

test("an invalid initial viewport is rejected before any browser is launched", async () => {
  const previous = process.env.PR_ARTIFACT_EXPLORER_CHROMIUM;
  // If a launch were attempted, this nonexistent executable would surface a different error code.
  process.env.PR_ARTIFACT_EXPLORER_CHROMIUM = join(tmpdir(), "no-such-chromium");
  try {
    const controlled = new ControlledBrowser();
    await assert.rejects(controlled.navigate("http://127.0.0.1:9/", { width: 1, height: 1 }), { code: "invalid_viewport" });
    assert.equal(controlled.active, false);
    assert.deepEqual(await controlled.close(), { clean: true });
  } finally {
    if (previous === undefined) delete process.env.PR_ARTIFACT_EXPLORER_CHROMIUM;
    else process.env.PR_ARTIFACT_EXPLORER_CHROMIUM = previous;
  }
});

test("an explicit viewport applies to an already-open controlled session, and omitting it keeps the current one", async (t) => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(`<meta name=viewport content="width=device-width,initial-scale=1"><body><div id=t></div><script>document.getElementById('t').textContent=innerWidth;</script></body>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = new ControlledBrowser();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  let state;
  try {
    state = await browser.navigate(`${base}/a`, { preset: "desktop" });
  } catch (error) {
    if (error.code === "playwright_missing" || error.code === "chromium_missing") return t.skip(error.message.split("\n")[0]);
    throw error;
  }
  assert.equal(state.page.innerWidth, 1440);
  state = await browser.navigate(`${base}/b`, { preset: "mobile" });
  assert.equal(state.page.innerWidth, 390);
  state = await browser.navigate(`${base}/c`);
  assert.equal(state.page.innerWidth, 390, "no viewport options keeps the current settings");
});

test("closing while the browser is still starting leaves nothing running", async (t) => {
  const browser = new ControlledBrowser();
  const pending = browser.navigate("http://127.0.0.1:9/", { preset: "desktop" }).catch((error) => error);
  const closed = await browser.close();
  const outcome = await pending;
  if (outcome?.code === "playwright_missing" || outcome?.code === "chromium_missing") return t.skip(outcome.message.split("\n")[0]);
  assert.equal(browser.active, false);
  assert.equal(closed.clean, true);
  assert.ok(outcome instanceof CaptureError, "the interrupted navigation fails explicitly instead of resolving on a torn-down session");
});