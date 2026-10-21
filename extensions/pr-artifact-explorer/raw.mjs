import { Writable } from "node:stream";
import { MAX_INLINE_PREVIEW_BYTES, MAX_TRX_PREVIEW_BYTES } from "./constants.mjs";
import { getCachedEntry, readCachedEntry, streamCachedEntry, verifyCachedEntry } from "./cache.mjs";
import { isInlineTextKind, kindForPath } from "./detector.mjs";

export const RAW_HEX_PREFIX_BYTES = 16 * 1024;
export const RAW_TEXT_PREFIX_BYTES = 256 * 1024;

/** Classic offset / hex / ASCII dump. Non-printable bytes render as "."; no decoding, so no mojibake. */
export function hexDump(bytes, baseOffset = 0) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.subarray(i, i + 16);
    const hex = [...chunk].map((b) => b.toString(16).padStart(2, "0"));
    while (hex.length < 16) hex.push("  ");
    const ascii = [...chunk].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    lines.push(
      `${(baseOffset + i).toString(16).padStart(8, "0")}  ${hex.slice(0, 8).join(" ")}  ${hex.slice(8).join(" ")}  |${ascii}|`,
    );
  }
  return lines.join("\n");
}

function unsupportedReason(entry) {
  if (entry.directory) return "This entry is a directory.";
  if (entry.symlink) return "This entry is a symbolic link; its target is never followed or read.";
  if (entry.encrypted) return "This entry is encrypted, so its original bytes cannot be decoded here.";
  return `This entry uses ZIP compression method ${entry.method}, which cannot be safely decoded here.`;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Drops an incomplete trailing UTF-8 sequence so a truncated prefix still decodes strictly. */
function trimIncompleteUtf8(bytes) {
  let end = bytes.length;
  for (let back = 1; back <= 3 && end - back >= 0; back += 1) {
    const b = bytes[end - back];
    if ((b & 0xc0) === 0x80) continue;
    const need = b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
    if (need > back) end -= back;
    break;
  }
  return bytes.subarray(0, end);
}

async function readPrefix(context, length) {
  const chunks = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  });
  await verifyCachedEntry(context);
  await streamCachedEntry(context, sink, null, { start: 0, end: length - 1 });
  sink.end();
  return Buffer.concat(chunks);
}

/**
 * Builds the Raw view payload for one cached entry. Whole-entry CRC/size verification always
 * happens before any bytes are returned; large files return only a bounded, clearly partial prefix.
 */
export async function buildRawView(artifactId, entryPath) {
  const context = await getCachedEntry(artifactId, entryPath);
  const { entry } = context;
  const size = entry.uncompressedSize;
  const base = { path: entry.name, size };
  if (!entry.supported) {
    return { ...base, mode: "unsupported", supported: false, reason: unsupportedReason(entry) };
  }
  if (size === 0) {
    await verifyCachedEntry(context);
    return { ...base, mode: "empty", supported: true, truncated: false, shown: 0 };
  }

  const kind = kindForPath(entry.name);
  if (isRawTextKind(kind, entry.name)) {
    const limit = kind === "trx" ? MAX_TRX_PREVIEW_BYTES : MAX_INLINE_PREVIEW_BYTES;
    if (size <= limit) {
      const { content } = await readCachedEntry(artifactId, entryPath, limit);
      const text = decodeUtf8(content);
      if (text !== null) {
        return { ...base, mode: "text", supported: true, truncated: false, shown: size, encoding: "utf-8", content: text };
      }
      return hexResult(base, content.subarray(0, RAW_HEX_PREFIX_BYTES), size, "Not valid UTF-8; shown as bytes.");
    }
    const prefix = trimIncompleteUtf8(await readPrefix(context, RAW_TEXT_PREFIX_BYTES));
    const text = decodeUtf8(prefix);
    if (text !== null) {
      return { ...base, mode: "text", supported: true, truncated: true, shown: prefix.length, encoding: "utf-8", content: text };
    }
    return hexResult(base, prefix.subarray(0, RAW_HEX_PREFIX_BYTES), size, "Not valid UTF-8; shown as bytes.");
  }
  const prefix = size <= RAW_HEX_PREFIX_BYTES ? await readPrefix(context, size) : await readPrefix(context, RAW_HEX_PREFIX_BYTES);
  return hexResult(base, prefix, size, "Binary content; shown as bytes.");
}

function isRawTextKind(kind, name) {
  return (
    isInlineTextKind(kind) ||
    kind === "html" ||
    kind === "asciinema" ||
    String(name).toLowerCase().endsWith(".svg")
  );
}

function hexResult(base, bytes, size, encodingNote) {
  return {
    ...base,
    mode: "hex",
    supported: true,
    truncated: bytes.length < size,
    shown: bytes.length,
    encoding: "binary",
    note: encodingNote,
    content: hexDump(bytes),
  };
}
