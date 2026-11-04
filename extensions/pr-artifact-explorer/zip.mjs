import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { posix } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, Writable } from "node:stream";
import { createInflateRaw } from "node:zlib";

const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_U16 = 0xffff;
const ZIP64_U32 = 0xffffffff;

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

async function readExactly(handle, length, position) {
  const buffer = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const result = await handle.read(buffer, offset, length - offset, position + offset);
    if (result.bytesRead === 0) {
      throw new Error("ZIP archive ended unexpectedly.");
    }
    offset += result.bytesRead;
  }
  return buffer;
}

function safeEntryPath(rawName) {
  if (!rawName || rawName.includes("\0")) {
    throw new Error("ZIP archive contains an invalid file name.");
  }
  const slashed = rawName.replaceAll("\\", "/").replace(/^\.\/+/, "");
  const normalized = posix.normalize(slashed);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error(`ZIP archive contains an unsafe path: ${rawName}`);
  }
  if (normalized.length > 2_048) {
    throw new Error("ZIP archive contains an excessively long file name.");
  }
  return normalized;
}

function dosDateTime(date, time) {
  if (!date) return null;
  const year = 1980 + ((date >> 9) & 0x7f);
  const month = (date >> 5) & 0x0f;
  const day = date & 0x1f;
  const hour = (time >> 11) & 0x1f;
  const minute = (time >> 5) & 0x3f;
  const second = (time & 0x1f) * 2;
  const value = new Date(Date.UTC(year, Math.max(0, month - 1), day, hour, minute, second));
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function decodeName(buffer, utf8) {
  // GitHub-generated artifacts use UTF-8. For legacy archives, decoding as
  // latin1 preserves a stable byte-for-byte lookup instead of replacing bytes.
  return buffer.toString(utf8 ? "utf8" : "latin1");
}

function safeNumber(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`ZIP64 ${label} exceeds the supported range.`);
  }
  return Number(value);
}

function applyZip64Extra(extra, fields) {
  let cursor = 0;
  while (cursor + 4 <= extra.length) {
    const id = extra.readUInt16LE(cursor);
    const size = extra.readUInt16LE(cursor + 2);
    const end = cursor + 4 + size;
    if (end > extra.length) throw new Error("ZIP extra field is truncated.");
    if (id === 0x0001) {
      let position = cursor + 4;
      const take = (label) => {
        if (position + 8 > end) {
          throw new Error(`ZIP64 extra field is missing the ${label}.`);
        }
        const value = safeNumber(extra.readBigUInt64LE(position), label);
        position += 8;
        return value;
      };
      if (fields.uncompressedSize === ZIP64_U32) fields.uncompressedSize = take("uncompressed size");
      if (fields.compressedSize === ZIP64_U32) fields.compressedSize = take("compressed size");
      if (fields.localHeaderOffset === ZIP64_U32) fields.localHeaderOffset = take("local header offset");
      return;
    }
    cursor = end;
  }
  if (
    fields.uncompressedSize === ZIP64_U32 ||
    fields.compressedSize === ZIP64_U32 ||
    fields.localHeaderOffset === ZIP64_U32
  ) {
    throw new Error("ZIP64 entry is missing its extended information.");
  }
}

