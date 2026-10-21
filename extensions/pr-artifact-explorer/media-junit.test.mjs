import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";
import { loadPlaywright } from "./capture.mjs";
import { kindForPath, mimeForPath } from "./detector.mjs";
import { parseByteRange } from "./server.mjs";
import { readZipIndex, streamZipEntryRange } from "./zip.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(name, content, deflate) {
  const raw = Buffer.from(content);
  const data = deflate ? deflateRawSync(raw) : raw;
  const nameBuf = Buffer.from(name);
  const method = deflate ? 8 : 0;
  const sum = crc32(raw);
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(sum), u32(data.length), u32(raw.length), u16(nameBuf.length), u16(0), nameBuf, data,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(sum), u32(data.length), u32(raw.length),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBuf,
  ]);
  return Buffer.concat([
    local, central,
    u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0),
  ]);
}

async function collect(path, entry, range) {
  const chunks = [];
  await streamZipEntryRange(
    path,
    entry,
    new Writable({ write(chunk, _e, done) { chunks.push(chunk); done(); } }),
    range,
    {},
  );
  return Buffer.concat(chunks);
}

test("video extensions classify as video with playable MIME types", () => {
  assert.equal(kindForPath("a/video.webm"), "video");
  assert.equal(kindForPath("clip.MP4"), "video");
  assert.equal(kindForPath("clip.mov"), "video");
  assert.equal(mimeForPath("video.webm"), "video/webm");
  assert.equal(mimeForPath("clip.mp4"), "video/mp4");
  assert.equal(mimeForPath("clip.mov"), "video/quicktime");
  assert.equal(kindForPath("results.xml"), "xml");
});

test("parseByteRange handles suffix, open, clamped, invalid and unsatisfiable ranges", () => {
  assert.deepEqual(parseByteRange("bytes=0-9", 100), { kind: "range", start: 0, end: 9 });
  assert.deepEqual(parseByteRange("bytes=90-", 100), { kind: "range", start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-10", 100), { kind: "range", start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=50-500", 100), { kind: "range", start: 50, end: 99 });
  assert.deepEqual(parseByteRange("bytes=100-", 100), { kind: "unsatisfiable" });
  assert.deepEqual(parseByteRange("bytes=0-0", 0), { kind: "unsatisfiable" });
  assert.deepEqual(parseByteRange("bytes=0-1,5-6", 100), { kind: "none" });
  assert.deepEqual(parseByteRange("items=0-1", 100), { kind: "none" });
  assert.deepEqual(parseByteRange(undefined, 100), { kind: "none" });
});

for (const deflate of [false, true]) {
  test(`streamZipEntryRange returns exact bytes for ${deflate ? "deflated" : "stored"} entries`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "pae-range-"));
    try {
      const content = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251));
      const path = join(dir, "v.zip");
      await writeFile(path, zipOf("video.webm", content, deflate));
      const entry = (await readZipIndex(path)).entries[0];
      assert.deepEqual(await collect(path, entry, { start: 0, end: 4999 }), content);
      assert.deepEqual(await collect(path, entry, { start: 1234, end: 3456 }), content.subarray(1234, 3457));
      assert.deepEqual(await collect(path, entry, { start: 4990, end: 4999 }), content.subarray(4990));
      await assert.rejects(collect(path, entry, { start: 10, end: 5000 }));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

const FIXTURES = {
  nested: `<?xml version="1.0"?>
<testsuites name="All" tests="99" time="9.5">
  <testsuite name="Parent" tests="99" time="9">
    <testsuite name="Browser A" tests="2"><testcase name="loads" classname="a" time="1.25"/>
      <testcase name="fails" classname="a" time="1"><failure message="boom" type="AssertionError"><![CDATA[<b>text only</b>]]></failure></testcase>
      <system-out>suite out</system-out></testsuite>
    <testsuite name="Browser B" tests="2"><testcase name="captures a page" classname="b" time="1"><error message="bad" type="FixtureError"/></testcase>
      <testcase name="skipped one" classname="b" time="0.5"><skipped message="Device not configured"/></testcase>
      <system-err>suite err</system-err></testsuite>
  </testsuite>
</testsuites>`,
  namespaced: `\uFEFF<?xml version="1.0"?><!-- c -->
<j:testsuite xmlns:j="urn:example:junit" name="NS" tests="4" time="0.75">
<j:testcase name="plain" time="0.25"/>
<j:testcase name="&lt;b&gt;label&lt;/b&gt;" time="0.25"><j:failure message="f"/></j:testcase>
<j:testcase name="both" time="0.25"><j:failure message="f"/><j:error message="e"/></j:testcase>
<j:testcase name="skip"><j:skipped/></j:testcase></j:testsuite>`,
  generic: `<configuration><testsuite name="x"><testcase name="y"/></testsuite></configuration>`,
  malformed: `<testsuites><testsuite name="x"><testcase></testsuites>`,
  entity: `<!DOCTYPE testsuite [<!ENTITY x "y">]><testsuite name="x"><testcase name="&x;"/></testsuite>`,
};

