#!/usr/bin/env node

// Canvas extension review evidence and smoke test.
//
// Static checks never execute extension code: modules are compiled (parsed) with
// node:vm but never linked or evaluated. The smoke test materializes affected
// plugins into a temporary copy of the repository with the real materializer
// and, when the Copilot CLI is available, installs them from an ephemeral local
// marketplace under an isolated COPILOT_HOME.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { builtinModules } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.join(path.dirname(__filename), "..");

export const REPORT_MARKER = "<!-- canvas-smoke-test -->";
// Lenient defaults so every preview already on main passes; raise them via
// CANVAS_PREVIEW_MIN_WIDTH / CANVAS_PREVIEW_MIN_HEIGHT once older previews are refreshed.
export const DEFAULT_MIN_PREVIEW_WIDTH = 400;
export const DEFAULT_MIN_PREVIEW_HEIGHT = 160;
export const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_PNG_DIMENSION = 16384;
// Upper bound on decompressed image data so a small, highly compressed PNG
// cannot exhaust runner memory (8192×8192 RGBA8 is ~256 MiB).
export const MAX_PNG_DECODED_BYTES = 256 * 1024 * 1024;

const COPILOT_NAMESPACE = "com.github.copilot";
const AWESOME_COPILOT_NAMESPACE = "com.github.awesome-copilot";
const HOST_PROVIDED_PACKAGES = ["@github/copilot-sdk"];
const MODULE_EXTENSIONS = new Set([".mjs", ".js", ".cjs"]);
const IGNORED_DIRECTORIES = new Set([".git"]);

const NATIVE_BINARY_EXTENSIONS = new Set([
  ".a", ".app", ".bin", ".class", ".com", ".deb", ".dll", ".dmg", ".dylib", ".exe", ".jar",
  ".lib", ".msi", ".node", ".o", ".pyc", ".rpm", ".so", ".sys", ".wasm",
]);
const SCRIPT_EXTENSIONS = new Set([
  ".bash", ".bat", ".cmd", ".command", ".fish", ".pl", ".ps1", ".psm1", ".py", ".rb", ".sh", ".vbs", ".zsh",
]);
const ALLOWED_BINARY_EXTENSIONS = new Set([
  ".aac", ".apng", ".avif", ".bmp", ".flac", ".gif", ".ico", ".jpeg", ".jpg", ".m4a", ".mp3", ".mp4",
  ".oga", ".ogg", ".opus", ".otf", ".png", ".ttf", ".wav", ".webm", ".webp", ".woff", ".woff2",
]);

const BUILTIN_CAPABILITIES = [
  { modules: ["child_process"], label: "Spawns processes (node:child_process)" },
  { modules: ["fs", "fs/promises"], label: "File system access (node:fs)" },
  { modules: ["http", "https", "http2", "net", "tls", "dgram"], label: "Network sockets / local server (node:http, node:net, ...)" },
  { modules: ["worker_threads", "cluster"], label: "Worker threads / child processes (node:worker_threads, node:cluster)" },
  { modules: ["vm"], label: "Dynamic code evaluation (node:vm)" },
  { modules: ["os"], label: "Host information (node:os)" },
];
const SOURCE_CAPABILITIES = [
  { pattern: /\bfetch\s*\(/, label: "Outbound HTTP requests (fetch)" },
  { pattern: /\bprocess\.env\b/, label: "Reads environment variables (process.env)" },
  { pattern: /\beval\s*\(|\bnew\s+Function\s*\(/, label: "Dynamic code evaluation (eval / new Function)" },
  { pattern: /\bnew\s+WebSocket\s*\(/, label: "WebSocket connections" },
];

const NODE_BUILTINS = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function readJson(filePath, { root } = {}) {
  try {
    const read = readRegularFile(filePath, { root });
    if (read.error) return { error: `${path.basename(filePath)} ${read.error}` };
    return { value: JSON.parse(read.text) };
  } catch (error) {
    return { error: error.message };
  }
}

export const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Read a file without following symlinks, refusing devices, FIFOs, oversized
 * files, and anything that resolves outside `root`. Returns { text } or { error }.
 */
export function readRegularFile(filePath, { root, maxBytes = MAX_TEXT_FILE_BYTES } = {}) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    return { error: `cannot be read (${error.code ?? error.message})`, missing: error.code === "ENOENT" };
  }
  if (stat.isSymbolicLink()) return { error: "is a symbolic link" };
  if (!stat.isFile()) return { error: "is not a regular file" };
  if (root && !isInside(fs.realpathSync(root), fs.realpathSync(filePath))) return { error: "resolves outside its directory" };
  if (stat.size > maxBytes) return { error: `is ${formatBytes(stat.size)}; the limit is ${formatBytes(maxBytes)}` };
  const fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < stat.size) {
      const bytesRead = fs.readSync(fd, buffer, offset, stat.size - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return { text: buffer.subarray(0, offset).toString("utf8") };
  } finally {
    fs.closeSync(fd);
  }
}

/** Why an extension directory cannot be inspected safely, or null. */
function extensionDirProblem(extensionDir) {
  const stat = fs.lstatSync(extensionDir, { throwIfNoEntry: false });
  if (!stat) return "extension directory is missing";
  if (stat.isSymbolicLink()) return "extension directory must not be a symbolic link";
  if (!stat.isDirectory()) return "extension path is not a directory";
  return null;
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

/**
 * Classify a path reference found in a manifest or module specifier.
 * Returns null when safe, otherwise a short reason.
 */
export function unsafePathReason(reference) {
  if (typeof reference !== "string" || reference.length === 0) {
    return null;
  }
  if (/^[A-Za-z]:[\\/]/.test(reference) || reference.startsWith("\\\\")) {
    return "absolute Windows path";
  }
  if (reference.startsWith("/")) {
    return "absolute path";
  }
  if (/^file:/i.test(reference)) {
    return "file: URL";
  }
  const segments = reference.split(/[\\/]+/);
  if (segments.includes("..")) {
    return "parent-directory (..) traversal";
  }
  return null;
}

function looksLikePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return false;
  if (/^file:/i.test(value)) return true;
  if (/\s/.test(value) || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false;
  return /^(\.{1,2}[\\/]|\/|[A-Za-z]:[\\/]|\\\\)/.test(value) || /(^|[\\/])\.\.([\\/]|$)/.test(value);
}

/**
 * Walk a parsed manifest and report path-like string values that are absolute
 * or traverse outside the containing directory.
 */
export function findUnsafeManifestPaths(value, trail = "$") {
  const findings = [];
  if (typeof value === "string") {
    if (looksLikePath(value)) {
      const reason = unsafePathReason(value);
      if (reason) findings.push({ field: trail, value, reason });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...findUnsafeManifestPaths(item, `${trail}[${index}]`)));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      findings.push(...findUnsafeManifestPaths(item, `${trail}.${key}`));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// PNG inspection
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const PNG_VALID_DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
const ADAM7_PASSES = [
  [0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2],
];

let crcTable = null;
function crc32(buffer) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buffer) >>> 0;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function expectedPngDataLength(width, height, bitsPerPixel, interlace) {
  const rowBytes = (w) => Math.ceil((w * bitsPerPixel) / 8);
  if (interlace === 0) {
    return height * (rowBytes(width) + 1);
  }
  let total = 0;
  for (const [xStart, yStart, xStep, yStep] of ADAM7_PASSES) {
    const passWidth = Math.ceil((width - xStart) / xStep);
    const passHeight = Math.ceil((height - yStart) / yStep);
    if (passWidth > 0 && passHeight > 0) total += passHeight * (rowBytes(passWidth) + 1);
  }
  return total;
}

/**
 * Structurally decode a PNG: signature, chunk CRCs, IHDR, PLTE/IDAT/IEND
 * ordering, and full zlib inflation of image data with a size check.
 */
export function inspectPng(buffer) {
  const result = { ok: false, errors: [], width: 0, height: 0, animated: false };
  if (!Buffer.isBuffer(buffer) || buffer.length < PNG_SIGNATURE.length + 12) {
    result.errors.push("file is too small to be a PNG");
    return result;
  }
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    result.errors.push("missing PNG signature (file is not a PNG)");
    return result;
  }

  let offset = 8;
  let header = null;
  let sawPalette = false;
  let sawEnd = false;
  const idat = [];
  let chunkIndex = 0;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      result.errors.push("truncated chunk header");
      return result;
    }
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      result.errors.push(`truncated ${type} chunk`);
      return result;
    }
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCrc) {
      result.errors.push(`CRC mismatch in ${type} chunk`);
      return result;
    }
    const data = buffer.subarray(dataStart, dataEnd);

    if (chunkIndex === 0 && type !== "IHDR") {
      result.errors.push("first chunk must be IHDR");
      return result;
    }
    if (type === "IHDR") {
      if (header) {
        result.errors.push("duplicate IHDR chunk");
        return result;
      }
      if (length !== 13) {
        result.errors.push("IHDR chunk has invalid length");
        return result;
      }
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "PLTE") {
      sawPalette = true;
    } else if (type === "acTL") {
      result.animated = true;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      if (length !== 0) {
        result.errors.push("IEND chunk has invalid length");
        return result;
      }
      sawEnd = true;
      offset = dataEnd + 4;
      if (offset !== buffer.length) {
        result.errors.push("data appears after the IEND chunk");
        return result;
      }
      break;
    }
    offset = dataEnd + 4;
    chunkIndex++;
  }

  if (!header) {
    result.errors.push("missing IHDR chunk");
    return result;
  }
  Object.assign(result, {
    width: header.width,
    height: header.height,
    bitDepth: header.bitDepth,
    colorType: header.colorType,
    interlaced: header.interlace === 1,
  });

  if (header.width === 0 || header.height === 0) result.errors.push("image has zero width or height");
  if (header.width > MAX_PNG_DIMENSION || header.height > MAX_PNG_DIMENSION) {
    result.errors.push(`image dimensions exceed ${MAX_PNG_DIMENSION}px`);
  }
  if (!(header.colorType in PNG_CHANNELS) || !PNG_VALID_DEPTHS[header.colorType].includes(header.bitDepth)) {
    result.errors.push(`invalid color type/bit depth (${header.colorType}/${header.bitDepth})`);
  }
  if (header.compression !== 0 || header.filter !== 0 || header.interlace > 1) {
    result.errors.push("unsupported compression, filter, or interlace method");
  }
  if (header.colorType === 3 && !sawPalette) result.errors.push("palette image is missing PLTE chunk");
  if (idat.length === 0) result.errors.push("missing IDAT image data");
  if (!sawEnd) result.errors.push("missing IEND chunk");
  if (result.errors.length > 0) return result;

  const bitsPerPixel = PNG_CHANNELS[header.colorType] * header.bitDepth;
  const expected = expectedPngDataLength(header.width, header.height, bitsPerPixel, header.interlace);
  if (expected > MAX_PNG_DECODED_BYTES) {
    result.errors.push(`decoded image data would be ${formatBytes(expected)}; maximum is ${formatBytes(MAX_PNG_DECODED_BYTES)}`);
    return result;
  }
  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: expected });
  } catch (error) {
    result.errors.push(error.code === "ERR_BUFFER_TOO_LARGE"
      ? "image data is larger than the IHDR dimensions allow"
      : `image data failed to decompress: ${error.message}`);
    return result;
  }
  if (inflated.length < expected) {
    result.errors.push(`image data is truncated (${inflated.length} of ${expected} bytes)`);
    return result;
  }
  if (header.interlace === 0) {
    const stride = Math.ceil((header.width * bitsPerPixel) / 8) + 1;
    for (let row = 0; row < header.height; row++) {
      if (inflated[row * stride] > 4) {
        result.errors.push(`invalid scanline filter type on row ${row}`);
        return result;
      }
    }
  }

  result.ok = true;
  return result;
}

