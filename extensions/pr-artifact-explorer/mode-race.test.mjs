import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32 } from "node:zlib";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-mode-race-"));
process.env.COPILOT_HOME = sharedHome;

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, raw] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const crc = crc32(raw);
    const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(raw.length), u32(raw.length), u16(nameBuf.length), u16(0), nameBuf, raw]);
    centrals.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(raw.length), u32(raw.length), u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf]));
    locals.push(local);
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  return Buffer.concat([...locals, central, u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length), u32(central.length), u32(offset), u16(0)]);
}

const HTML = "<!doctype html><title>race</title><p>hello</p>";
const TEXT = "plain text";

test("late async responses cannot overwrite the selected mode or file", async (t) => {
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
  const instanceId = `mode-race-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await browser.close();
    await stopInstance(instanceId);
    await rm(sharedHome, { recursive: true, force: true });
  });
  const cache = join(sharedHome, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });
  const files = { "index.html": Buffer.from(HTML), "notes.txt": Buffer.from(TEXT) };
  await writeFile(join(cache, "3003.zip"), zipOf(files));
  const entry = (name, kind, mime, raw) => ({ path: name, name, size: raw.length, compressedSize: raw.length, kind, mime, supported: true });
  await writeFile(join(cache, "3003.json"), JSON.stringify({
    repository: "o/r",
    artifact: { id: 3003, name: "a" },
    downloadedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    compressedBytes: 0,
    analysis: {
      primary: { kind: "html", path: "index.html", label: "HTML" },
      entries: [entry("index.html", "html", "text/html", files["index.html"]), entry("notes.txt", "text", "text/plain", files["notes.txt"])],
      counts: { html: 1, text: 1 },
      fileCount: 2,
      totalUncompressedBytes: HTML.length + TEXT.length,
      zipBacked: true,
    },
  }));

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const gates = { preview: null, raw: null };
  const hold = (key) => {
    let release;
    gates[key] = new Promise((resolve) => (release = resolve));
    return release;
  };
  await page.route("**/api/artifacts/3003/preview-url*", async (route) => {
    if (gates.preview) await gates.preview;
    await route.continue();
  });
  await page.route("**/api/artifacts/3003/raw*", async (route) => {
    if (gates.raw) await gates.raw;
    await route.continue();
  });
  const base = server.url ?? `${server.origin}/`;
  const settle = () => page.waitForTimeout(1000);

  // Preview -> Raw while the preview-url request is pending.
  const releasePreview = hold("preview");
  await page.goto(`${base}#/artifact/o%2Fr/1/3003?file=index.html`);
  await page.waitForSelector('[data-preview-mode="raw"]', { timeout: 40_000 });
  await page.click('[data-preview-mode="raw"]');
  await page.waitForSelector(".raw-view", { timeout: 40_000 });
  releasePreview();
  gates.preview = null;
  await settle();
  assert.equal(await page.locator("iframe.preview-frame").count(), 0, "late preview must not execute HTML");
  assert.equal(await page.locator(".raw-view").count(), 1);
  assert.equal(await page.getAttribute('[data-preview-mode="raw"]', "aria-pressed"), "true");
  assert.equal(await page.locator("#preview-open-browser").isVisible(), false);

  // Raw -> Preview while the raw request is pending.
  await page.click('[data-preview-mode="preview"]');
  await page.waitForSelector("iframe.preview-frame", { timeout: 40_000 });
  const releaseRaw = hold("raw");
  await page.click('[data-preview-mode="raw"]');
  await page.click('[data-preview-mode="preview"]');
  await page.waitForSelector("iframe.preview-frame", { timeout: 40_000 });
  releaseRaw();
  gates.raw = null;
  await settle();
  assert.equal(await page.locator(".raw-view").count(), 0, "late raw must not overwrite Preview");
  assert.equal(await page.locator("iframe.preview-frame").count(), 1);

  // File switch while the HTML preview-url request is pending.
  const releaseSwitch = hold("preview");
  await page.goto(`${base}#/artifact/o%2Fr/1/3003?file=notes.txt`);
  await page.goto(`${base}#/artifact/o%2Fr/1/3003?file=index.html`);
  await page.goto(`${base}#/artifact/o%2Fr/1/3003?file=notes.txt`);
  await page.waitForSelector(".text-preview", { timeout: 40_000 });
  releaseSwitch();
  gates.preview = null;
  await settle();
  assert.equal(await page.locator("iframe.preview-frame").count(), 0, "late HTML must not replace the selected text file");
  assert.equal(await page.locator(".text-preview").textContent(), TEXT);
  assert.deepEqual(errors, []);
});
