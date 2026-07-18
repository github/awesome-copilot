import { createServer } from "node:http";
import { posix } from "node:path";
import { Transform } from "node:stream";
import { getCachedEntry } from "./cache.mjs";
import { mimeForPath } from "./detector.mjs";
import { streamZipEntry } from "./zip.mjs";

const previewServers = new Map();
const HTML_INJECTION_SEARCH_BYTES = 64 * 1024;

const PREVIEW_CSP = [
  "default-src 'self' data: blob:",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'none'",
  "frame-src 'self' data: blob:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join("; ");

function normalizeTheme(value) {
  if (value !== "light" && value !== "dark") {
    throw new Error("Preview theme must be light or dark.");
  }
  return value;
}

function normalizeParentOrigin(value) {
  const origin = new URL(value);
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1") {
    throw new Error("Preview parent must use a loopback origin.");
  }
  return origin.origin;
}

function themeBridgeMarkup(theme, parentOrigin) {
  const initialTheme = JSON.stringify(theme);
  const expectedOrigin = JSON.stringify(parentOrigin);
  return `<script data-copilot-preview-theme>(()=>{const expectedOrigin=${expectedOrigin};const apply=theme=>{if(theme!=="light"&&theme!=="dark")return;const root=document.documentElement;const modeClass=theme+"-mode";const usesPlainMode=root.classList.contains("light")||root.classList.contains("dark");root.dataset.colorMode=theme;root.dataset.theme=theme;root.setAttribute("data-color-scheme",theme);root.setAttribute("data-bs-theme",theme);root.style.colorScheme=theme;root.classList.remove("light-mode","dark-mode");root.classList.add(modeClass);if(usesPlainMode){root.classList.toggle("light",theme==="light");root.classList.toggle("dark",theme==="dark")}try{localStorage.setItem("theme",modeClass)}catch{}};apply(${initialTheme});addEventListener("message",event=>{if(event.source!==window.parent||event.origin!==expectedOrigin||event.data?.type!=="copilot-preview-theme")return;apply(event.data.theme)});})();</script>`;
}

function insertionOffset(buffer, fallback = false) {
  const source = buffer.toString("utf8");
  const element = /<html(?:\s[^>]*)?>/i.exec(source) ?? /<head(?:\s[^>]*)?>/i.exec(source);
  if (element) {
    return Buffer.byteLength(
      source.slice(0, element.index + element[0].length),
      "utf8",
    );
  }
  if (!fallback) return null;
  const doctype = /<!doctype[^>]*>/i.exec(source);
  return doctype
    ? Buffer.byteLength(source.slice(0, doctype.index + doctype[0].length), "utf8")
    : 0;
}

function createHtmlInjectionTransform(markup) {
  const injection = Buffer.from(markup, "utf8");
  let pending = Buffer.alloc(0);
  let injected = false;

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (injected) {
        callback(null, chunk);
        return;
      }
      pending = Buffer.concat([pending, Buffer.from(chunk)]);
      const offset = insertionOffset(pending);
      if (offset !== null || pending.length >= HTML_INJECTION_SEARCH_BYTES) {
        const resolvedOffset = offset ?? insertionOffset(pending, true);
        this.push(pending.subarray(0, resolvedOffset));
        this.push(injection);
        this.push(pending.subarray(resolvedOffset));
        pending = Buffer.alloc(0);
        injected = true;
      }
      callback();
    },
    flush(callback) {
      if (!injected) {
        const offset = insertionOffset(pending, true);
        this.push(pending.subarray(0, offset));
        this.push(injection);
        this.push(pending.subarray(offset));
      }
      callback();
    },
  });
}

function decodeRequestPath(pathname) {
  try {
    return pathname
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/")
      .replace(/^\/+/, "");
  } catch (error) {
    throw Object.assign(
      new Error("Preview URL contains invalid encoding.", { cause: error }),
      { statusCode: 400 },
    );
  }
}

