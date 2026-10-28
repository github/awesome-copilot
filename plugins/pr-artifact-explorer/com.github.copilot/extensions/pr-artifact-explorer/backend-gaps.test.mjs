import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";
import { JobRegistry } from "./jobs.mjs";
import { LimitPolicy } from "./limits.mjs";
import { readEntryPrefix, readZipIndex, streamZipEntry } from "./zip.mjs";

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function entryRecords(name, content, { deflate = false } = {}) {
  const raw = Buffer.from(content);
  const data = deflate ? deflateRawSync(raw) : raw;
  const nameBuf = Buffer.from(name);
  const checksum = crc32(raw);
  const method = deflate ? 8 : 0;
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(checksum), u32(data.length), u32(raw.length), u16(nameBuf.length), u16(0), nameBuf, data,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(checksum), u32(data.length), u32(raw.length),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBuf,
  ]);
  return { local, central, data, raw };
}

function archive({ local, central }, centralBytes = central, count = 1) {
  return Buffer.concat([
    local, centralBytes,
    u32(0x06054b50), u16(0), u16(0), u16(count), u16(count), u32(centralBytes.length), u32(local.length), u16(0),
  ]);
}

async function inTemp(fn) {
  const dir = await mkdtemp(join(tmpdir(), "backend-gaps-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("central directory records beyond the first 1MiB chunk are validated against the count", () =>
  inTemp(async (dir) => {
    const parts = entryRecords("index.html", "<h1>hi</h1>");
    const padded = Buffer.concat([parts.central, Buffer.alloc(1024 * 1024), parts.central]);
    const path = join(dir, "bad.zip");
    await writeFile(path, archive(parts, padded, 1));
    await assert.rejects(readZipIndex(path), /entry count mismatch/i);

    const good = join(dir, "good.zip");
    await writeFile(good, archive(parts));
    assert.equal((await readZipIndex(good)).entries.length, 1);
  }));

test("a directory declaring more entries than it contains is rejected", () =>
  inTemp(async (dir) => {
    const parts = entryRecords("index.html", "x");
    const path = join(dir, "short.zip");
    await writeFile(path, archive(parts, parts.central, 2));
    await assert.rejects(readZipIndex(path), /entry count mismatch/i);
  }));

test("readEntryPrefix inflates a bounded prefix from a streamed source", () =>
  inTemp(async (dir) => {
    const parts = entryRecords("big.txt", "a".repeat(5 * 1024 * 1024), { deflate: true });
    const path = join(dir, "big.zip");
    await writeFile(path, archive(parts));
    const entry = (await readZipIndex(path)).entries[0];
    const prefix = await readEntryPrefix(path, entry, 8 * 1024);
    assert.equal(prefix.length, 8 * 1024);
    assert.ok(prefix.every((byte) => byte === 0x61));
  }));

test("streamZipEntry reports live progress and soft-limit crossings without stopping the stream", () =>
  inTemp(async (dir) => {
    const parts = entryRecords("big.txt", "b".repeat(2 * 1024 * 1024), { deflate: true });
    const path = join(dir, "s.zip");
    await writeFile(path, archive(parts));
    const entry = (await readZipIndex(path)).entries[0];
    let received = 0;
    const sink = new Writable({
      write(chunk, _enc, cb) {
        received += chunk.length;
        cb();
      },
    });
    const progress = [];
    const warned = [];
    await streamZipEntry(path, entry, sink, null, {
      softLimit: 1024,
      onProgress: (bytes) => progress.push(bytes),
      onSoftLimit: (kind, bytes) => warned.push([kind, bytes]),
    });
    assert.equal(received, 2 * 1024 * 1024);
    assert.ok(progress.length > 0 && progress.at(-1) === received);
    assert.ok(warned.length > 0 && warned.every(([kind]) => kind === "streamedEntryBytes"));
  }));

test("tracked decompression streams prompt once past the limit and are submit-checked against live bytes", () =>
  inTemp(async (dir) => {
    const policy = new LimitPolicy(join(dir, "limits.json"));
    const registry = new JobRegistry(policy);
    const tracker = registry.track({ repository: "a/b", artifactId: 1, name: "x.bin" });
    tracker.update(policy.get("streamedEntryBytes") + 500);
    const snap = registry.snapshot(tracker.job);
    assert.equal(snap.prompts[0].kind, "streamedEntryBytes");
    assert.throws(() => policy.submit("streamedEntryBytes", policy.get("streamedEntryBytes") + 10), /below|minimum|current/i);
    tracker.finish();
    assert.equal(registry.get(tracker.job.id), null);
  }));

test("concurrent limit submits persist deterministically without temp-file races", () =>
  inTemp(async (dir) => {
    const file = join(dir, "limits.json");
    const policy = new LimitPolicy(file);
    const base = policy.get("downloadBytes");
    for (let i = 1; i <= 30; i++) policy.submit("downloadBytes", base + i * 1000);
    await policy.flush();
    assert.equal(policy.persistError, null);
    const disk = JSON.parse(await readFile(file, "utf8"));
    assert.equal(disk.downloadBytes ?? disk.limits?.downloadBytes, base + 30_000);
    assert.equal(policy.get("downloadBytes"), base + 30_000);
  }));

test("corrupt saved limits surface a recoverable warning and keep defaults", () =>
  inTemp(async (dir) => {
    const file = join(dir, "limits.json");
    await writeFile(file, "{ not json");
    const policy = new LimitPolicy(file);
    const defaults = policy.get("downloadBytes");
    await policy.load();
    assert.match(policy.loadWarning, /corrupt/i);
    assert.equal(policy.get("downloadBytes"), defaults);
  }));

test("running jobs persist without secrets and recover as interrupted", () =>
  inTemp(async (dir) => {
    const file = join(dir, "jobs.json");
    const policy = new LimitPolicy(join(dir, "limits.json"));
    const first = new JobRegistry(policy, { file });
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const job = first.start("acct:a/b:7", { repository: "a/b", artifactId: 7, account: "acct" }, () => gate);
    await first.flush();
    const raw = await readFile(file, "utf8");
    assert.ok(!/token/i.test(raw));

    const second = new JobRegistry(policy, { file });
    await second.load();
    const recovered = second.snapshot(second.get(job.id));
    assert.equal(recovered.status, "interrupted");
    assert.match(recovered.error, /interrupted/i);
    assert.equal(recovered.account, "acct");
    await second.flush();
    const retry = second.start("acct:a/b:7", { repository: "a/b", artifactId: 7, account: "acct" }, async () => "ok");
    assert.equal(retry.attempt, 2);
    assert.equal(await retry.promise, "ok");

    release();
    await job.promise;
    await first.flush();
    await second.flush();
  }));

test("a corrupt job history file surfaces a warning", () =>
  inTemp(async (dir) => {
    const file = join(dir, "jobs.json");
    await writeFile(file, "oops");
    const registry = new JobRegistry(new LimitPolicy(join(dir, "limits.json")), { file });
    await registry.load();
    assert.match(registry.loadWarning, /corrupt/i);
  }));
