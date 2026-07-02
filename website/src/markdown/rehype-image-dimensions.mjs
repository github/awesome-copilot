import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dimensionsCache = new Map();

export function rehypeImageDimensions({ publicDir } = {}) {
  const publicPath = fileURLToPath(publicDir ?? new URL("../../public/", import.meta.url));

  return function addImageDimensions(tree) {
    visitElements(tree, (node) => {
      if (node.tagName !== "img") return;

      const properties = node.properties ?? {};
      const src = String(properties.src ?? "");
      if (!src.startsWith("/images/")) return;

      const dimensions = getImageDimensions(path.join(publicPath, src));
      if (!dimensions) return;

      const width = parseLength(properties.width);
      const height = parseLength(properties.height);

      if (!width && !height) {
        properties.width = dimensions.width;
        properties.height = dimensions.height;
      } else if (width && !height) {
        properties.height = Math.round((dimensions.height * width) / dimensions.width);
      } else if (!width && height) {
        properties.width = Math.round((dimensions.width * height) / dimensions.height);
      }

      node.properties = properties;
    });
  };
}

function visitElements(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (node.type === "element") visitor(node);

  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visitElements(child, visitor);
}

function parseLength(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;

  return Number(trimmed);
}

function getImageDimensions(filePath) {
  if (dimensionsCache.has(filePath)) return dimensionsCache.get(filePath);

  let dimensions;
  try {
    const buffer = readFileSync(filePath);
    dimensions = readDimensions(buffer);
  } catch {
    dimensions = undefined;
  }

  dimensionsCache.set(filePath, dimensions);
  return dimensions;
}

function readDimensions(buffer) {
  if (isPng(buffer)) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (isGif(buffer)) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (isJpeg(buffer)) return readJpegDimensions(buffer);
  if (isWebp(buffer)) return readWebpDimensions(buffer);

  return undefined;
}

function isPng(buffer) {
  return buffer.length > 24 && buffer.toString("ascii", 1, 4) === "PNG";
}

function isGif(buffer) {
  return buffer.length > 10 && buffer.toString("ascii", 0, 3) === "GIF";
}

function isJpeg(buffer) {
  return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function readJpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return undefined;

    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);
    if (size < 2) return undefined;

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + size;
  }

  return undefined;
}

function isWebp(buffer) {
  return (
    buffer.length > 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function readWebpDimensions(buffer) {
  const format = buffer.toString("ascii", 12, 16);

  if (format === "VP8X") {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
    };
  }

  if (format === "VP8 " && buffer.length > 29) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (format === "VP8L" && buffer.length > 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return undefined;
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}
