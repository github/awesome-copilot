import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(name, raw, { deflate, crc = crc32(raw), size = raw.length, flipDataByte = false }) {
  const data = Buffer.from(deflate ? deflateRawSync(raw) : raw);
  if (flipDataByte) data[Math.floor(data.length / 2)] ^= 0xff;
  const nameBuf = Buffer.from(name);
  const method = deflate ? 8 : 0;
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(crc), u32(data.length), u32(size), u16(nameBuf.length), u16(0), nameBuf, data,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0x21),
    u32(crc), u32(data.length), u32(size),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBuf,
  ]);
  return Buffer.concat([
    local, central,
    u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0),
  ]);
}

test("ranged video reads verify the whole entry first and reject corrupt CRC/size", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "pae-range-integrity-"));
  process.env.COPILOT_HOME = home;
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `range-integrity-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await stopInstance(instanceId);
    await rm(home, { recursive: true, force: true });
  });

  const cache = join(home, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });
  const content = Buffer.from(Array.from({ length: 6000 }, (_, i) => (i * 13) % 251));
  const cases = [
    ["1001", "good-stored", { deflate: false }, true],
    ["1002", "good-deflated", { deflate: true }, true],
    ["1003", "bad-crc-stored", { deflate: false, crc: crc32(content) ^ 1 }, false],
    ["1004", "bad-crc-deflated", { deflate: true, crc: crc32(content) ^ 1 }, false],
    ["1005", "bad-data-stored", { deflate: false, flipDataByte: true }, false],
    ["1006", "bad-size-deflated", { deflate: true, size: 5000 }, false],
    ["1007", "bad-size-larger-deflated", { deflate: true, size: 7000 }, false],
  ];
  for (const [id, , options] of cases) {
    await writeFile(join(cache, `${id}.zip`), zipOf("v/video.webm", content, options));
    await writeFile(
      join(cache, `${id}.json`),
      JSON.stringify({
        repository: "o/r",
        artifact: { id: Number(id), name: "a" },
        entries: [{ name: "v/video.webm", kind: "video" }],
      }),
    );
  }

  for (const [id, label, options, good] of cases) {
    const url = `${server.origin}/content/${id}/v/video.webm?token=${server.token}`;
    const size = options.size ?? content.length;
    const partial = await fetch(url, { headers: { Range: "bytes=100-199" } });
    if (good) {
      assert.equal(partial.status, 206, label);
      assert.deepEqual(Buffer.from(await partial.arrayBuffer()), content.subarray(100, 200), label);
      // Seeking backwards and to the tail reuses the verified entry.
      const back = await fetch(url, { headers: { Range: "bytes=0-9" } });
      assert.deepEqual(Buffer.from(await back.arrayBuffer()), content.subarray(0, 10), label);
      const tail = await fetch(url, { headers: { Range: "bytes=-50" } });
      assert.deepEqual(Buffer.from(await tail.arrayBuffer()), content.subarray(5950), label);
    } else {
      assert.notEqual(partial.status, 206, `${label} (size ${size}) must not serve a partial range`);
      assert.ok(partial.status >= 400, label);
      const body = Buffer.from(await partial.arrayBuffer());
      assert.equal(body.includes(content.subarray(100, 140)), false, `${label} leaked bytes`);
    }
  }
});
