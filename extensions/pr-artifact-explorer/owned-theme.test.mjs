import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32 } from "node:zlib";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-owned-theme-"));
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

test("closeBrowserBounded returns within its bound for a stuck browser and never throws", async () => {
  const { closeBrowserBounded } = await import("./capture.mjs");  const started = Date.now();
  assert.equal(await closeBrowserBounded({ close: () => new Promise(() => {}) }, 150), false);
  assert.ok(Date.now() - started < 2000);
  assert.equal(await closeBrowserBounded({ close: async () => { throw new Error("boom"); } }, 150), true);
  assert.equal(await closeBrowserBounded({ close: async () => {} }, 150), true);
  assert.equal(await closeBrowserBounded(null, 150), true);
});

test("owned artifact pages follow the CURRENT theme in controlled browsing and capture", async (t) => {
  const home = sharedHome;
  const { startInstance, stopInstance } = await import("./server.mjs");
  const { startStaticPreview } = await import("./preview.mjs");
  const instanceId = `owned-theme-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await stopInstance(instanceId);
    await rm(home, { recursive: true, force: true });
  });
  const cache = join(home, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });
  const html = Buffer.from(
    "<!doctype html><title>pending</title><body><script>addEventListener('load',()=>{document.title=document.documentElement.dataset.colorMode+'|'+matchMedia('(prefers-color-scheme: dark)').matches});</script></body>",
  );
  await writeFile(join(cache, "3001.zip"), zipOf("index.html", html));
  await writeFile(join(cache, "3001.json"), JSON.stringify({ repository: "o/r", artifact: { id: 3001, name: "a" }, entries: [{ name: "index.html", kind: "html" }] }));

  const call = async (path, body) => {
    const res = await fetch(`${server.origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-pr-artifact-explorer-token": server.token },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  const bakedLight = new URL(await startStaticPreview(3001, "index.html", { theme: "light", parentOrigin: server.origin }));
  const target = `${bakedLight.origin}/index.html?x=1#h`;
  try {
    const nav = await call("/api/controlled/navigate", { url: target, theme: "dark", preset: "desktop" });
    if (nav.status === 424 && /playwright|chromium/i.test(JSON.stringify(nav.body))) return t.skip("Chromium runtime unavailable");
    assert.equal(nav.status, 200, JSON.stringify(nav.body));
    assert.equal(nav.body.controlled.title, "dark|true");
    assert.notEqual(new URL(nav.body.controlled.url).origin, bakedLight.origin);
    assert.match(nav.body.controlled.url, /\/index\.html\?x=1#h$/);

    const toLight = await call("/api/controlled/theme", { theme: "light" });
    assert.equal(toLight.status, 200, JSON.stringify(toLight.body));
    assert.equal(toLight.body.controlled.title, "light|false");
    assert.match(toLight.body.controlled.url, /\?x=1#h$/);

    const shot = await call("/api/capture", { url: target, theme: "dark", preset: "desktop" });
    assert.equal(shot.status, 200, JSON.stringify(shot.body));
    assert.match(shot.body.capture.finalUrl, /\/index\.html\?x=1/);
    assert.notEqual(new URL(shot.body.capture.finalUrl).origin, bakedLight.origin);
    assert.equal(shot.body.capture.colorScheme, "dark");
  } finally {
    const started = Date.now();
    const closed = await call("/api/controlled/close", {});
    assert.equal(closed.status, 200);
    assert.ok(Date.now() - started < 15_000);
  }
});