async function locateDirectory(handle, archiveSize) {
  const tailLength = Math.min(archiveSize, 65_557);
  const tailOffset = archiveSize - tailLength;
  const tail = await readExactly(handle, tailLength, tailOffset);
  let eocdOffset = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (
      tail.readUInt32LE(index) === EOCD_SIGNATURE &&
      index + 22 + tail.readUInt16LE(index + 20) === tail.length
    ) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end-of-directory record was not found.");

  const disk = tail.readUInt16LE(eocdOffset + 4);
  const centralDisk = tail.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = tail.readUInt16LE(eocdOffset + 8);
  let entryCount = tail.readUInt16LE(eocdOffset + 10);
  let centralSize = tail.readUInt32LE(eocdOffset + 12);
  let centralOffset = tail.readUInt32LE(eocdOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("Multi-disk ZIP artifacts are not supported.");
  }
  let zip64 = false;
  if (entryCount === ZIP64_U16 || centralSize === ZIP64_U32 || centralOffset === ZIP64_U32) {
    zip64 = true;
    const locatorOffset = tailOffset + eocdOffset - 20;
    if (locatorOffset < 0) throw new Error("ZIP64 locator was not found.");
    const locator = await readExactly(handle, 20, locatorOffset);
    if (locator.readUInt32LE(0) !== ZIP64_LOCATOR_SIGNATURE) {
      throw new Error("ZIP64 locator was not found.");
    }
    if (locator.readUInt32LE(4) !== 0 || locator.readUInt32LE(16) !== 1) {
      throw new Error("Multi-disk ZIP artifacts are not supported.");
    }
    const recordOffset = safeNumber(locator.readBigUInt64LE(8), "directory offset");
    if (recordOffset + 56 > archiveSize) {
      throw new Error("ZIP64 end-of-directory record points outside the archive.");
    }
    const record = await readExactly(handle, 56, recordOffset);
    if (record.readUInt32LE(0) !== ZIP64_EOCD_SIGNATURE) {
      throw new Error("ZIP64 end-of-directory record is malformed.");
    }
    if (record.readUInt32LE(16) !== 0 || record.readUInt32LE(20) !== 0) {
      throw new Error("Multi-disk ZIP artifacts are not supported.");
    }
    const onDisk = safeNumber(record.readBigUInt64LE(24), "entry count");
    entryCount = safeNumber(record.readBigUInt64LE(32), "entry count");
    if (onDisk !== entryCount) throw new Error("Multi-disk ZIP artifacts are not supported.");
    centralSize = safeNumber(record.readBigUInt64LE(40), "directory size");
    centralOffset = safeNumber(record.readBigUInt64LE(48), "directory offset");
  }
  if (centralOffset + centralSize > archiveSize) {
    throw new Error("ZIP central directory points outside the archive.");
  }
  return { entryCount, centralSize, centralOffset, zip64 };
}

/**
 * Reads the central directory in bounded chunks. Entry-count and directory-size
 * thresholds are soft: crossing one reports through `onSoftLimit` and keeps
 * indexing. Only absolute memory guards and malformed data are fatal.
 */
export async function readZipIndex(zipPath, { onSoftLimit = null, softLimits = {}, onProgress = null } = {}) {
  const archive = await stat(zipPath);
  if (!archive.isFile() || archive.size < 22) {
    throw new Error("Artifact is not a valid ZIP archive.");
  }
  const handle = await open(zipPath, "r");
  try {
    const { entryCount, centralSize, centralOffset, zip64 } = await locateDirectory(handle, archive.size);
    // Every central record is at least 46 bytes, so the declared count must fit the
    // declared directory; this is an integrity check, not a size ceiling.
    if (entryCount * 46 > centralSize) {
      throw new Error(`ZIP entry count mismatch. ${entryCount} entries cannot fit in ${centralSize} directory bytes.`);
    }
    const warned = new Set();
    const softCheck = (kind, current) => {
      const limit = typeof softLimits[kind] === "function" ? softLimits[kind]() : softLimits[kind];
      if (limit != null && current > limit && !warned.has(kind)) {
        warned.add(kind);
        onSoftLimit?.(kind, current);
      } else if (limit != null && current > limit) {
        onSoftLimit?.(kind, current, { repeat: true });
      }
    };
    softCheck("zipEntries", entryCount);
    softCheck("centralDirectoryBytes", centralSize);

    const entries = [];
    let totalUncompressedBytes = 0;
    let pending = Buffer.alloc(0);
    let consumed = 0;
    let trailing = false;
    while (true) {
      while (pending.length >= 46) {
        if (entries.length >= entryCount) {
          trailing = true;
          break;
        }
        if (pending.readUInt32LE(0) !== CENTRAL_SIGNATURE) {
          throw new Error("ZIP central directory is malformed.");
        }
        const nameLength = pending.readUInt16LE(28);
        const extraLength = pending.readUInt16LE(30);
        const commentLength = pending.readUInt16LE(32);
        const recordLength = 46 + nameLength + extraLength + commentLength;
        if (pending.length < recordLength) break;
        const entry = parseCentralRecord(pending.subarray(0, recordLength), nameLength, extraLength);
        entries.push(entry);
        if (!entry.directory) totalUncompressedBytes += entry.uncompressedSize;
        pending = pending.subarray(recordLength);
        if (entries.length % 5_000 === 0) {
          softCheck("zipEntries", entryCount);
          onProgress?.({ entries: entries.length, entryCount });
        }
      }
      if (trailing) break;
      if (consumed >= centralSize) break;
      const length = Math.min(1024 * 1024, centralSize - consumed);
      const chunk = await readExactly(handle, length, centralOffset + consumed);
      consumed += length;
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    }
    if (trailing || pending.length > 0 || entries.length !== entryCount) {
      throw new Error(
        `ZIP entry count mismatch. Expected ${entryCount}, found ${entries.length}${trailing || pending.length ? " with trailing directory data" : ""}.`,
      );
    }
    return { path: zipPath, size: archive.size, entries, totalUncompressedBytes, zip64 };
  } finally {
    await handle.close();
  }
}

