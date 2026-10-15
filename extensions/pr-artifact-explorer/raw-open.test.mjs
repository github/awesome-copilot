import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";
import { ExternalOpenError, launchWithAck, launcherCommand, setExternalOpener, validateExternalUrl } from "./external-open.mjs";
import { EventEmitter } from "node:events";

function fakeSpawn(behavior) {
  return (command, args, options) => {
    const child = new EventEmitter();
    child.unref = () => { child.unrefd = true; };
    child.spawned = { command, args, options };
    setImmediate(() => behavior(child));
    return child;
  };
}

test("launcher acknowledgement reports nonzero exit, errors, zero exit and long-lived launchers truthfully", async () => {
  const run = (behavior, ackMs = 200) => launchWithAck("http://a/", { spawnFn: fakeSpawn(behavior), ackMs, command: { command: "x", args: ["http://a/"] } });
  await assert.rejects(run((c) => c.emit("exit", 1, null)), /code 1/);
  await assert.rejects(run((c) => c.emit("exit", null, "SIGKILL")), /SIGKILL/);
  await assert.rejects(run((c) => c.emit("error", new Error("ENOENT"))), /ENOENT/);
  await run((c) => c.emit("exit", 0, null));
  let alive;
  await run((c) => { alive = c; });
  assert.equal(alive.unrefd, true);
  assert.equal(alive.listenerCount("exit"), 0);
  assert.deepEqual(
    Object.keys(await new Promise((r) => { const s = fakeSpawn((c) => c.emit("exit", 0)); const c = s("x", [], { shell: false, windowsHide: true, detached: true, stdio: "ignore" }); r(c.spawned.options); })).sort(),
    ["detached", "shell", "stdio", "windowsHide"],
  );
  await assert.rejects(
    (async () => { setExternalOpener((u) => launchWithAck(u, { spawnFn: fakeSpawn((c) => c.emit("exit", 3)), ackMs: 100, command: { command: "x", args: [] } })); try { const { openInDefaultBrowser } = await import("./external-open.mjs"); await openInDefaultBrowser("http://127.0.0.1/"); } finally { setExternalOpener(null); } })(),
    (error) => error.code === "launch_failed",
  );
});

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(name, raw, { deflate = false, flags = 0, method, declaredSize, declaredCrc } = {}) {
  const data = Buffer.from(deflate ? deflateRawSync(raw) : raw);
  const nameBuf = Buffer.from(name);
  const m = method ?? (deflate ? 8 : 0);
  const crc = declaredCrc ?? crc32(raw);
  const usize = declaredSize ?? raw.length;
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(flags), u16(m), u16(0), u16(0x21),
    u32(crc), u32(data.length), u32(usize), u16(nameBuf.length), u16(0), nameBuf, data,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(flags), u16(m), u16(0), u16(0x21),
    u32(crc), u32(data.length), u32(usize),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBuf,
  ]);
  return Buffer.concat([
    local, central,
    u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0),
  ]);
}

const sharedHome = await mkdtemp(join(tmpdir(), "pae-raw-"));
process.env.COPILOT_HOME = sharedHome;

test("hexDump formats offset, hex and ASCII without decoding", async () => {
  const { hexDump } = await import("./raw.mjs");
  const dump = hexDump(Buffer.from([0x41, 0x00, 0xff, 0x7e]), 16);
  assert.match(dump, /^00000010 {2}41 00 ff 7e/);
  assert.match(dump, /\|A\.\.~\|$/);
});

