import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { posix } from "node:path";
import { pipeline } from "node:stream/promises";
import { createInflateRaw, inflateRaw } from "node:zlib";
import { promisify } from "node:util";
import {
  MAX_CENTRAL_DIRECTORY_BYTES,
  MAX_STREAMED_ENTRY_BYTES,
  MAX_ZIP_ENTRIES,
} from "./constants.mjs";

const inflateRawAsync = promisify(inflateRaw);
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

export async function readZipIndex(zipPath) {
  const archive = await stat(zipPath);
  if (!archive.isFile() || archive.size < 22) {
    throw new Error("Artifact is not a valid ZIP archive.");
  }

  const handle = await open(zipPath, "r");
  try {
    const tailLength = Math.min(archive.size, 65_557);
    const tailOffset = archive.size - tailLength;
    const tail = await readExactly(handle, tailLength, tailOffset);
    let eocdOffset = -1;
    for (let index = tail.length - 22; index >= 0; index--) {
      if (tail.readUInt32LE(index) === EOCD_SIGNATURE) {
        eocdOffset = index;
        break;
      }
    }
    if (eocdOffset < 0) {
      throw new Error("ZIP end-of-directory record was not found.");
    }

    const disk = tail.readUInt16LE(eocdOffset + 4);
    const centralDisk = tail.readUInt16LE(eocdOffset + 6);
    const entriesOnDisk = tail.readUInt16LE(eocdOffset + 8);
    const entryCount = tail.readUInt16LE(eocdOffset + 10);
    const centralSize = tail.readUInt32LE(eocdOffset + 12);
    const centralOffset = tail.readUInt32LE(eocdOffset + 16);
    if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
      throw new Error("Multi-disk ZIP artifacts are not supported.");
    }
    if (
      entryCount === ZIP64_U16 ||
      centralSize === ZIP64_U32 ||
      centralOffset === ZIP64_U32
    ) {
      throw new Error("ZIP64 artifacts larger than 4 GiB are not supported.");
    }
    if (entryCount > MAX_ZIP_ENTRIES) {
      throw new Error(`ZIP contains too many entries (${entryCount.toLocaleString()}).`);
    }
    if (centralSize > MAX_CENTRAL_DIRECTORY_BYTES) {
      throw new Error("ZIP central directory exceeds the 64 MiB safety limit.");
    }
    if (centralOffset + centralSize > archive.size) {
      throw new Error("ZIP central directory points outside the archive.");
    }

    const central = await readExactly(handle, centralSize, centralOffset);
    const entries = [];
    let cursor = 0;
    while (cursor < central.length) {
      if (central.length - cursor < 46 || central.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
        throw new Error("ZIP central directory is malformed.");
      }
      const flags = central.readUInt16LE(cursor + 8);
      const method = central.readUInt16LE(cursor + 10);
      const modifiedTime = central.readUInt16LE(cursor + 12);
      const modifiedDate = central.readUInt16LE(cursor + 14);
      const expectedCrc32 = central.readUInt32LE(cursor + 16);
      const compressedSize = central.readUInt32LE(cursor + 20);
      const uncompressedSize = central.readUInt32LE(cursor + 24);
      const nameLength = central.readUInt16LE(cursor + 28);
      const extraLength = central.readUInt16LE(cursor + 30);
      const commentLength = central.readUInt16LE(cursor + 32);
      const diskStart = central.readUInt16LE(cursor + 34);
      const externalAttributes = central.readUInt32LE(cursor + 38);
      const localHeaderOffset = central.readUInt32LE(cursor + 42);
      const recordLength = 46 + nameLength + extraLength + commentLength;
      if (cursor + recordLength > central.length) {
        throw new Error("ZIP central directory entry is truncated.");
      }
      if (
        compressedSize === ZIP64_U32 ||
        uncompressedSize === ZIP64_U32 ||
        localHeaderOffset === ZIP64_U32 ||
        diskStart === ZIP64_U16
      ) {
        throw new Error("ZIP64 entries are not supported.");
      }

      const rawName = decodeName(
        central.subarray(cursor + 46, cursor + 46 + nameLength),
        Boolean(flags & 0x0800),
      );
      const name = safeEntryPath(rawName);
      const unixMode = externalAttributes >>> 16;
      const directory = name.endsWith("/");
      const symlink = (unixMode & 0o170000) === 0o120000;
      const encrypted = Boolean(flags & 0x0001);
      entries.push({
        name,
        directory,
        symlink,
        encrypted,
        supported: !directory && !symlink && !encrypted && (method === 0 || method === 8),
        method,
        flags,
        crc32: expectedCrc32,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
        modifiedAt: dosDateTime(modifiedDate, modifiedTime),
      });
      cursor += recordLength;
    }
    if (entries.length !== entryCount) {
      throw new Error(
        `ZIP entry count mismatch. Expected ${entryCount}, found ${entries.length}.`,
      );
    }
    return {
      path: zipPath,
      size: archive.size,
      entries,
      totalUncompressedBytes: entries.reduce(
        (total, entry) => total + (entry.directory ? 0 : entry.uncompressedSize),
        0,
      ),
    };
  } finally {
    await handle.close();
  }
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
  const { start } = await entryDataRange(zipPath, entry);
  const handle = await open(zipPath, "r");
  let compressed;
  try {
    compressed = await readExactly(handle, entry.compressedSize, start);
  } finally {
    await handle.close();
  }
  const output = entry.method === 0 ? compressed : await inflateRawAsync(compressed);
  if (output.length !== entry.uncompressedSize) {
    throw new Error(`ZIP entry size check failed: ${entry.name}`);
  }
  if (crc32(output) !== entry.crc32) {
    throw new Error(`ZIP entry checksum failed: ${entry.name}`);
  }
  return output;
}

export async function streamZipEntry(zipPath, entry, writable, transform = null) {
  if (!entry?.supported) {
    throw new Error(`ZIP entry cannot be served: ${entry?.name ?? "unknown"}`);
  }
  if (entry.uncompressedSize > MAX_STREAMED_ENTRY_BYTES) {
    throw new Error("ZIP entry exceeds the 512 MiB streaming safety limit.");
  }
  if (entry.compressedSize === 0) {
    writable.end();
    return;
  }
  const { start, endExclusive } = await entryDataRange(zipPath, entry);
  const source = createReadStream(zipPath, { start, end: endExclusive - 1 });
  const streams = [source];
  if (entry.method !== 0) streams.push(createInflateRaw());
  if (transform) streams.push(transform);
  streams.push(writable);
  await pipeline(...streams);
}
