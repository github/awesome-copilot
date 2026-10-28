import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32 } from "node:zlib";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-report-state-"));
process.env.COPILOT_HOME = sharedHome;

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(name, raw) {
  const nameBuf = Buffer.from(name);
  const crc = crc32(raw);
  const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(raw.length), u32(raw.length), u16(nameBuf.length), u16(0), nameBuf, raw]);
  const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(raw.length), u32(raw.length), u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBuf]);
  return Buffer.concat([local, central, u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0)]);
}

const XML = `<testsuites><testsuite name="S" tests="4">
<testcase name="ok one" classname="A"/>
<testcase name="skip one" classname="A"><skipped message="n/a"/></testcase>
<testcase name="skip two" classname="B"><skipped message="n/a"/></testcase>
<testcase name="bad one" classname="B"><failure message="boom">trace</failure></testcase>
</testsuite></testsuites>`;

test("report filter, query and details survive Preview/Raw toggles", async (t) => {
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
  const instanceId = `report-state-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await browser.close();
    await stopInstance(instanceId);
    await rm(sharedHome, { recursive: true, force: true });
  });
  const cache = join(sharedHome, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });
  await writeFile(join(cache, "3002.zip"), zipOf("results.xml", Buffer.from(XML)));
  await writeFile(join(cache, "3002.json"), JSON.stringify({ repository: "o/r", artifact: { id: 3002, name: "a" }, downloadedAt: new Date().toISOString(), lastAccessedAt: new Date().toISOString(), compressedBytes: 0, analysis: { primary: { kind: "xml", path: "results.xml", label: "XML code" }, entries: [{ path: "results.xml", name: "results.xml", size: Buffer.byteLength(XML), compressedSize: 0, kind: "xml", mime: "application/xml", supported: true }], counts: { xml: 1 }, fileCount: 1, totalUncompressedBytes: Buffer.byteLength(XML), zipBacked: true } }));

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.url ?? server.origin + "/"}#/artifact/o%2Fr/1/3002?file=results.xml`);
  const rows = () => page.locator("[data-trx-result]:visible").count();
  await page.waitForSelector('[data-junit="report"]', { timeout: 20_000 });
  assert.equal(await rows(), 4);

  await page.click('[data-trx-filter="skipped"]');
  await page.fill("[data-trx-search-input]", "skip");
  assert.equal(await rows(), 2);
  await page.locator("[data-trx-result]:visible summary").first().click();

  for (const toRaw of ['[data-preview-mode="raw"]', "[data-trx-view=raw]"]) {
    await page.click(toRaw);
    await page.waitForSelector(".raw-view", { timeout: 10_000 });
    assert.equal(await page.locator("[data-junit]").count(), 0);
    await page.click('[data-preview-mode="preview"]');
    await page.waitForSelector('[data-junit="report"]', { timeout: 10_000 });
    assert.equal(await rows(), 2, "outcome filter and query restored");
    assert.equal(await page.inputValue("[data-trx-search-input]"), "skip");
    assert.equal(await page.getAttribute('[data-trx-filter="skipped"]', "aria-pressed"), "true");
    assert.equal(await page.getAttribute('[data-trx-filter="all"]', "aria-pressed"), "false");
  }
  assert.deepEqual(errors, []);
});