test("JUnit viewer detects, aggregates, escapes and falls back in real Chromium", async (t) => {
  let chromium;
  try {
    chromium = await loadPlaywright();
  } catch (error) {
    t.skip(error.message.split("\n")[0]);
    return;
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
  if (!browser) {
    t.skip("Chromium is not available");
    return;
  }
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<div id="out"></div>`);
  await page.addScriptTag({ content: await readFile(join(here, "assets", "junit-preview.js"), "utf8") });
  const highlightXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  void highlightXml;

  const detect = await page.evaluate((f) => Object.fromEntries(
    Object.entries(f).map(([k, v]) => [k, JunitPreview.detect(v)]),
  ), FIXTURES);
  assert.equal(detect.nested, "testsuites");
  assert.equal(detect.namespaced, "testsuite");
  assert.equal(detect.generic, "");
  assert.equal(detect.malformed, "testsuites");

  const nested = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;") });
    return {
      text: out.textContent,
      results: [...out.querySelectorAll("[data-trx-result]")].map((r) => r.dataset.trxCategory),
      injected: out.querySelectorAll("b").length,
    };
  }, FIXTURES.nested);
  assert.deepEqual(nested.results.sort(), ["error", "failed", "passed", "skipped"]);
  assert.match(nested.text, /99/);
  assert.match(nested.text, /<b>text only<\/b>/);
  assert.match(nested.text, /suite out/);
  assert.match(nested.text, /suite err/);
  assert.match(nested.text, /9\.5/);
  assert.match(nested.text, /3\.75/);
  assert.equal(nested.injected, 0);

  const ns = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;") });
    return {
      results: [...out.querySelectorAll("[data-trx-result]")].map((r) => `${r.dataset.trxCategory}`),
      injected: out.querySelectorAll("b").length,
    };
  }, FIXTURES.namespaced);
  assert.deepEqual(ns.results.sort(), ["error", "failed", "passed", "skipped"]);
  assert.equal(ns.injected, 0);

  const bad = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;") });
    return out.querySelector('[data-junit="error"] [role="alert"], [data-junit="error"][role="alert"]') !== null
      || out.textContent.includes("Unable to read this JUnit report");
  }, FIXTURES.malformed);
  assert.ok(bad);

  const entity = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s });
    return out.textContent.includes("Unable to read this JUnit report");
  }, FIXTURES.entity);
  assert.ok(entity, "DTD entity declarations are rejected");

  const filtered = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s });
    const preview = out.querySelector(".trx-preview");
    preview.querySelector('[data-trx-filter="failed"], [data-trx-filter][value="failed"]')?.click?.();
    JunitPreview.applyFilters(preview);
    return [...out.querySelectorAll("[data-trx-result]")].filter((r) => !r.hidden).length;
  }, FIXTURES.nested);
  assert.ok(filtered >= 1);

  const timing = await page.evaluate((cases) => cases.map(([xml]) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s });
    return [out.querySelector("[data-junit-elapsed]")?.textContent, out.querySelector("[data-junit-test-time]")?.textContent];
  }), [
    ['<testsuite name="a" time="1,25"><testcase name="x"/></testsuite>'],
    ['<testsuite name="a" time="0"><testcase name="x" time="0"/></testsuite>'],
    ['<testsuite name="a" time="-1"><testcase name="x" time="abc"/></testsuite>'],
    ['<testsuite name="a" time="1.5"><testcase name="x" time="1e0"/></testsuite>'],
  ]);
  assert.deepEqual(timing[0], ["Not recorded", "Not recorded"]);
  assert.deepEqual(timing[1], ["0 s", "0 s"]);
  assert.deepEqual(timing[2], ["Not recorded", "Not recorded"]);
  assert.deepEqual(timing[3], ["1.5 s", "1 s"]);

  const search = await page.evaluate((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s });
    const preview = out.querySelector(".trx-preview");
    const input = preview.querySelector("[data-trx-search-input]");
    const visible = () => [...preview.querySelectorAll("[data-trx-result]")].filter((r) => !r.hidden).length;
    input.value = "Browser A";
    JunitPreview.applyFilters(preview);
    const a = [visible(), preview.querySelector("[data-trx-result-count]").textContent];
    input.value = "browser   b";
    JunitPreview.applyFilters(preview);
    return [a, visible()];
  }, `<testsuites><testsuite name="Browser A"><testcase name="one"/><testcase name="two"/></testsuite><testsuite name="Browser B"><testcase name="three"/><testcase name="four"/></testsuite></testsuites>`);
  assert.deepEqual(search[0], [2, "2 of 4 results"]);
  assert.equal(search[1], 2);

  const outcomes = await page.evaluate((reports) => reports.map((xml) => {
    const out = document.getElementById("out");
    JunitPreview.render(xml, out, { highlightXml: (s) => s });
    const el = out.querySelector(".trx-run-outcome");
    return [el.textContent.trim(), el.className.includes("trx-outcome-skipped")];
  }), [
    '<testsuite name="Skipped run" tests="1" skipped="1" time="0"><testcase name="not executed" time="0"><skipped message="not configured"/></testcase></testsuite>',
    '<testsuite name="Mixed"><testcase name="a"/><testcase name="b"><skipped/></testcase></testsuite>',
    '<testsuite name="Empty" tests="0"></testsuite>',
  ]);
  assert.deepEqual(outcomes[0], ["Skipped", true]);
  assert.deepEqual(outcomes[1], ["Passed", false]);
  assert.deepEqual(outcomes[2], ["No tests", true]);
});