function safeRelativePath(path) {
  if (!path) return "";
  const normalized = posix.normalize(path.replaceAll("\\", "/"));
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    throw Object.assign(new Error("Preview path escapes the artifact root."), { statusCode: 400 });
  }
  return normalized;
}

async function servePreviewRequest(
  artifactId,
  root,
  entryName,
  theme,
  parentOrigin,
  req,
  res,
) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let relative = safeRelativePath(decodeRequestPath(url.pathname));
    if (!relative || relative.endsWith("/")) {
      relative = `${relative}${posix.basename(entryName)}`;
    }
    const requestedEntry = safeRelativePath(root ? posix.join(root, relative) : relative);
    const context = await getCachedEntry(artifactId, requestedEntry);
    if (!context.entry.supported) {
      res.writeHead(415, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("This file uses an unsupported ZIP encoding.");
      return;
    }
    const contentType = mimeForPath(context.entry.name);
    const themeBridge = contentType.startsWith("text/html")
      ? themeBridgeMarkup(theme, parentOrigin)
      : "";
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": String(
        context.entry.uncompressedSize + Buffer.byteLength(themeBridge),
      ),
      "Content-Security-Policy": PREVIEW_CSP,
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    if (themeBridge && context.entry.uncompressedSize === 0) {
      res.end(themeBridge);
      return;
    }
    await streamZipEntry(
      context.archivePath,
      context.entry,
      res,
      themeBridge ? createHtmlInjectionTransform(themeBridge) : null,
    );
  } catch (error) {
    if (!res.headersSent) {
      const status = error?.statusCode === 400 ? 400 : 404;
      res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Security-Policy": PREVIEW_CSP,
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      });
    }
    res.end(error instanceof Error ? error.message : String(error));
  }
}

export async function startStaticPreview(artifactId, entryPath, options) {
  const context = await getCachedEntry(artifactId, entryPath);
  if (!mimeForPath(context.entry.name).startsWith("text/html")) {
    throw new Error("Only HTML files can start a static preview.");
  }
  if (
    posix.dirname(context.entry.name) !== "." ||
    posix.basename(context.entry.name).toLowerCase() !== "index.html"
  ) {
    throw new Error("Static previews require the root index.html file.");
  }
  const rootValue = posix.dirname(context.entry.name);
  const root = rootValue === "." ? "" : rootValue;
  const theme = normalizeTheme(options?.theme);
  const parentOrigin = normalizeParentOrigin(options?.parentOrigin);
  const key = JSON.stringify([
    String(artifactId),
    root,
    posix.basename(context.entry.name),
    theme,
    parentOrigin,
  ]);
  const existing = previewServers.get(key);
  if (existing) return existing.url;

  const server = createServer((req, res) => {
    void servePreviewRequest(
      String(artifactId),
      root,
      context.entry.name,
      theme,
      parentOrigin,
      req,
      res,
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("Static preview server did not receive a TCP port.");
  }
  const url = `http://127.0.0.1:${address.port}/`;
  previewServers.set(key, { artifactId: String(artifactId), server, url, canvasOrigin: parentOrigin });
  return url;
}

export async function stopStaticPreviewsForArtifact(artifactId) {
  const id = String(artifactId);
  const matching = [...previewServers.entries()].filter(
    ([, value]) => value.artifactId === id,
  );
  await Promise.all(
    matching.map(async ([key, value]) => {
      previewServers.delete(key);
      await new Promise((resolve) => value.server.close(resolve));
    }),
  );
}

export async function stopStaticPreviewsForOrigin(canvasOrigin) {
  const matching = [...previewServers.entries()].filter(
    ([, value]) => value.canvasOrigin === canvasOrigin,
  );
  await Promise.all(
    matching.map(async ([key, value]) => {
      previewServers.delete(key);
      await new Promise((resolve) => value.server.close(resolve));
    }),
  );
}

export async function stopAllStaticPreviews() {
  const active = [...previewServers.values()];
  previewServers.clear();
  await Promise.all(
    active.map((value) => new Promise((resolve) => value.server.close(resolve))),
  );
}
