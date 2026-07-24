import { posix } from "node:path";

const MIME_TYPES = Object.freeze({
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".cast": "application/x-asciicast",
  ".config": "application/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".csproj": "application/xml; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".nuspec": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".props": "application/xml; charset=utf-8",
  ".resx": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".text": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".tsx": "text/plain; charset=utf-8",
  ".targets": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".trx": "application/xml; charset=utf-8",
  ".webp": "image/webp",
  ".xaml": "application/xml; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".zip": "application/zip",
});

const TEXT_EXTENSIONS = new Set([
  ".config", ".css", ".csproj", ".csv", ".htm", ".html", ".ini", ".js",
  ".json", ".log", ".map", ".md", ".mjs", ".nuspec", ".props", ".ps1",
  ".resx", ".sh", ".targets", ".text", ".toml", ".ts", ".tsx", ".txt",
  ".trx", ".xaml", ".xml", ".yaml", ".yml",
]);

const XML_EXTENSIONS = new Set([
  ".config", ".csproj", ".nuspec", ".props", ".resx", ".targets", ".xaml",
  ".trx", ".xml",
]);

export function extensionOf(path) {
  const base = posix.basename(path);
  const index = base.lastIndexOf(".");
  return index > 0 ? base.slice(index).toLowerCase() : "";
}

export function mimeForPath(path) {
  return MIME_TYPES[extensionOf(path)] ?? "application/octet-stream";
}

export function kindForPath(path) {
  const extension = extensionOf(path);
  if (extension === ".cast") return "asciinema";
  if (extension === ".trx") return "trx";
  if (extension === ".html" || extension === ".htm") return "html";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".svg", ".ico"].includes(extension)) {
    return "image";
  }
  if (extension === ".pdf") return "pdf";
  if (extension === ".md") return "markdown";
  if (extension === ".json" || extension === ".map") return "json";
  if (XML_EXTENSIONS.has(extension)) return "xml";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  if ([".zip", ".gz", ".tgz", ".7z", ".tar", ".rar"].includes(extension)) return "archive";
  return "binary";
}

export function hasRootIndexHtml(entries) {
  return entries.some((entry) => {
    if (!entry?.supported) return false;
    const path = String(entry?.name ?? entry?.path ?? "")
      .replaceAll("\\", "/")
      .replace(/^\.\/+/, "");
    return path.toLocaleLowerCase() === "index.html";
  });
}

function shallowest(entries) {
  return [...entries].sort((left, right) => {
    const depth = left.name.split("/").length - right.name.split("/").length;
    return depth || left.name.localeCompare(right.name);
  })[0] ?? null;
}

async function looksLikeAsciinema(entry, readHead) {
  if (kindForPath(entry.name) === "asciinema") return true;
  if (
    entry.uncompressedSize > 8 * 1024 * 1024 ||
    !/(recording|asciinema|terminal|session)/i.test(posix.basename(entry.name))
  ) {
    return false;
  }
  let head;
  try {
    head = await readHead(entry);
  } catch {
    return false;
  }
  if (!head) return false;
  const firstLine = head.toString("utf8").split(/\r?\n/, 1)[0].trim();
  if (!firstLine.startsWith("{")) return false;
  try {
    const header = JSON.parse(firstLine);
    return (
      (header.version === 2 || header.version === 3) &&
      Number.isFinite(header.width) &&
      Number.isFinite(header.height)
    );
  } catch {
    return false;
  }
}

export async function analyzeArtifact(index, readHead) {
  const files = index.entries.filter((entry) => !entry.directory);
  const previewableFiles = files.filter((entry) => entry.supported);
  const castEntries = [];
  for (const entry of previewableFiles.slice(0, 2_000)) {
    if (await looksLikeAsciinema(entry, readHead)) castEntries.push(entry);
  }

  const htmlEntries = previewableFiles.filter(
    (entry) => kindForPath(entry.name) === "html",
  );
  const indexEntries = htmlEntries.filter(
    (entry) => posix.basename(entry.name).toLowerCase() === "index.html",
  );
  const rootIndexEntry = indexEntries.find(
    (entry) => hasRootIndexHtml([entry]),
  );
  const firstTrx = shallowest(
    previewableFiles.filter((entry) => kindForPath(entry.name) === "trx"),
  );
  const firstImage = shallowest(
    previewableFiles.filter((entry) => kindForPath(entry.name) === "image"),
  );
  const firstMarkdown = shallowest(
    previewableFiles.filter((entry) => kindForPath(entry.name) === "markdown"),
  );
  const firstText = shallowest(
    previewableFiles.filter((entry) =>
      ["json", "text", "xml"].includes(kindForPath(entry.name)),
    ),
  );

  let primary = null;
  if (rootIndexEntry) {
    primary = {
      kind: "static-site",
      path: rootIndexEntry.name,
      root: "",
      label: "Static HTML site",
    };
  } else if (castEntries.length) {
    primary = {
      kind: "asciinema",
      path: castEntries[0].name,
      label: castEntries.length === 1 ? "Asciinema recording" : `${castEntries.length} Asciinema recordings`,
    };
  } else if (firstTrx) {
    primary = { kind: "trx", path: firstTrx.name, label: "Test results" };
  } else if (firstImage) {
    primary = { kind: "image", path: firstImage.name, label: "Image preview" };
  } else if (firstMarkdown) {
    primary = { kind: "markdown", path: firstMarkdown.name, label: "Markdown document" };
  } else if (firstText) {
    const kind = kindForPath(firstText.name);
    primary = {
      kind,
      path: firstText.name,
      label: kind === "xml" ? "XML code" : kind === "json" ? "JSON code" : "Text preview",
    };
  }

  const counts = {};
  const entries = files.map((entry) => {
    const detectedKind = castEntries.includes(entry) ? "asciinema" : kindForPath(entry.name);
    counts[detectedKind] = (counts[detectedKind] ?? 0) + 1;
    return {
      path: entry.name,
      name: posix.basename(entry.name),
      size: entry.uncompressedSize,
      compressedSize: entry.compressedSize,
      kind: detectedKind,
      mime: detectedKind === "asciinema" ? "application/x-asciicast" : mimeForPath(entry.name),
      supported: entry.supported,
      modifiedAt: entry.modifiedAt,
    };
  });

  return {
    primary,
    entries,
    counts,
    fileCount: files.length,
    totalUncompressedBytes: index.totalUncompressedBytes,
    zipBacked: true,
  };
}

export function isInlineTextKind(kind) {
  return ["json", "markdown", "text", "trx", "xml"].includes(kind);
}