function parseCentralRecord(record, nameLength, extraLength) {
  const flags = record.readUInt16LE(8);
  const method = record.readUInt16LE(10);
  const modifiedTime = record.readUInt16LE(12);
  const modifiedDate = record.readUInt16LE(14);
  const fields = {
    compressedSize: record.readUInt32LE(20),
    uncompressedSize: record.readUInt32LE(24),
    localHeaderOffset: record.readUInt32LE(42),
  };
  const diskStart = record.readUInt16LE(34);
  const externalAttributes = record.readUInt32LE(38);
  if (diskStart !== 0 && diskStart !== ZIP64_U16) {
    throw new Error("Multi-disk ZIP artifacts are not supported.");
  }
  const extraStart = 46 + nameLength;
  applyZip64Extra(record.subarray(extraStart, extraStart + extraLength), fields);
  const name = safeEntryPath(
    decodeName(record.subarray(46, 46 + nameLength), Boolean(flags & 0x0800)),
  );
  const unixMode = externalAttributes >>> 16;
  const directory = name.endsWith("/");
  const symlink = (unixMode & 0o170000) === 0o120000;
  const encrypted = Boolean(flags & 0x0001);
  return {
    name,
    directory,
    symlink,
    encrypted,
    supported: !directory && !symlink && !encrypted && (method === 0 || method === 8),
    method,
    flags,
    crc32: record.readUInt32LE(16),
    compressedSize: fields.compressedSize,
    uncompressedSize: fields.uncompressedSize,
    localHeaderOffset: fields.localHeaderOffset,
    modifiedAt: dosDateTime(modifiedDate, modifiedTime),
  };
}

async function entryDataRange(zipPath, entry) {
  const handle = await open(zipPath, "r");
  try {
    const header = await readExactly(handle, 30, entry.localHeaderOffset);
    if (header.readUInt32LE(0) !== LOCAL_SIGNATURE) {
      throw new Error(`ZIP local header is missing for ${entry.name}.`);
    }
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const start = entry.localHeaderOffset + 30 + nameLength + extraLength;
    const endExclusive = start + entry.compressedSize;
    const archive = await stat(zipPath);
    if (endExclusive > archive.size) {
      throw new Error(`ZIP entry data points outside the archive: ${entry.name}`);
    }
    return { start, endExclusive };
  } finally {
    await handle.close();
  }
}

export function findZipEntry(index, requestedName) {
  const normalized = safeEntryPath(String(requestedName ?? ""));
  return index.entries.find((entry) => entry.name === normalized) ?? null;
}

export async function readZipEntry(zipPath, entry, maxBytes) {
  if (!entry?.supported) {
    throw new Error(`ZIP entry cannot be previewed: ${entry?.name ?? "unknown"}`);
  }
  if (entry.uncompressedSize > maxBytes) {
    throw new Error(
      `ZIP entry is too large for an inline preview (${entry.uncompressedSize.toLocaleString()} bytes).`,
    );
  }
  // Deflate never inflates data by more than a small fraction, so a compressed
  // size far above the inline limit is inconsistent with the declared size.
  if (entry.compressedSize > maxBytes + 1024 * 1024) {
    throw new Error(`ZIP entry compressed size is inconsistent with its declared size: ${entry.name}`);
  }
  const { start } = await entryDataRange(zipPath, entry);
  const handle = await open(zipPath, "r");
  let compressed;
  try {
    compressed = await readExactly(handle, entry.compressedSize, start);
  } finally {
    await handle.close();
  }
  let output;
  if (entry.method === 0) {
    output = compressed;
  } else {
    const cap = entry.uncompressedSize;
    output = await new Promise((resolve, reject) => {
      const inflate = createInflateRaw();
      const chunks = [];
      let total = 0;
      inflate.on("data", (chunk) => {
        total += chunk.length;
        if (total > cap) {
          inflate.destroy(new Error(`ZIP entry decompressed past declared size: ${entry.name}`));
          return;
        }
        chunks.push(chunk);
      });
      inflate.once("end", () => resolve(Buffer.concat(chunks)));
      inflate.once("error", reject);
      inflate.end(compressed);
    });
  }
  if (output.length !== entry.uncompressedSize) {
    throw new Error(`ZIP entry size check failed: ${entry.name}`);
  }
  if (crc32(output) !== entry.crc32) {
    throw new Error(`ZIP entry checksum failed: ${entry.name}`);
  }
  return output;
}