test("raw view returns exact source, bounded hex, and explains unsupported entries", async (t) => {
  const home = sharedHome;
  const instanceId = `raw-${Date.now()}`;
  const { startInstance, stopInstance } = await import("./server.mjs");
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await stopInstance(instanceId);
    await rm(home, { recursive: true, force: true });
  });
  const cache = join(home, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });

  const ugly = Buffer.from('{"b":1,\r\n  "a" :[1,2],"é":"ü"}\r\n');
  const bin = Buffer.from(Array.from({ length: 40000 }, (_, i) => (i * 7) % 256));
  const bigText = Buffer.from("line of text\n".repeat(400000));
  const htmlSource = Buffer.from("<!doctype html>\r\n<script>alert(1)</script><p>é</p>\r\n");
  const castSource = Buffer.from('{"version":2,"width":80,"height":24}\n[0.1,"o","hi"]\n');
  const svgSource = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><title>x</title></svg>');
  const fixtures = [
    ["2001", "d/data.json", ugly, {}],
    ["2002", "d/empty.txt", Buffer.alloc(0), {}],
    ["2003", "d/movie.webm", bin, { deflate: true }],
    ["2004", "d/big.log", bigText, { deflate: true }],
    ["2005", "d/secret.txt", Buffer.from("x"), { flags: 1 }],
    ["2006", "d/odd.txt", Buffer.from("abc"), { method: 14 }],
    ["2007", "d/tiny.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]), {}],
    ["2008", "d/bad-crc.txt", Buffer.alloc(0), { declaredCrc: 0xdeadbeef }],
    ["2009", "d/bad-data.txt", Buffer.from("hidden"), { declaredSize: 0, declaredCrc: 0 }],
    ["2010", "d/index.html", htmlSource, {}],
    ["2011", "d/demo.cast", castSource, {}],
    ["2012", "d/logo.svg", svgSource, {}],
  ];
  for (const [id, name, content, options] of fixtures) {
    await writeFile(join(cache, `${id}.zip`), zipOf(name, content, options));
    await writeFile(
      join(cache, `${id}.json`),
      JSON.stringify({ repository: "o/r", artifact: { id: Number(id), name: "a" }, entries: [{ name, kind: "binary" }] }),
    );
  }
  const raw = async (id, name) => {
    const response = await fetch(
      `${server.origin}/api/artifacts/${id}/raw?path=${encodeURIComponent(name)}`,
      { headers: { "x-pr-artifact-explorer-token": server.token } },
    );
    return { status: response.status, body: await response.json() };
  };

  const json = await raw(2001, "d/data.json");
  assert.equal(json.status, 200, JSON.stringify(json.body));
  assert.equal(json.body.mode, "text");
  assert.equal(json.body.content, ugly.toString("utf8"), "JSON is not reserialized");
  assert.equal(json.body.truncated, false);

  const empty = await raw(2002, "d/empty.txt");
  assert.equal(empty.body.mode, "empty");
  assert.equal(empty.body.size, 0);
  for (const [id, name] of [[2008, "d/bad-crc.txt"], [2009, "d/bad-data.txt"]]) {
    const bad = await raw(id, name);
    assert.ok(bad.status >= 400, `${name} must not become an empty success: ${JSON.stringify(bad.body)}`);
    assert.notEqual(bad.body.mode, "empty");
  }

  for (const [id, name, source] of [
    [2010, "d/index.html", htmlSource],
    [2011, "d/demo.cast", castSource],
    [2012, "d/logo.svg", svgSource],
  ]) {
    const result = await raw(id, name);
    assert.equal(result.body.mode, "text", name);
    assert.equal(result.body.content, source.toString("utf8"), `${name} exact source`);
  }

  const movie = await raw(2003, "d/movie.webm");
  assert.equal(movie.body.mode, "hex");
  assert.equal(movie.body.truncated, true);
  assert.equal(movie.body.size, bin.length);
  assert.equal(movie.body.shown, 16 * 1024);
  assert.equal(movie.body.content.split("\n").length, 1024);

  const big = await raw(2004, "d/big.log");
  assert.equal(big.body.mode, "text");
  assert.equal(big.body.truncated, true);
  assert.equal(big.body.size, bigText.length);
  assert.ok(big.body.shown < bigText.length);
  assert.equal(big.body.content, bigText.subarray(0, big.body.shown).toString("utf8"));

  const small = await raw(2007, "d/tiny.png");
  assert.equal(small.body.mode, "hex");
  assert.equal(small.body.truncated, false);

  const encrypted = await raw(2005, "d/secret.txt");
  assert.equal(encrypted.body.mode, "unsupported");
  assert.match(encrypted.body.reason, /encrypted/);
  const odd = await raw(2006, "d/odd.txt");
  assert.equal(odd.body.mode, "unsupported");
  assert.match(odd.body.reason, /method 14/);

  const missing = await raw(2001, "d/nope.txt");
  assert.ok(missing.status >= 400);
});

test("external open validates URLs and routes through an injectable launcher", async (t) => {
  assert.equal(validateExternalUrl("http://127.0.0.1:3000/a?b=1#c"), "http://127.0.0.1:3000/a?b=1#c");
  for (const bad of ["", "file:///etc/passwd", "javascript:alert(1)", "http://u:p@example.com/", "http://exa mple.com/", "http://a.com/\n", "ftp://x.com", "not a url"]) {
    assert.throws(() => validateExternalUrl(bad), ExternalOpenError, bad);
  }
  assert.deepEqual(launcherCommand("http://a/", "win32", { SystemRoot: "C:\\Windows" }), { command: "C:\\Windows\\System32\\rundll32.exe", args: ["url.dll,FileProtocolHandler", "http://a/"] });
  assert.equal(launcherCommand("http://a/", "darwin").command, "/usr/bin/open");
  assert.equal(launcherCommand("http://a/", "linux").command, "xdg-open");

  const home = await mkdtemp(join(tmpdir(), "pae-open-"));
  process.env.COPILOT_HOME = home;
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `open-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  const opened = [];
  setExternalOpener(async (url) => { opened.push(url); });
  t.after(async () => {
    setExternalOpener(null);
    await stopInstance(instanceId);
    await rm(home, { recursive: true, force: true });
  });
  const post = (body) =>
    fetch(`${server.origin}/api/browser/open-external`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-pr-artifact-explorer-token": server.token },
      body: JSON.stringify(body),
    });

  const ok = await post({ url: "https://example.com/x?y=1#z", theme: "dark" });
  assert.equal(ok.status, 200);
  assert.deepEqual(opened, ["https://example.com/x?y=1#z"]);

  const rejected = await post({ url: "javascript:alert(1)" });
  assert.equal(rejected.status, 400);
  assert.equal(opened.length, 1, "invalid URLs never reach the launcher");

  setExternalOpener(async () => { throw new Error("no handler"); });
  const failed = await post({ url: "https://example.com/" });
  assert.equal(failed.status, 502);
  assert.match((await failed.json()).error ?? "", /Could not launch/);
});