// ---------------------------------------------------------------------------
// Module parsing and import validation
// ---------------------------------------------------------------------------

const CHILD_PARSER = `
const vm = require("vm");
const source = require("fs").readFileSync(0, "utf8");
try {
  const mod = new vm.SourceTextModule(source, { identifier: process.argv[1] || "module.mjs" });
  const specifiers = mod.moduleRequests ? mod.moduleRequests.map((r) => r.specifier) : mod.dependencySpecifiers;
  process.stdout.write(JSON.stringify({ ok: true, specifiers: [...specifiers] }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error && error.message || error) }));
}
`;

function staticSpecifiersInProcess(source, identifier) {
  const mod = new vm.SourceTextModule(source, { identifier });
  const specifiers = mod.moduleRequests ? mod.moduleRequests.map((request) => request.specifier) : mod.dependencySpecifiers;
  return [...specifiers];
}

/**
 * Compile an ES module without linking or evaluating it and return its static
 * import specifiers. Falls back to a child process when vm modules are not
 * enabled in the current process.
 */
export function parseEsModule(source, identifier = "module.mjs") {
  if (typeof vm.SourceTextModule === "function") {
    try {
      return { ok: true, specifiers: staticSpecifiersInProcess(source, identifier) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  const child = spawnSync(
    process.execPath,
    ["--experimental-vm-modules", "--no-warnings", "-e", CHILD_PARSER, identifier],
    { input: source, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  try {
    return JSON.parse(child.stdout);
  } catch {
    return { ok: false, error: `parser failed: ${(child.stderr || child.error?.message || "unknown error").trim()}` };
  }
}

/**
 * Compile a CommonJS script without running it and return its literal
 * require() specifiers.
 */
export function parseCommonJs(source, identifier = "module.cjs") {
  try {
    vm.compileFunction(source.replace(/^#!.*/, ""), ["exports", "require", "module", "__filename", "__dirname"], { filename: identifier });
    return { ok: true, specifiers: findRequireSpecifiers(source) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

const REGEX_PREFIX_CHARS = new Set("(,=:[!&|?{};+-*%<>~^".split(""));
const REGEX_PREFIX_WORDS = new Set(["return", "typeof", "instanceof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await"]);
const IDENTIFIER_CHAR = /[\w$]/;

/**
 * Blank out comments while leaving string, template, and regex literals
 * intact, so `"a//b"` or `/\/\*x/` cannot hide the code that follows.
 * With `maskLiterals`, literal contents are blanked too (delimiters kept), so
 * call-shaped text inside data is not mistaken for code.
 * Offsets and line breaks are preserved.
 */
export function stripComments(source, { maskLiterals = false } = {}) {
  const n = source.length;
  const blank = (text) => text.replace(/[^\n]/g, " ");
  // Keep the first `open` and last `close` characters of a literal, masking the rest when asked.
  const literal = (text, open, close) =>
    maskLiterals && text.length > open + close
      ? text.slice(0, open) + blank(text.slice(open, text.length - close)) + text.slice(text.length - close)
      : text;
  const templateStack = [];
  let out = "";
  let i = 0;
  let braceDepth = 0;
  let lastSignificant = "";
  let lastWord = "";

  const scanTemplate = (start) => {
    let j = start;
    while (j < n) {
      const c = source[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") { j++; out += literal(source.slice(start, j), 0, 1); lastSignificant = "`"; lastWord = ""; return j; }
      if (c === "$" && source[j + 1] === "{") {
        j += 2;
        templateStack.push(braceDepth);
        braceDepth++;
        out += literal(source.slice(start, j), 0, 2);
        lastSignificant = "{"; lastWord = "";
        return j;
      }
      j++;
    }
    out += literal(source.slice(start, n), 0, 0);
    return n;
  };

  const regexAllowed = () => {
    if (lastSignificant === "") return true;
    if (IDENTIFIER_CHAR.test(lastSignificant)) return REGEX_PREFIX_WORDS.has(lastWord);
    return REGEX_PREFIX_CHARS.has(lastSignificant);
  };

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      let j = source.indexOf("\n", i);
      if (j === -1) j = n;
      out += blank(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === "/" && next === "*") {
      let j = source.indexOf("*/", i + 2);
      j = j === -1 ? n : j + 2;
      out += blank(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n && source[j] !== ch && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      j = Math.min(j + 1, n);
      out += literal(source.slice(i, j), 1, source[j - 1] === ch && j - 1 > i ? 1 : 0);
      i = j;
      lastSignificant = ch; lastWord = "";
      continue;
    }
    if (ch === "`") {
      out += ch;
      i = scanTemplate(i + 1);
      continue;
    }
    if (ch === "/" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && source[j] !== "\n") {
        const c = source[j];
        if (c === "\\") { j += 2; continue; }
        if (inClass) { if (c === "]") inClass = false; }
        else if (c === "[") inClass = true;
        else if (c === "/") { j++; break; }
        j++;
      }
      while (j < n && /[a-z]/i.test(source[j])) j++;
      out += literal(source.slice(i, j), 1, 0);
      i = j;
      lastSignificant = "a"; lastWord = "";
      continue;
    }
    if (ch === "{") braceDepth++;
    if (ch === "}") {
      braceDepth--;
      if (templateStack.length && templateStack[templateStack.length - 1] === braceDepth) {
        templateStack.pop();
        out += ch;
        i = scanTemplate(i + 1);
        continue;
      }
    }
    if ((ch === "+" || ch === "-") && next === ch) {
      // `x++ / y` is division, `++x / y` is not: a postfix update leaves an operand behind.
      const postfix = !regexAllowed();
      out += ch + next;
      i += 2;
      lastSignificant = postfix ? ")" : ch;
      lastWord = "";
      continue;
    }
    if (IDENTIFIER_CHAR.test(ch)) {
      let j = i;
      while (j < n && IDENTIFIER_CHAR.test(source[j])) j++;
      lastWord = source.slice(i, j);
      lastSignificant = source[j - 1];
      out += lastWord;
      i = j;
      continue;
    }
    if (!/\s/.test(ch)) { lastSignificant = ch; lastWord = ""; }
    out += ch;
    i++;
  }
  return out;
}

function literalCallSpecifiers(source, pattern) {
  const specifiers = new Set();
  let match;
  // Match call shapes on masked text, then read each specifier from the original source at the same offsets.
  const text = stripComments(source, { maskLiterals: true });
  while ((match = pattern.exec(text))) {
    const open = match.index + match[0].indexOf(match[1]);
    const close = text.indexOf(match[1], open + 1);
    specifiers.add(source.slice(open + 1, close));
  }
  return [...specifiers];
}

export function findDynamicImportSpecifiers(source) {
  return literalCallSpecifiers(source, /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g);
}

export function findRequireSpecifiers(source) {
  return literalCallSpecifiers(source, /(?<![.\w$])require\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g);
}

export function findNonLiteralRuntimeLoads(source) {
  const text = stripComments(source, { maskLiterals: true });
  const loads = [];
  const patterns = [
    {
      label: "dynamic import",
      call: /\bimport\s*\(/g,
      literal: /^import\s*\(\s*(['"])\s*\1\s*\)/,
    },
    {
      label: "require",
      call: /(?<![.\w$])require\s*\(/g,
      literal: /^require\s*\(\s*(['"])\s*\1\s*\)/,
    },
  ];
  for (const { label, call, literal } of patterns) {
    let match;
    while ((match = call.exec(text))) {
      if (!literal.test(text.slice(match.index))) loads.push(label);
    }
  }
  return loads;
}

export function packageNameFromSpecifier(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * Classify an import specifier.
 * kind: relative | builtin | host | dependency | dev-dependency | internal | undeclared | unsafe | remote | data
 */
export function classifySpecifier(specifier, packageJson = {}) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return { kind: "relative" };
  }
  const unsafe = unsafePathReason(specifier);
  if (unsafe) return { kind: "unsafe", reason: unsafe };
  if (/^https?:/i.test(specifier)) return { kind: "remote" };
  if (/^data:/i.test(specifier)) return { kind: "data" };
  if (specifier.startsWith("node:")) {
    const name = specifier.slice(5);
    return NODE_BUILTINS.has(name) ? { kind: "builtin", name } : { kind: "undeclared", name: specifier };
  }
  if (specifier.startsWith("#")) {
    return packageJson.imports && Object.hasOwn(packageJson.imports, specifier)
      ? { kind: "internal" }
      : { kind: "undeclared", name: specifier };
  }
  if (NODE_BUILTINS.has(specifier)) return { kind: "builtin", name: specifier };
  const name = packageNameFromSpecifier(specifier);
  if (HOST_PROVIDED_PACKAGES.includes(name)) return { kind: "host", name };
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    if (packageJson[field] && Object.hasOwn(packageJson[field], name)) return { kind: "dependency", name };
  }
  if (packageJson.devDependencies && Object.hasOwn(packageJson.devDependencies, name)) {
    return { kind: "dev-dependency", name };
  }
  return { kind: "undeclared", name };
}

/**
 * Collect the string targets of a package.json "imports" entry, including
 * every branch of a conditions object. Returns null for shapes we cannot
 * analyze (arrays, null, or non-string leaves).
 */
export function importsAliasTargets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const targets = Object.values(value).map(importsAliasTargets);
    return targets.includes(null) ? null : targets.flat();
  }
  return null;
}

function isModuleFile(filePath, packageType) {
  const ext = path.extname(filePath);
  if (ext === ".mjs") return true;
  if (ext === ".js") return packageType === "module";
  return false;
}

// ---------------------------------------------------------------------------
// File inventory
// ---------------------------------------------------------------------------

function listFiles(rootDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      files.push({ fullPath, entry });
      if (entry.isDirectory()) walk(fullPath);
    }
  };
  walk(rootDir);
  return files;
}

function gitFileModes(rootDir, relativeDir) {
  const result = spawnSync("git", ["ls-files", "-s", "--", relativeDir], { cwd: rootDir, encoding: "utf8" });
  const modes = new Map();
  if (result.status !== 0) return modes;
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^(\d{6}) [0-9a-f]+ \d+\t(.+)$/);
    if (match) modes.set(match[2], match[1]);
  }
  return modes;
}

function hasNativeMagic(header) {
  if (header.length < 4) return null;
  if (header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46) return "ELF executable";
  if (header[0] === 0x4d && header[1] === 0x5a) return "Windows PE executable";
  const magic = header.readUInt32BE(0);
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(magic)) return "Mach-O / fat binary";
  if (header[0] === 0x00 && header[1] === 0x61 && header[2] === 0x73 && header[3] === 0x6d) return "WebAssembly module";
  return null;
}

function readHeader(filePath, size = 8192) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(size);
    const bytesRead = fs.readSync(fd, buffer, 0, size, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Inspect an extension directory for symlinks, executables, native binaries,
 * vendored dependencies, and oversized assets.
 */
export function inspectExtensionFiles(extensionDir, { rootDir = DEFAULT_ROOT, fileModes } = {}) {
  const errors = [];
  const warnings = [];
  const inventory = [];
  const relativeExtensionDir = toPosix(path.relative(rootDir, extensionDir));
  const dirProblem = extensionDirProblem(extensionDir);
  if (dirProblem) {
    errors.push(dirProblem);
    return { errors, warnings, inventory };
  }
  const modes = fileModes ?? gitFileModes(rootDir, relativeExtensionDir);

  for (const { fullPath, entry } of listFiles(extensionDir)) {
    const relative = toPosix(path.relative(extensionDir, fullPath));
    if (entry.isSymbolicLink()) {
      errors.push(`${relative}: symbolic links are not allowed in extensions`);
      continue;
    }
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") errors.push(`${relative}/: vendored node_modules must not be committed`);
      continue;
    }
    if (!entry.isFile()) continue;
    if (relative.split("/").includes("node_modules")) continue;

    const stat = fs.statSync(fullPath);
    const ext = path.extname(entry.name).toLowerCase();
    inventory.push({ path: relative, bytes: stat.size });

    const repoRelative = toPosix(path.relative(rootDir, fullPath));
    const gitMode = modes.get(repoRelative);
    const executableBit = gitMode ? gitMode === "100755" : process.platform !== "win32" && (stat.mode & 0o111) !== 0;
    if (executableBit) errors.push(`${relative}: file is marked executable`);

    const header = readHeader(fullPath);
    const nativeKind = hasNativeMagic(header);
    if (nativeKind) {
      errors.push(`${relative}: contains a ${nativeKind}`);
    } else if (NATIVE_BINARY_EXTENSIONS.has(ext)) {
      errors.push(`${relative}: native/compiled binary file type (${ext}) is not allowed`);
    } else if (SCRIPT_EXTENSIONS.has(ext)) {
      warnings.push(`${relative}: script file — confirm it is not executed automatically`);
    } else if (header.includes(0) && !ALLOWED_BINARY_EXTENSIONS.has(ext)) {
      warnings.push(`${relative}: unexpected binary content (${ext || "no extension"})`);
    }
    if (!MODULE_EXTENSIONS.has(ext) && header.subarray(0, 2).toString("latin1") === "#!") {
      warnings.push(`${relative}: has a shebang line — confirm it is not executed automatically`);
    }
    if (stat.size > MAX_ASSET_BYTES) {
      errors.push(`${relative}: ${formatBytes(stat.size)} exceeds the ${formatBytes(MAX_ASSET_BYTES)} asset limit`);
    }
  }

  return { errors, warnings, inventory };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ---------------------------------------------------------------------------
// Extension checks
// ---------------------------------------------------------------------------

/**
 * Parse every module in an extension, walk the import graph from
 * extension.mjs, and validate each specifier.
 */
export function checkExtensionModules(extensionDir) {
  const errors = [];
  const warnings = [];
  const builtins = new Set();
  const externalPackages = new Set();
  const sourceCapabilities = new Set();
  const packageJsonPath = path.join(extensionDir, "package.json");
  let packageJson = {};
  const dirProblem = extensionDirProblem(extensionDir);
  if (dirProblem) {
    errors.push(dirProblem);
    return { errors, warnings, modules: [], builtins: [], externalPackages: [], sourceCapabilities: [], packageJson };
  }
  if (fs.lstatSync(packageJsonPath, { throwIfNoEntry: false })) {
    const parsed = readJson(packageJsonPath, { root: extensionDir });
    if (parsed.error) errors.push(`package.json: invalid (${parsed.error})`);
    else packageJson = parsed.value ?? {};
  }
  const packageType = packageJson.type === "module" ? "module" : "commonjs";

  const entry = path.join(extensionDir, "extension.mjs");
  const entryStat = fs.lstatSync(entry, { throwIfNoEntry: false });
  if (!entryStat) {
    errors.push("extension.mjs: entry point is missing");
    return { errors, warnings, modules: [], builtins: [], externalPackages: [], sourceCapabilities: [], packageJson };
  }
  if (entryStat.isSymbolicLink() || !entryStat.isFile()) {
    errors.push("extension.mjs: entry point must be a regular file (not a symbolic link or device)");
    return { errors, warnings, modules: [], builtins: [], externalPackages: [], sourceCapabilities: [], packageJson };
  }

  const moduleFiles = listFiles(extensionDir)
    .filter(({ entry: dirent, fullPath }) =>
      dirent.isFile() &&
      MODULE_EXTENSIONS.has(path.extname(fullPath)) &&
      !toPosix(path.relative(extensionDir, fullPath)).split("/").includes("node_modules"))
    .map(({ fullPath }) => fullPath);

  const parsedModules = new Map();
  const parseFile = (filePath) => {
    if (parsedModules.has(filePath)) return parsedModules.get(filePath);
    const relative = toPosix(path.relative(extensionDir, filePath));
    const read = readRegularFile(filePath, { root: extensionDir });
    if (read.error) {
      const record = { path: relative, esm: true, source: "", ok: false, unreadable: true, error: `file ${read.error}`, specifiers: [], dynamic: [] };
      parsedModules.set(filePath, record);
      return record;
    }
    const source = read.text;
    const esm = isModuleFile(filePath, packageType);
    const parsed = esm ? parseEsModule(source, relative) : parseCommonJs(source, relative);
    const record = {
      path: relative,
      esm,
      source,
      ...parsed,
      dynamic: findDynamicImportSpecifiers(source),
      nonLiteralLoads: findNonLiteralRuntimeLoads(source),
    };
    parsedModules.set(filePath, record);
    return record;
  };

  const reachable = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const filePath = queue.shift();
    if (reachable.has(filePath)) continue;
    reachable.add(filePath);
    const record = parseFile(filePath);
    if (!record.ok) {
      // Symlinked or non-regular targets are not in moduleFiles, so report them here.
      if (record.unreadable && !moduleFiles.includes(filePath)) errors.push(`${record.path}: ${record.error}`);
      continue;
    }
    for (const specifier of record.specifiers) {
      for (const resolved of validateSpecifier(specifier, filePath, record.path, { strict: true, commonjs: !record.esm })) {
        if (MODULE_EXTENSIONS.has(path.extname(resolved))) queue.push(resolved);
      }
    }
    // Literal dynamic imports from reachable code are reachable too.
    for (const specifier of record.dynamic) {
      for (const resolved of validateSpecifier(specifier, filePath, record.path, { strict: true, dynamic: true })) {
        if (MODULE_EXTENSIONS.has(path.extname(resolved))) queue.push(resolved);
      }
    }
  }

  for (const filePath of moduleFiles) {
    let record = parseFile(filePath);
    const isReachable = reachable.has(filePath);
    if (!record.ok && !isReachable && !record.unreadable) {
      // Unreachable files are often browser assets served to the canvas webview,
      // so accept them if they parse in either module flavour.
      const alternate = record.esm ? parseCommonJs(record.source, record.path) : parseEsModule(record.source, record.path);
      if (alternate.ok) record = { ...record, ...alternate, esm: !record.esm, error: undefined };
    }
    if (!record.ok) {
      errors.push(record.unreadable ? `${record.path}: ${record.error}` : `${record.path}: syntax error — ${record.error}`);
      continue;
    }
    for (const load of record.nonLiteralLoads) {
      flag(isReachable, `${record.path}: non-literal ${load} cannot be analyzed safely`);
    }
    if (!isReachable) {
      for (const specifier of record.specifiers) {
        validateSpecifier(specifier, filePath, record.path, { strict: false, commonjs: !record.esm });
      }
      for (const specifier of record.dynamic) {
        validateDynamicSpecifier(specifier, filePath, record.path);
      }
    }
    if (isReachable) {
      for (const { pattern, label } of SOURCE_CAPABILITIES) {
        if (pattern.test(record.source)) sourceCapabilities.add(label);
      }
    }
  }

  // Problems in modules that are not reachable from extension.mjs are reported
  // as warnings because those files may be browser assets rather than Node code.
  function flag(strict, message) {
    if (strict) errors.push(message);
    else warnings.push(`${message} (module is not reachable from extension.mjs)`);
  }

  // Returns the extension files the specifier resolves to (empty when it does not resolve to a local file).
  function validateSpecifier(specifier, filePath, relativePath, { strict, dynamic = false, commonjs = false, viaAlias }) {
    const classification = classifySpecifier(specifier, packageJson);
    const shown = viaAlias ? `${viaAlias}" -> "${specifier}` : specifier;
    const where = dynamic
      ? `${relativePath}: dynamic import("${shown}")`
      : commonjs ? `${relativePath}: require("${shown}")` : `${relativePath}: import "${shown}"`;
    switch (classification.kind) {
      case "relative": {
        const cleaned = specifier.replace(/[?#].*$/, "");
        const target = path.resolve(path.dirname(filePath), cleaned);
        if (!isInside(extensionDir, target)) {
          flag(strict, `${where} escapes the extension directory`);
          return [];
        }
        const resolved = commonjs ? resolveCommonJsTarget(target) : target;
        if (!resolved || !fs.existsSync(resolved)) {
          flag(strict, `${where} references a missing file`);
          return [];
        }
        if (fs.statSync(resolved).isDirectory()) {
          flag(strict, `${where} points at a directory (ES modules require a file path)`);
          return [];
        }
        return [resolved];
      }
      case "builtin":
        if (strict) builtins.add(classification.name);
        return [];
      case "host":
        return [];
      case "internal": {
        // Resolve package.json "imports" aliases through the same checks; fail closed on anything we cannot analyze.
        const targets = viaAlias ? null : importsAliasTargets(packageJson.imports[specifier]);
        if (!targets || targets.length === 0 || targets.some((target) => target.startsWith("#") || target.startsWith("../"))) {
          flag(strict, `${where} uses a package.json "imports" alias that cannot be analyzed`);
          return [];
        }
        const aliasBase = path.join(extensionDir, "package.json");
        return targets.flatMap((target) =>
          validateSpecifier(target, aliasBase, relativePath, { strict, dynamic, commonjs, viaAlias: specifier }));
      }
      case "dependency":
        if (strict) externalPackages.add(classification.name);
        return [];
      case "dev-dependency":
        if (strict) externalPackages.add(classification.name);
        flag(strict, `${where} is only declared in devDependencies; runtime imports must be in dependencies`);
        return [];
      case "unsafe":
        flag(strict, `${where} uses an unsafe ${classification.reason}`);
        return [];
      case "remote":
        flag(strict, `${where} is a remote URL import`);
        return [];
      case "data":
        flag(strict, `${where} is a data: URL import`);
        return [];
      default:
        flag(strict, `${where} is not a Node.js builtin, host-provided package, or declared dependency`);
        return [];
    }
  }

  // Dynamic imports in modules that are not reachable from extension.mjs
  // (typically browser assets served to the canvas webview).
  function validateDynamicSpecifier(specifier, filePath, relativePath) {
    const where = `${relativePath}: dynamic import("${specifier}")`;
    const classification = classifySpecifier(specifier, packageJson);
    if (classification.kind === "relative") {
      const target = path.resolve(path.dirname(filePath), specifier.replace(/[?#].*$/, ""));
      if (!isInside(extensionDir, target)) flag(false, `${where} escapes the extension directory`);
      else if (!fs.existsSync(target)) flag(false, `${where} references a missing file`);
    } else if (classification.kind === "unsafe") {
      flag(false, `${where} uses an unsafe ${classification.reason}`);
    } else if (classification.kind === "remote") {
      flag(false, `${where} loads remote code`);
    } else if (classification.kind === "data") {
      flag(false, `${where} is a data: URL import`);
    } else if (classification.kind === "undeclared") {
      flag(false, `${where} is not declared in package.json`);
    } else if (classification.kind === "internal") {
      validateSpecifier(specifier, filePath, relativePath, { strict: false, dynamic: true });
    }
  }

  function resolveCommonJsTarget(target) {
    const candidates = [target, `${target}.js`, `${target}.cjs`, `${target}.json`, path.join(target, "index.js"), path.join(target, "index.cjs")];
    return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
  }

  if (packageJson.scripts) {
    for (const hook of ["preinstall", "install", "postinstall", "prepare"]) {
      if (packageJson.scripts[hook]) warnings.push(`package.json: defines a "${hook}" lifecycle script`);
    }
  }
  if (typeof packageJson.main === "string") {
    const reason = unsafePathReason(packageJson.main);
    if (reason) errors.push(`package.json: "main" uses an unsafe ${reason}`);
    else if (!fs.existsSync(path.join(extensionDir, packageJson.main))) errors.push(`package.json: "main" references a missing file (${packageJson.main})`);
  }

  const modules = moduleFiles
    .map((filePath) => ({ path: toPosix(path.relative(extensionDir, filePath)), reachable: reachable.has(filePath) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    errors,
    warnings,
    modules,
    builtins: [...builtins].sort(),
    externalPackages: [...externalPackages].sort(),
    sourceCapabilities: [...sourceCapabilities].sort(),
    packageJson,
  };
}

export function describeCapabilities(builtins, sourceCapabilities, externalPackages) {
  const capabilities = [];
  for (const { modules, label } of BUILTIN_CAPABILITIES) {
    if (modules.some((name) => builtins.includes(name))) capabilities.push(label);
  }
  capabilities.push(...sourceCapabilities);
  if (externalPackages.length > 0) capabilities.push(`Third-party runtime packages: ${externalPackages.join(", ")}`);
  return capabilities;
}

export function checkPreview(extensionDir, { minWidth, minHeight }) {
  const previewPath = path.join(extensionDir, "assets", "preview.png");
  const result = { path: "assets/preview.png", exists: false, errors: [], warnings: [] };
  const dirProblem = extensionDirProblem(extensionDir);
  if (dirProblem) {
    result.errors.push(dirProblem === "extension directory is missing"
      ? "assets/preview.png is missing"
      : "assets/preview.png cannot be inspected: extension directory is not a regular directory");
    return result;
  }
  const stat = fs.lstatSync(previewPath, { throwIfNoEntry: false });
  if (!stat) {
    result.errors.push("assets/preview.png is missing");
    return result;
  }
  result.exists = true;
  if (stat.isSymbolicLink() || !stat.isFile() || !isInside(fs.realpathSync(extensionDir), fs.realpathSync(previewPath))) {
    result.errors.push("assets/preview.png must be a regular file");
    return result;
  }
  result.bytes = stat.size;
  if (stat.size > MAX_PREVIEW_BYTES) {
    result.errors.push(`assets/preview.png is ${formatBytes(stat.size)}; maximum is ${formatBytes(MAX_PREVIEW_BYTES)}`);
    return result;
  }
  const png = inspectPng(fs.readFileSync(previewPath));
  result.width = png.width;
  result.height = png.height;
  result.animated = png.animated;
  for (const error of png.errors) result.errors.push(`assets/preview.png: ${error}`);
  if (png.ok && (png.width < minWidth || png.height < minHeight)) {
    result.errors.push(`assets/preview.png is ${png.width}×${png.height}; minimum is ${minWidth}×${minHeight}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Target detection
// ---------------------------------------------------------------------------

function readPluginManifests(rootDir) {
  const pluginsDir = path.join(rootDir, "plugins");
  const manifests = new Map();
  if (!fs.existsSync(pluginsDir)) return manifests;
  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(pluginsDir, entry.name, "plugin.json");
    if (!fs.lstatSync(manifestPath, { throwIfNoEntry: false })) continue;
    const parsed = readJson(manifestPath, { root: path.join(pluginsDir, entry.name) });
    manifests.set(entry.name, parsed.error ? { parseError: parsed.error } : parsed.value);
  }
  return manifests;
}

function isExtensionDir(rootDir, name) {
  return fs.existsSync(path.join(rootDir, "extensions", name, "extension.mjs"));
}

const SAFE_EXTENSION_ID = /^[a-z0-9][a-z0-9._-]*$/i;

/** A single path segment that stays inside extensions/ (no `..`, separators, or absolute paths). */
export function isSafeExtensionId(id) {
  return typeof id === "string" && SAFE_EXTENSION_ID.test(id) && !id.includes("..");
}

/** Extension references in a plugin manifest that are not safe single-segment IDs. */
export function unsafeExtensionRefs(manifest) {
  const refs = manifest?.extensions?.[AWESOME_COPILOT_NAMESPACE]?.extensions;
  if (!Array.isArray(refs)) return [];
  return refs.filter((ref) => typeof ref !== "string"
    || !ref.startsWith("./extensions/")
    || !isSafeExtensionId(ref.replace(/^\.\/extensions\//, "").replace(/\/$/, "")));
}

export function pluginExtensionIds(rootDir, pluginDir, manifest) {
  const ids = new Set();
  const refs = manifest?.extensions?.[AWESOME_COPILOT_NAMESPACE]?.extensions;
  if (Array.isArray(refs)) {
    for (const ref of refs) {
      if (typeof ref === "string" && ref.startsWith("./extensions/")) {
        const id = ref.replace(/^\.\/extensions\//, "").replace(/\/$/, "");
        if (isSafeExtensionId(id)) ids.add(id);
      }
    }
  }
  if (isSafeExtensionId(pluginDir) && isExtensionDir(rootDir, pluginDir)) ids.add(pluginDir);
  return [...ids].sort();
}

function readBasePluginManifest(rootDir, baseRef, pluginDir) {
  if (!baseRef || !isSafeExtensionId(pluginDir)) return { error: `cannot read deleted plugins/${pluginDir}/plugin.json from base` };
  const result = spawnSync("git", ["show", `${baseRef}:plugins/${pluginDir}/plugin.json`], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: MAX_TEXT_FILE_BYTES,
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || `git show exited ${result.status}`).trim();
    return { error: `cannot read deleted plugins/${pluginDir}/plugin.json from base ${baseRef}: ${message}` };
  }
  try {
    return { value: JSON.parse(result.stdout) };
  } catch (error) {
    return { error: `deleted plugins/${pluginDir}/plugin.json from base ${baseRef}: invalid JSON (${error.message})` };
  }
}

/**
 * Determine which canvas extensions and extension-bearing plugins are
 * affected by a list of changed repository paths.
 */
export function detectCanvasTargets(changedFiles, { rootDir = DEFAULT_ROOT, baseRef = "" } = {}) {
  const manifests = readPluginManifests(rootDir);
  const extensions = new Set();
  const plugins = new Set();
  const removedExtensions = new Set();
  const baseManifestErrors = new Map();

  for (const file of changedFiles) {
    const parts = toPosix(file).split("/");
    if (parts[0] === "extensions" && parts.length >= 3) {
      // A directory that still exists is validated even if extension.mjs was
      // deleted, so removing the entry point cannot skip the check.
      if (fs.existsSync(path.join(rootDir, "extensions", parts[1]))) extensions.add(parts[1]);
      else removedExtensions.add(parts[1]);
    } else if (parts[0] === "plugins" && parts.length >= 3) {
      // A deleted plugin.json leaves no manifest, but the plugin is still
      // checked when it has a direct extension so checkPluginManifest reports it.
      let manifest = manifests.get(parts[1]);
      const baseIds = new Set();
      if (parts[2] === "plugin.json" && baseRef) {
        const baseManifest = readBasePluginManifest(rootDir, baseRef, parts[1]);
        if (!manifest) {
          if (baseManifest.error) {
            baseManifestErrors.set(parts[1], baseManifest.error);
            plugins.add(parts[1]);
          } else {
            manifest = baseManifest.value;
          }
        } else if (!baseManifest.error) {
          // An edited manifest can drop a reference, which may leave the
          // extension unregistered, so the base references are validated too.
          // A missing or unparsable base copy just means there is nothing to
          // compare against (for example a newly added manifest).
          for (const id of pluginExtensionIds(rootDir, parts[1], baseManifest.value)) baseIds.add(id);
        }
      }
      const ids = [...new Set([...(manifest ? pluginExtensionIds(rootDir, parts[1], manifest) : []), ...baseIds])];
      const directExtension = isSafeExtensionId(parts[1]) && isExtensionDir(rootDir, parts[1]);
      const unsafeRefs = manifest ? unsafeExtensionRefs(manifest) : [];
      if (ids.length > 0 || directExtension || unsafeRefs.length > 0) {
        plugins.add(parts[1]);
        ids.filter((id) => isExtensionDir(rootDir, id)).forEach((id) => extensions.add(id));
        if (directExtension) extensions.add(parts[1]);
      }
    }
  }

  for (const [pluginDir, manifest] of manifests) {
    const ids = pluginExtensionIds(rootDir, pluginDir, manifest);
    // Plugins that still reference, or were the direct plugin for, a removed
    // extension are validated so the removal cannot leave them broken.
    if (ids.some((id) => extensions.has(id) || removedExtensions.has(id)) || removedExtensions.has(pluginDir)) {
      plugins.add(pluginDir);
    }
  }

  return {
    extensions: [...extensions].sort(),
    plugins: [...plugins].sort(),
    removedExtensions: [...removedExtensions].sort(),
    manifests,
    baseManifestErrors,
  };
}

// ---------------------------------------------------------------------------
// Plugin checks, materialization, install smoke test
// ---------------------------------------------------------------------------

function checkPluginManifest(rootDir, pluginDir, manifest) {
  const errors = [];
  const warnings = [];
  if (!manifest) {
    errors.push(`plugins/${pluginDir}/plugin.json is missing`);
    return { errors, warnings };
  }
  if (manifest.parseError) {
    errors.push(`plugins/${pluginDir}/plugin.json: invalid JSON (${manifest.parseError})`);
    return { errors, warnings };
  }
  for (const finding of findUnsafeManifestPaths(manifest)) {
    errors.push(`plugins/${pluginDir}/plugin.json ${finding.field}: unsafe ${finding.reason} (${finding.value})`);
  }
  for (const ref of unsafeExtensionRefs(manifest)) {
    errors.push(`plugins/${pluginDir}/plugin.json extensions["${AWESOME_COPILOT_NAMESPACE}"].extensions: invalid extension reference ${JSON.stringify(ref)} (expected "./extensions/<id>" with a single safe segment)`);
  }
  const logo = manifest.extensions?.[COPILOT_NAMESPACE]?.logo;
  if (isExtensionDir(rootDir, pluginDir) && logo !== "assets/preview.png") {
    errors.push(`plugins/${pluginDir}/plugin.json: extensions["${COPILOT_NAMESPACE}"].logo must be "assets/preview.png"`);
  }
  for (const id of pluginExtensionIds(rootDir, pluginDir, manifest)) {
    if (!isExtensionDir(rootDir, id)) errors.push(`plugins/${pluginDir}/plugin.json references missing extension extensions/${id}`);
  }
  const composition = manifest.extensions?.[AWESOME_COPILOT_NAMESPACE] ?? {};
  for (const field of ["agents", "hooks", "skills"]) {
    for (const ref of Array.isArray(composition[field]) ? composition[field] : []) {
      const source = resolveCompositionSource(rootDir, ref);
      if (!source || !fs.existsSync(source)) errors.push(`plugins/${pluginDir}/plugin.json ${field} reference not found: ${ref}`);
    }
  }
  return { errors, warnings };
}

function resolveCompositionSource(rootDir, ref) {
  if (typeof ref !== "string" || unsafePathReason(ref)) return null;
  const trimmed = ref.replace(/^\.\//, "").replace(/\/$/, "");
  if (trimmed.startsWith("agents/")) return path.join(rootDir, "agents", `${path.basename(trimmed, ".md")}.agent.md`);
  if (/^(skills|hooks|extensions)\//.test(trimmed)) return path.join(rootDir, trimmed);
  return null;
}

function copyPath(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, dereference: false, verbatimSymlinks: true });
}

function commandAvailable(command) {
  const probe = process.platform === "win32"
    ? spawnSync("where", [command], { encoding: "utf8" })
    : spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" });
  return probe.status === 0;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
    shell: process.platform === "win32",
    ...options,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return { status: typeof result.status === "number" ? result.status : 1, output: output.slice(-4000), error: result.error?.message };
}

function findFileUpwards(root, name, maxDepth = 4) {
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
    if (depth >= maxDepth) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "node_modules") queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
    }
  }
  return null;
}

/**
 * Materialize the given plugins in an isolated copy of the repository with
 * eng/materialize-plugins.mjs, verify the served output, and optionally
 * install each plugin with the Copilot CLI from an ephemeral marketplace.
 */
export async function runSmokeTest(pluginDirs, { rootDir = DEFAULT_ROOT, workDir, install = "auto" } = {}) {
  const results = { materialize: {}, install: {}, installStatus: "skipped", installNote: "" };
  if (pluginDirs.length === 0) return results;

  const tempRoot = workDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "canvas-smoke-"));
  const repoCopy = path.join(tempRoot, "repo");
  fs.rmSync(repoCopy, { recursive: true, force: true });
  copyPath(path.join(DEFAULT_ROOT, "eng", "materialize-plugins.mjs"), path.join(repoCopy, "eng", "materialize-plugins.mjs"));
  copyPath(path.join(DEFAULT_ROOT, "eng", "constants.mjs"), path.join(repoCopy, "eng", "constants.mjs"));

  const { validateAgentPluginManifest } = await import("./agent-plugin-schema.mjs");
  const manifests = readPluginManifests(rootDir);
  const copyable = [];
  for (const pluginDir of pluginDirs) {
    const manifest = manifests.get(pluginDir);
    if (!manifest || manifest.parseError) {
      results.materialize[pluginDir] = { status: "fail", errors: ["plugin.json is missing or invalid"] };
      continue;
    }
    if (!isSafeExtensionId(pluginDir) || unsafeExtensionRefs(manifest).length > 0) {
      results.materialize[pluginDir] = { status: "fail", errors: ["plugin.json has unsafe plugin or extension references; not materialized"] };
      continue;
    }
    copyPath(path.join(rootDir, "plugins", pluginDir), path.join(repoCopy, "plugins", pluginDir));
    const composition = manifest.extensions?.[AWESOME_COPILOT_NAMESPACE] ?? {};
    for (const field of ["agents", "hooks", "skills"]) {
      for (const ref of Array.isArray(composition[field]) ? composition[field] : []) {
        const source = resolveCompositionSource(rootDir, ref);
        if (source && fs.existsSync(source)) copyPath(source, path.join(repoCopy, path.relative(rootDir, source)));
      }
    }
    for (const id of pluginExtensionIds(rootDir, pluginDir, manifest)) {
      const source = path.join(rootDir, "extensions", id);
      if (!isInside(path.join(rootDir, "extensions"), source)) continue;
      if (fs.existsSync(source)) copyPath(source, path.join(repoCopy, "extensions", id));
    }
    copyable.push(pluginDir);
  }

  const materialize = runCommand(process.execPath, [path.join(repoCopy, "eng", "materialize-plugins.mjs")], { cwd: repoCopy, shell: false });
  for (const pluginDir of copyable) {
    const errors = [];
    const pluginRoot = path.join(repoCopy, "plugins", pluginDir);
    if (materialize.status !== 0) errors.push(`materializer exited with ${materialize.status}: ${materialize.output}`);
    const served = readJson(path.join(pluginRoot, "plugin.json"));
    if (served.error) {
      errors.push(`served plugin.json is invalid: ${served.error}`);
    } else {
      errors.push(...validateAgentPluginManifest(served.value).map((error) => `served plugin.json: ${error}`));
      if (served.value.extensions?.[AWESOME_COPILOT_NAMESPACE]) errors.push("served plugin.json still contains repository composition fields");
    }
    const extensionIds = pluginExtensionIds(rootDir, pluginDir, manifests.get(pluginDir));
    for (const id of extensionIds) {
      const materialized = path.join(pluginRoot, COPILOT_NAMESPACE, "extensions", id, "extension.mjs");
      if (!fs.existsSync(materialized)) errors.push(`materialized ${COPILOT_NAMESPACE}/extensions/${id}/extension.mjs is missing`);
    }
    results.materialize[pluginDir] = { status: errors.length ? "fail" : "pass", errors, extensions: extensionIds };
  }

  const canInstall = install !== "never" && commandAvailable("copilot");
  if (!canInstall) {
    results.installStatus = install === "require" ? "infra_error" : "skipped";
    results.installNote = install === "never" ? "install smoke test disabled" : "Copilot CLI is not available on this runner";
    return results;
  }

  const marketplaceName = "canvas-smoke-test";
  const marketplaceDir = path.join(tempRoot, "marketplace");
  fs.rmSync(marketplaceDir, { recursive: true, force: true });
  const entries = [];
  for (const pluginDir of copyable) {
    if (results.materialize[pluginDir].status !== "pass") continue;
    copyPath(path.join(repoCopy, "plugins", pluginDir), path.join(marketplaceDir, "plugins", pluginDir));
    const served = readJson(path.join(repoCopy, "plugins", pluginDir, "plugin.json")).value;
    entries.push({ name: served.name, source: `plugins/${pluginDir}`, description: served.description, version: served.version });
  }
  const marketplace = {
    name: marketplaceName,
    metadata: { description: "Ephemeral marketplace for canvas smoke tests", version: "1.0.0" },
    owner: { name: "awesome-copilot", email: "noreply@github.com" },
    plugins: entries,
  };
  fs.mkdirSync(path.join(marketplaceDir, ".github", "plugin"), { recursive: true });
  fs.writeFileSync(path.join(marketplaceDir, ".github", "plugin", "marketplace.json"), `${JSON.stringify(marketplace, null, 2)}\n`);

  const copilotHome = path.join(tempRoot, "copilot-home");
  fs.mkdirSync(copilotHome, { recursive: true });
  const env = {
    ...process.env,
    COPILOT_HOME: path.join(copilotHome, ".copilot"),
    HOME: copilotHome,
    XDG_CONFIG_HOME: path.join(copilotHome, ".config"),
    XDG_CACHE_HOME: path.join(copilotHome, ".cache"),
    XDG_DATA_HOME: path.join(copilotHome, ".local", "share"),
  };
  delete env.GITHUB_TOKEN;
  delete env.GH_TOKEN;
  delete env.COPILOT_GITHUB_TOKEN;

  const add = runCommand("copilot", ["plugin", "marketplace", "add", marketplaceDir], { env });
  if (add.status !== 0) {
    results.installStatus = "infra_error";
    results.installNote = `copilot plugin marketplace add failed: ${add.output || add.error}`;
    return results;
  }

  const outcomes = new Map();
  for (const entry of entries) {
    outcomes.set(entry.name, runCommand("copilot", ["plugin", "install", `${entry.name}@${marketplaceName}`], { env }));
  }
  let listed = null;
  const list = runCommand("copilot", ["plugin", "list", "--json"], { env });
  if (list.status === 0) {
    try {
      listed = JSON.parse(list.output.slice(list.output.indexOf("[")));
    } catch {
      listed = null;
    }
  }

  let failures = 0;
  for (const entry of entries) {
    const outcome = outcomes.get(entry.name);
    const errors = [];
    if (outcome.status !== 0) {
      errors.push(`copilot plugin install failed: ${outcome.output || outcome.error}`);
    } else {
      // Older CLIs copy plugins into installed-plugins/; newer CLIs load local
      // directory marketplaces live from their source directory.
      const listing = Array.isArray(listed)
        ? listed.find((item) => item.name === entry.name && item.marketplace === marketplaceName)
        : null;
      const copiedRoot = path.join(env.COPILOT_HOME, "installed-plugins", marketplaceName, entry.name);
      const installedRoot = fs.existsSync(copiedRoot)
        ? copiedRoot
        : listing?.source === "live" ? path.join(marketplaceDir, entry.source) : null;
      if (listed && !listing) errors.push("plugin is not listed by `copilot plugin list` after install");
      if (listing && listing.enabled === false) errors.push("plugin is installed but disabled");
      if (listing?.version && listing.version !== entry.version) errors.push(`installed version ${listing.version} does not match ${entry.version}`);
      if (!installedRoot) {
        errors.push(`installed plugin files not found (expected installed-plugins/${marketplaceName}/${entry.name} or a live listing)`);
      } else {
        if (!findFileUpwards(installedRoot, "plugin.json")) errors.push("installed plugin has no plugin.json");
        const pluginDir = entry.source.replace(/^plugins\//, "");
        for (const id of results.materialize[pluginDir].extensions) {
          if (!fs.existsSync(path.join(installedRoot, COPILOT_NAMESPACE, "extensions", id, "extension.mjs"))) {
            errors.push(`installed plugin is missing ${COPILOT_NAMESPACE}/extensions/${id}/extension.mjs`);
          }
        }
      }
    }
    if (errors.length) failures++;
    results.install[entry.source.replace(/^plugins\//, "")] = { status: errors.length ? "fail" : "pass", errors };
  }
  results.installStatus = failures ? "fail" : "pass";
  return results;
}

// ---------------------------------------------------------------------------
// Orchestration and reporting
// ---------------------------------------------------------------------------

export async function runCanvasSmokeTest({
  rootDir = DEFAULT_ROOT,
  changedFiles = [],
  all = false,
  minWidth = DEFAULT_MIN_PREVIEW_WIDTH,
  minHeight = DEFAULT_MIN_PREVIEW_HEIGHT,
  install = "auto",
  workDir,
  baseRef = "",
} = {}) {
  const targets = all
    ? (() => {
      const extensionIds = fs.readdirSync(path.join(rootDir, "extensions"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isExtensionDir(rootDir, entry.name))
        .map((entry) => entry.name);
      return detectCanvasTargets(extensionIds.map((id) => `extensions/${id}/extension.mjs`), { rootDir, baseRef });
    })()
    : detectCanvasTargets(changedFiles, { rootDir, baseRef });

  const report = {
    schema_version: "canvas-smoke-test/v1",
    generated_at: new Date().toISOString(),
    status: "skipped",
    min_preview: { width: minWidth, height: minHeight },
    changed_files: changedFiles,
    extensions: [],
    plugins: [],
    removed_extensions: targets.removedExtensions,
    smoke: null,
    error_count: 0,
    warning_count: 0,
  };
  if (targets.extensions.length === 0 && targets.plugins.length === 0) {
    // A clean removal (extension and its plugin both deleted) is explicitly
    // accepted rather than reported as skipped.
    if (targets.removedExtensions.length > 0) report.status = "pass";
    return report;
  }

  const owners = new Map();
  for (const [pluginDir, manifest] of targets.manifests) {
    for (const id of pluginExtensionIds(rootDir, pluginDir, manifest)) {
      owners.set(id, [...(owners.get(id) ?? []), pluginDir]);
    }
  }

  for (const id of targets.extensions) {
    const extensionDir = path.join(rootDir, "extensions", id);
    const modules = checkExtensionModules(extensionDir);
    const files = inspectExtensionFiles(extensionDir, { rootDir });
    const preview = checkPreview(extensionDir, { minWidth, minHeight });
    const errors = [...new Set([...modules.errors, ...files.errors, ...preview.errors])];
    const warnings = [...modules.warnings, ...files.warnings, ...preview.warnings];

    for (const manifestName of ["package.json", "copilot-extension.json"]) {
      const manifestPath = path.join(extensionDir, manifestName);
      if (!fs.lstatSync(manifestPath, { throwIfNoEntry: false })) continue;
      const parsed = readJson(manifestPath, { root: extensionDir });
      if (parsed.error) {
        if (manifestName !== "package.json") errors.push(`${manifestName}: invalid JSON (${parsed.error})`);
        continue;
      }
      for (const finding of findUnsafeManifestPaths(parsed.value)) {
        errors.push(`${manifestName} ${finding.field}: unsafe ${finding.reason} (${finding.value})`);
      }
    }

    const pluginDirs = (owners.get(id) ?? []).sort();
    if (pluginDirs.length === 0) errors.push(`extension is not registered by any plugin (add plugins/${id}/plugin.json or reference ./extensions/${id})`);

    report.extensions.push({
      id,
      plugins: pluginDirs,
      package: modules.packageJson?.name ? { name: modules.packageJson.name, version: modules.packageJson.version } : null,
      modules: modules.modules,
      builtins: modules.builtins,
      third_party: modules.externalPackages,
      capabilities: describeCapabilities(modules.builtins, modules.sourceCapabilities, modules.externalPackages),
      preview,
      files: files.inventory,
      changed_files: changedFiles.filter((file) => toPosix(file).startsWith(`extensions/${id}/`)),
      errors,
      warnings,
    });
  }

  for (const pluginDir of targets.plugins) {
    const manifest = targets.manifests.get(pluginDir);
    const check = checkPluginManifest(rootDir, pluginDir, manifest);
    if (targets.baseManifestErrors.has(pluginDir)) {
      check.errors.push(targets.baseManifestErrors.get(pluginDir));
    }
    if (targets.removedExtensions.includes(pluginDir)) {
      check.errors.push(`plugins/${pluginDir} is the plugin for removed extension extensions/${pluginDir}; delete the plugin too or restore the extension`);
    }
    report.plugins.push({
      directory: pluginDir,
      name: manifest?.name ?? pluginDir,
      version: manifest?.version ?? null,
      description: manifest?.description ?? null,
      author: manifest?.author ?? null,
      license: manifest?.license ?? null,
      keywords: Array.isArray(manifest?.keywords) ? manifest.keywords : [],
      extensions: pluginExtensionIds(rootDir, pluginDir, manifest),
      changed_files: changedFiles.filter((file) => toPosix(file).startsWith(`plugins/${pluginDir}/`)),
      errors: check.errors,
      warnings: check.warnings,
    });
  }

  const ownsWorkDir = !workDir;
  const smokeDir = workDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "canvas-smoke-"));
  try {
    report.smoke = await runSmokeTest(targets.plugins, { rootDir, workDir: smokeDir, install });
  } finally {
    if (ownsWorkDir) {
      try {
        fs.rmSync(smokeDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup of the temporary smoke-test directory.
      }
    }
  }

  const smokeErrors = [
    ...Object.values(report.smoke.materialize).flatMap((entry) => entry.errors),
    ...Object.values(report.smoke.install).flatMap((entry) => entry.errors),
  ];
  report.error_count = smokeErrors.length +
    report.extensions.reduce((sum, entry) => sum + entry.errors.length, 0) +
    report.plugins.reduce((sum, entry) => sum + entry.errors.length, 0);
  report.warning_count = report.extensions.reduce((sum, entry) => sum + entry.warnings.length, 0) +
    report.plugins.reduce((sum, entry) => sum + entry.warnings.length, 0) +
    (report.smoke.installStatus === "skipped" ? 1 : 0);

  if (report.error_count > 0) report.status = "fail";
  else if (report.smoke.installStatus === "infra_error") report.status = "infra_error";
  else report.status = "pass";
  return report;
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"))
    .replace(/([|`*_[\]])/g, "\\$1")
    .slice(0, 300);
}

function code(value) {
  return `\`${String(value).replace(/`/g, "'").replace(/[\r\n]+/g, " ").slice(0, 300)}\``;
}

function statusIcon(status) {
  return { pass: "✅", fail: "❌", skipped: "⏭️", infra_error: "⚠️" }[status] ?? "❔";
}

function formatAuthor(author) {
  if (!author) return "—";
  if (typeof author === "string") return escapeMarkdown(author);
  return escapeMarkdown([author.name, author.url].filter(Boolean).join(" — ")) || "—";
}

function bulletList(items, empty = "_None_", limit = 50) {
  if (!items || items.length === 0) return [empty];
  const lines = items.slice(0, limit).map((item) => `- ${item}`);
  if (items.length > limit) lines.push(`- _…and ${items.length - limit} more_`);
  return lines;
}

/**
 * Render the Markdown review artifact used for the job summary and PR comment.
 * previewBaseUrl, when provided, is prefixed to repository paths to embed the
 * preview image (for example https://raw.githubusercontent.com/<owner>/<repo>/<sha>/).
 */
export function renderMarkdownReport(report, { previewBaseUrl = "", runUrl = "" } = {}) {
  const lines = [REPORT_MARKER, "## 🧩 Canvas smoke test", ""];
  if (report.status === "skipped") {
    lines.push("⏭️ **Skipped** — no canvas extension or extension-bearing plugin paths changed.");
    return `${lines.join("\n")}\n`;
  }
  if (report.extensions.length === 0 && report.plugins.length === 0 && report.removed_extensions.length > 0) {
    lines.push(`✅ **Passed** — removed extensions ${report.removed_extensions.map(code).join(", ")}; no remaining plugin references them.`);
    return `${lines.join("\n")}\n`;
  }
  const headline = {
    pass: "✅ **Passed**",
    fail: "❌ **Failed**",
    infra_error: "⚠️ **Infrastructure error** — the smoke test could not complete; this is not a contribution failure.",
  }[report.status];
  lines.push(`${headline} · ${report.error_count} error(s), ${report.warning_count} warning(s)`);
  lines.push("");
  lines.push("| Check | Result |", "|---|---|");
  const allErrors = (items) => items.every((entry) => entry.errors.length === 0);
  lines.push(`| Syntax, imports, file safety | ${allErrors(report.extensions) ? "✅" : "❌"} |`);
  lines.push(`| Preview image (≥ ${report.min_preview.width}×${report.min_preview.height} PNG) | ${report.extensions.every((entry) => entry.preview.errors.length === 0) ? "✅" : "❌"} |`);
  lines.push(`| Plugin manifests | ${allErrors(report.plugins) ? "✅" : "❌"} |`);
  const materializeStatuses = Object.values(report.smoke?.materialize ?? {}).map((entry) => entry.status);
  lines.push(`| Materialize | ${materializeStatuses.length === 0 ? "⏭️" : materializeStatuses.every((status) => status === "pass") ? "✅" : "❌"} |`);
  lines.push(`| Install (Copilot CLI) | ${statusIcon(report.smoke?.installStatus)}${report.smoke?.installNote ? ` ${escapeMarkdown(report.smoke.installNote)}` : ""} |`);
  lines.push("");

  for (const plugin of report.plugins) {
    lines.push(`### Plugin ${code(plugin.name)}${plugin.version ? ` v${escapeMarkdown(plugin.version)}` : ""}`);
    lines.push("");
    lines.push("| Field | Value |", "|---|---|");
    lines.push(`| Description | ${escapeMarkdown(plugin.description) || "—"} |`);
    lines.push(`| Author | ${formatAuthor(plugin.author)} |`);
    lines.push(`| License | ${escapeMarkdown(plugin.license) || "—"} |`);
    lines.push(`| Keywords | ${plugin.keywords.map(escapeMarkdown).join(", ") || "—"} |`);
    lines.push(`| Extensions | ${plugin.extensions.map(code).join(", ") || "—"} |`);
    const materialize = report.smoke?.materialize?.[plugin.directory];
    const install = report.smoke?.install?.[plugin.directory];
    lines.push(`| Materialize | ${statusIcon(materialize?.status ?? "skipped")} |`);
    lines.push(`| Install | ${statusIcon(install?.status ?? report.smoke?.installStatus ?? "skipped")} |`);
    lines.push("");
    const problems = [...plugin.errors, ...(materialize?.errors ?? []), ...(install?.errors ?? [])];
    if (problems.length) lines.push("**Errors**", ...bulletList(problems.map(escapeMarkdown)), "");
    if (plugin.warnings.length) lines.push("**Warnings**", ...bulletList(plugin.warnings.map(escapeMarkdown)), "");
    if (plugin.changed_files.length) {
      lines.push("<details><summary>Changed plugin files</summary>", "", ...bulletList(plugin.changed_files.map(code)), "", "</details>", "");
    }
  }

  for (const extension of report.extensions) {
    lines.push(`### Extension ${code(extension.id)}`);
    lines.push("");
    const preview = extension.preview;
    if (preview.exists && previewBaseUrl && preview.errors.length === 0) {
      lines.push(`<img src="${previewBaseUrl}extensions/${encodeURIComponent(extension.id)}/assets/preview.png" alt="${escapeMarkdown(extension.id)} preview" width="480">`, "");
    }
    lines.push("| Field | Value |", "|---|---|");
    lines.push(`| Registered by | ${extension.plugins.map(code).join(", ") || "—"} |`);
    lines.push(`| Package | ${extension.package ? `${code(extension.package.name)} ${escapeMarkdown(extension.package.version ?? "")}` : "—"} |`);
    lines.push(`| Preview | ${preview.exists ? `${preview.width}×${preview.height}${preview.animated ? " (animated)" : ""}, ${formatBytes(preview.bytes ?? 0)}` : "missing"} |`);
    lines.push(`| Modules | ${extension.modules.length} (${extension.modules.filter((entry) => entry.reachable).length} reachable from ${code("extension.mjs")}) |`);
    lines.push(`| Files | ${extension.files.length} |`);
    lines.push("");
    lines.push("**Permissions and capabilities** (static analysis of modules reachable from `extension.mjs`)", "");
    lines.push(...bulletList(extension.capabilities.map(escapeMarkdown), "_No privileged Node.js capabilities detected_"), "");
    if (extension.errors.length) lines.push("**Errors**", ...bulletList(extension.errors.map(escapeMarkdown)), "");
    if (extension.warnings.length) lines.push("**Warnings**", ...bulletList(extension.warnings.map(escapeMarkdown)), "");
    if (extension.changed_files.length) {
      lines.push("<details><summary>Changed extension files</summary>", "", ...bulletList(extension.changed_files.map(code)), "", "</details>", "");
    }
  }

  if (report.removed_extensions.length) {
    lines.push(`Removed extensions: ${report.removed_extensions.map(code).join(", ")}`, "");
  }
  lines.push("---");
  lines.push(`_Static checks compile modules without executing them. Minimum preview size is configurable with \`CANVAS_PREVIEW_MIN_WIDTH\`/\`CANVAS_PREVIEW_MIN_HEIGHT\`.${runUrl ? ` [Workflow run](${runUrl})` : ""}_`);
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    changedFiles: null,
    all: false,
    outputDir: null,
    install: "auto",
    minWidth: Number(process.env.CANVAS_PREVIEW_MIN_WIDTH) || DEFAULT_MIN_PREVIEW_WIDTH,
    minHeight: Number(process.env.CANVAS_PREVIEW_MIN_HEIGHT) || DEFAULT_MIN_PREVIEW_HEIGHT,
    previewBaseUrl: process.env.CANVAS_PREVIEW_BASE_URL || "",
    runUrl: process.env.CANVAS_RUN_URL || "",
    detectOnly: false,
    baseRef: process.env.CANVAS_BASE_REF || "",
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === "--changed-files") options.changedFiles = next();
    else if (arg === "--all") options.all = true;
    else if (arg === "--output-dir") options.outputDir = next();
    else if (arg === "--install") options.install = next();
    else if (arg === "--min-preview-width") options.minWidth = Number(next());
    else if (arg === "--min-preview-height") options.minHeight = Number(next());
    else if (arg === "--preview-base-url") options.previewBaseUrl = next();
    else if (arg === "--detect-only") options.detectOnly = true;
    else if (arg === "--base-ref") options.baseRef = next();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!["auto", "require", "never"].includes(options.install)) throw new Error("--install must be auto, require, or never");
  if (!(options.minWidth > 0) || !(options.minHeight > 0)) throw new Error("minimum preview dimensions must be positive numbers");
  return options;
}

const USAGE = `Usage: node eng/canvas-smoke-test.mjs [--changed-files <file>] [--all] [--output-dir <dir>]
  [--install auto|require|never] [--min-preview-width <px>] [--min-preview-height <px>]
  [--preview-base-url <url>] [--base-ref <sha>] [--detect-only]

Exit codes: 0 = passed or skipped, 1 = contribution failures, 2 = infrastructure error.`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  const changedFiles = options.changedFiles
    ? fs.readFileSync(options.changedFiles, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];

  if (options.detectOnly) {
    const targets = detectCanvasTargets(changedFiles, { baseRef: options.baseRef });
    const canvas = targets.extensions.length > 0 || targets.plugins.length > 0 || targets.removedExtensions.length > 0;
    console.log(JSON.stringify({ canvas, extensions: targets.extensions, plugins: targets.plugins, removedExtensions: targets.removedExtensions }));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `canvas=${canvas}\n`);
    return 0;
  }

  const report = await runCanvasSmokeTest({
    changedFiles,
    all: options.all,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    install: options.install,
    baseRef: options.baseRef,
  });
  const markdown = renderMarkdownReport(report, { previewBaseUrl: options.previewBaseUrl, runUrl: options.runUrl });

  if (options.outputDir) {
    fs.mkdirSync(path.join(options.outputDir, "previews"), { recursive: true });
    fs.writeFileSync(path.join(options.outputDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(options.outputDir, "report.md"), markdown);
    for (const extension of report.extensions) {
      const source = path.join(DEFAULT_ROOT, "extensions", extension.id, "assets", "preview.png");
      if (extension.preview.exists && extension.preview.errors.length === 0) {
        fs.copyFileSync(source, path.join(options.outputDir, "previews", `${extension.id}.png`));
      }
    }
  }
  console.log(markdown);
  if (report.status === "fail") return 1;
  if (report.status === "infra_error") return 2;
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(2);
  });
}