function createVerifyTransform(entry, onBytes = null) {
  const cap = entry.uncompressedSize;
  let total = 0;
  let crcValue = 0xffffffff;
  return new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      if (total > cap) {
        callback(new Error(`ZIP entry decompressed past declared size: ${entry.name}`));
        return;
      }
      onBytes?.(total);
      for (const byte of chunk) {
        crcValue = crcTable[(crcValue ^ byte) & 0xff] ^ (crcValue >>> 8);
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (total !== entry.uncompressedSize) {
        callback(new Error(`ZIP entry size check failed: ${entry.name}`));
        return;
      }
      const actual = (crcValue ^ 0xffffffff) >>> 0;
      if (actual !== entry.crc32) {
        callback(new Error(`ZIP entry checksum failed: ${entry.name}`));
        return;
      }
      callback();
    },
  });
}

/**
 * Streams one entry. `onProgress(bytes)` reports live decompressed bytes per
 * chunk, and `onSoftLimit` fires (never aborting the stream) whenever the live
 * count is above the current soft limit. `signal` is the only way to stop early.
 */
export async function streamZipEntry(
  zipPath,
  entry,
  writable,
  transform = null,
  { onSoftLimit = null, softLimit = null, onProgress = null, signal = null } = {},
) {
  if (!entry?.supported) {
    throw new Error(`ZIP entry cannot be served: ${entry?.name ?? "unknown"}`);
  }
  const onBytes = (bytes) => {
    onProgress?.(bytes);
    const limit = typeof softLimit === "function" ? softLimit() : softLimit;
    if (limit != null && bytes > limit) onSoftLimit?.("streamedEntryBytes", bytes, entry.name);
  };
  if (entry.compressedSize === 0) {
    writable.end();
    return;
  }
  const { start, endExclusive } = await entryDataRange(zipPath, entry);
  const source = createReadStream(zipPath, { start, end: endExclusive - 1 });
  const streams = [source];
  if (entry.method !== 0) streams.push(createInflateRaw());
  streams.push(createVerifyTransform(entry, onBytes));
  if (transform) streams.push(transform);
  streams.push(writable);
  await pipeline(...streams, signal ? { signal } : {});
}

/**
 * Verifies the whole entry (declared size and CRC-32) with bounded streaming and no
 * buffering. Throws on any mismatch. Soft limits report but never stop the stream.
 */
export async function verifyZipEntry(
  zipPath,
  entry,
  { onSoftLimit = null, softLimit = null, onProgress = null, signal = null } = {},
) {
  if (!entry?.supported) {
    throw new Error(`ZIP entry cannot be served: ${entry?.name ?? "unknown"}`);
  }
  const onBytes = (bytes) => {
    onProgress?.(bytes);
    const limit = typeof softLimit === "function" ? softLimit() : softLimit;
    if (limit != null && bytes > limit) onSoftLimit?.("streamedEntryBytes", bytes, entry.name);
  };
  if (entry.compressedSize === 0) {
    if (entry.uncompressedSize !== 0 || entry.crc32 !== 0) {
      throw new Error(`ZIP entry size check failed: ${entry.name}`);
    }
    return;
  }
  const { start, endExclusive } = await entryDataRange(zipPath, entry);
  const streams = [createReadStream(zipPath, { start, end: endExclusive - 1 })];
  if (entry.method !== 0) streams.push(createInflateRaw());
  streams.push(createVerifyTransform(entry, onBytes));
  streams.push(new Writable({ write(_chunk, _encoding, done) { done(); } }));
  await pipeline(...streams, signal ? { signal } : {});
}

