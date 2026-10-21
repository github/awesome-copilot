import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";

const u16 = (v) => Buffer.from(Uint16Array.of(v).buffer);
const u32 = (v) => Buffer.from(Uint32Array.of(v).buffer);

function zipOf(name, raw, deflate) {
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

test("cached video entries serve 200/206/416 with byte ranges even with legacy binary metadata", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "pae-video-http-"));
  process.env.COPILOT_HOME = home;
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `video-http-${Date.now()}`;
  const entry = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await stopInstance(instanceId);
    await rm(home, { recursive: true, force: true });
  });

  const cache = join(home, "extensions", "pr-artifact-explorer", "artifacts", "cache");
  await mkdir(cache, { recursive: true });
  const content = Buffer.from(Array.from({ length: 6000 }, (_, i) => (i * 7) % 251));
  for (const [id, deflate] of [["901", false], ["902", true]]) {
    await writeFile(join(cache, `${id}.zip`), zipOf("artifacts/video.webm", content, deflate));
    await writeFile(
      join(cache, `${id}.json`),
      JSON.stringify({
        repository: "o/r",
        artifact: { id: Number(id), name: "a" },
        entries: [{ name: "artifacts/video.webm", kind: "binary" }],
      }),
    );
  }

  for (const id of ["901", "902"]) {
    const url = `${entry.origin}/content/${id}/artifacts/video.webm?token=${entry.token}`;
    const full = await fetch(url);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("content-type"), "video/webm");
    assert.equal(full.headers.get("accept-ranges"), "bytes");
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), content);

    const part = await fetch(url, { headers: { Range: "bytes=1000-1999" } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get("content-range"), "bytes 1000-1999/6000");
    assert.deepEqual(Buffer.from(await part.arrayBuffer()), content.subarray(1000, 2000));

    const tail = await fetch(url, { headers: { Range: "bytes=-100" } });
    assert.equal(tail.status, 206);
    assert.deepEqual(Buffer.from(await tail.arrayBuffer()), content.subarray(5900));

    const bad = await fetch(url, { headers: { Range: "bytes=7000-" } });
    assert.equal(bad.status, 416);
    assert.equal(bad.headers.get("content-range"), "bytes */6000");

    const head = await fetch(url, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), "6000");
  }

  const noToken = await fetch(`${entry.origin}/content/901/artifacts/video.webm`);
  assert.equal(noToken.status, 403);
});
