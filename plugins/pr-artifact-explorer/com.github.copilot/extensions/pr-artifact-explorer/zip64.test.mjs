import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32 } from "node:zlib";
import { readZipEntry, readZipIndex } from "./zip.mjs";

function u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; }
function u64(v) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; }

// Builds a stored single-entry archive; zip64 uses sentinel fields plus ZIP64 extras and EOCD64.
function buildZip({ name = "index.html", content = "<h1>hi</h1>", zip64 = false, crc, dirOffset } = {}) {
  const data = Buffer.from(content);
  const nameBuf = Buffer.from(name);
  const checksum = crc ?? crc32(data);
  const local = Buffer.concat([
    u32(0x04034b50), u16(zip64 ? 45 : 20), u16(0), u16(0), u16(0), u16(0x21),
    u32(checksum), u32(data.length), u32(data.length), u16(nameBuf.length), u16(0), nameBuf, data,
  ]);
  const extra = zip64 ? Buffer.concat([u16(1), u16(24), u64(data.length), u64(data.length), u64(0)]) : Buffer.alloc(0);
  const central = Buffer.concat([
    u32(0x02014b50), u16(45), u16(zip64 ? 45 : 20), u16(0), u16(0), u16(0), u16(0x21),
    u32(checksum), u32(zip64 ? 0xffffffff : data.length), u32(zip64 ? 0xffffffff : data.length),
    u16(nameBuf.length), u16(extra.length), u16(0), u16(0), u16(0), u32(0),
    u32(zip64 ? 0xffffffff : 0), nameBuf, extra,
  ]);
  const cdOffset = dirOffset ?? local.length;
  if (!zip64) {
    return Buffer.concat([local, central, u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(cdOffset), u16(0)]);
  }
  const eocd64Offset = local.length + central.length;
  const eocd64 = Buffer.concat([
    u32(0x06064b50), u64(44), u16(45), u16(45), u32(0), u32(0), u64(1), u64(1), u64(central.length), u64(cdOffset),
  ]);
  const locator = Buffer.concat([u32(0x07064b50), u32(0), u64(eocd64Offset), u32(1)]);
  return Buffer.concat([
    local, central, eocd64, locator,
    u32(0x06054b50), u16(0), u16(0), u16(0xffff), u16(0xffff), u32(0xffffffff), u32(0xffffffff), u16(0),
  ]);
}

async function withZip(options, fn) {
  const dir = await mkdtemp(join(tmpdir(), "zip64-"));
  try {
    const path = join(dir, "a.zip");
    await writeFile(path, buildZip(options));
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

for (const zip64 of [false, true]) {
  test(`reads a valid ${zip64 ? "ZIP64" : "ZIP32"} archive`, () =>
    withZip({ zip64 }, async (path) => {
      const index = await readZipIndex(path);
      assert.equal(index.zip64, zip64);
      assert.equal(index.entries.length, 1);
      assert.equal((await readZipEntry(path, index.entries[0])).toString(), "<h1>hi</h1>");
    }));
}

test("CRC mismatch is a hard integrity failure", () =>
  withZip({ zip64: true, crc: 1234 }, async (path) => {
    const index = await readZipIndex(path);
    await assert.rejects(readZipEntry(path, index.entries[0]), /checksum/);
  }));

test("path traversal is rejected", () =>
  withZip({ zip64: true, name: "../escape.txt" }, async (path) => {
    await assert.rejects(readZipIndex(path), /unsafe path/);
  }));

test("a central directory pointing outside the archive is rejected", () =>
  withZip({ dirOffset: 99999 }, async (path) => {
    await assert.rejects(readZipIndex(path), /outside the archive|central directory/i);
  }));

test("soft entry limit warns while indexing continues", () =>
  withZip({ zip64: true }, async (path) => {
    const warnings = [];
    const index = await readZipIndex(path, {
      softLimits: { zipEntries: 0 },
      onSoftLimit: (kind, current) => warnings.push([kind, current]),
    });
    assert.equal(index.entries.length, 1);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0][0], "zipEntries");
    assert.equal(warnings[0][1], index.entries.length);
    assert.ok(warnings[0][1] > 0);
  }));