/**
 * Streams the inclusive byte range [start, end] of an entry's decompressed content
 * (for HTTP Range / media seeking). Stored entries seek directly inside the ZIP;
 * deflated entries inflate and discard the leading bytes. A partial read cannot check the
 * whole-entry CRC itself, so callers must run `verifyZipEntry` once first (the cache layer
 * does, and remembers the result); path, host and token checks happen before this is called.
 */
export async function streamZipEntryRange(
  zipPath,
  entry,
  writable,
  { start, end },
  { onProgress = null, onSoftLimit = null, softLimit = null, signal = null } = {},
) {
  if (!entry?.supported) {
    throw new Error(`ZIP entry cannot be served: ${entry?.name ?? "unknown"}`);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= entry.uncompressedSize) {
    throw new Error(`Invalid byte range for ${entry.name}.`);
  }
  const { start: dataStart, endExclusive } = await entryDataRange(zipPath, entry);
  const stored = entry.method === 0;
  const source = stored
    ? createReadStream(zipPath, { start: dataStart + start, end: dataStart + end })
    : createReadStream(zipPath, { start: dataStart, end: endExclusive - 1 });
  const inflate = stored ? null : createInflateRaw();
  let failure = null;
  source.once("error", (error) => {
    failure = error;
    inflate?.destroy(error);
  });
  if (inflate) source.pipe(inflate);
  const readable = inflate ?? source;
  const onAbort = () => {
    failure = signal.reason ?? new Error("Aborted");
    readable.destroy(failure);
    source.destroy();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  let position = stored ? start : 0;
  let closed = false;
  writable.once("close", () => {
    closed = true;
    readable.destroy();
    source.destroy();
  });
  try {
    for await (const chunk of readable) {
      if (closed) break;
      const chunkStart = position;
      position += chunk.length;
      const limit = typeof softLimit === "function" ? softLimit() : softLimit;
      onProgress?.(Math.min(position, end + 1));
      if (limit != null && position > limit) onSoftLimit?.("streamedEntryBytes", position, entry.name);
      if (position - 1 < start) continue;
      const slice = chunk.subarray(Math.max(start, chunkStart) - chunkStart, Math.min(end + 1, position) - chunkStart);
      if (slice.length && !writable.write(slice)) {
        await new Promise((resolve) => {
          const done = () => {
            writable.off("drain", done);
            writable.off("close", done);
            resolve();
          };
          writable.once("drain", done);
          writable.once("close", done);
        });
      }
      if (position - 1 >= end) break;
    }
  } catch (error) {
    if (!closed) throw failure ?? error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    readable.destroy();
    source.destroy();
  }
  if (failure && !closed) throw failure;
  if (!closed) writable.end();
}

export async function readEntryPrefix(zipPath, entry, maxBytes) {
  if (!entry?.supported) return null;
  if (entry.uncompressedSize === 0) return Buffer.alloc(0);
  const { start } = await entryDataRange(zipPath, entry);
  if (entry.method === 0) {
    const readBytes = Math.min(maxBytes, entry.compressedSize);
    const handle = await open(zipPath, "r");
    try {
      return await readExactly(handle, readBytes, start);
    } finally {
      await handle.close();
    }
  }
  // Stream the compressed bytes so memory stays bounded regardless of entry size.
  return new Promise((resolve, reject) => {
    const source = createReadStream(zipPath, { start, end: start + entry.compressedSize - 1 });
    const inflate = createInflateRaw();
    const chunks = [];
    let total = 0;
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      source.destroy();
      inflate.destroy();
      if (error) reject(error);
      else resolve(Buffer.concat(chunks));
    };
    inflate.on("data", (chunk) => {
      if (done) return;
      const slice = maxBytes - total < chunk.length ? chunk.subarray(0, maxBytes - total) : chunk;
      chunks.push(slice);
      total += slice.length;
      if (total >= maxBytes) finish();
    });
    inflate.once("end", () => finish());
    inflate.once("error", finish);
    source.once("error", finish);
    source.pipe(inflate);
  });
}