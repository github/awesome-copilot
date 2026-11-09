import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readExternalCanvasGalleries } from "./external-canvas-presentation.mjs";

const ref = "a".repeat(40);
const plugins = [{ name: "example", keywords: ["canvas"] }];
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "external-canvas-gallery-"));
  fs.mkdirSync(path.join(root, "extensions", "external-assets", "example"), { recursive: true });
  fs.writeFileSync(path.join(root, "extensions", "external-assets", "example", "preview.png"), png);
  t.after(() => fs.rmSync(root, { recursive: true }));
  const image = {
    path: "extensions/external-assets/example/preview.png",
    alt: "An example canvas with sample data",
    caption: "Example canvas, shown with sample data.",
  };
  return { root, image, entry: { pluginName: "example", screenshots: { gallery: [image] } } };
}

test("registered canvas galleries resolve real assets at the website revision without changing plugin metadata", t => {
  const { root, image, entry } = fixture(t);
  const before = structuredClone(plugins);
  const result = readExternalCanvasGalleries([entry], plugins, root, ref);
  assert.deepEqual(result.get("example"), [{
    path: `https://raw.githubusercontent.com/github/awesome-copilot/${ref}/${image.path}`,
    type: "image/png",
    alt: image.alt,
    caption: image.caption,
  }]);
  assert.deepEqual(plugins, before);
});

test("ordinary source-only external entries remain outside marketplace gallery overrides", t => {
  const { root } = fixture(t);
  assert.equal(readExternalCanvasGalleries([{ id: "ordinary", name: "Ordinary" }], plugins, root, ref).size, 0);
});

test("gallery owners must be registered canvas plugins and cannot be duplicated", t => {
  const { root, entry } = fixture(t);
  assert.throws(() => readExternalCanvasGalleries([{ ...entry, pluginName: "missing" }], plugins, root, ref), /registered canvas plugin/);
  assert.throws(() => readExternalCanvasGalleries([entry], [{ name: "example", keywords: ["skill"] }], root, ref), /registered canvas plugin/);
  assert.throws(() => readExternalCanvasGalleries([entry, entry], plugins, root, ref), /Duplicate gallery/);
});

test("unsafe paths, remote URLs, missing files and invalid image contents are rejected", t => {
  const { root, image } = fixture(t);
  for (const file of ["../preview.png", "extensions/external-assets/../preview.png",
    "https://example.com/image.png", "extensions/external-assets/example/missing.png"]) {
    assert.throws(() => readExternalCanvasGalleries([{
      pluginName: "example", screenshots: { gallery: [{ ...image, path: file }] },
    }], plugins, root, ref));
  }
  fs.writeFileSync(path.join(root, ...image.path.split("/")), "not an image");
  assert.throws(() => readExternalCanvasGalleries([{
    pluginName: "example", screenshots: { gallery: [image] },
  }], plugins, root, ref), /not a PNG/);
});

test("gallery metadata requires bounded images and meaningful accessible text", t => {
  const { root, entry, image } = fixture(t);
  for (const gallery of [[], [image, image], [{ ...image, alt: "" }],
    [{ ...image, caption: "" }], Array.from({ length: 7 }, () => image)]) {
    assert.throws(() => readExternalCanvasGalleries([{
      ...entry, screenshots: { gallery },
    }], plugins, root, ref));
  }
  const file = fs.openSync(path.join(root, ...image.path.split("/")), "w");
  fs.ftruncateSync(file, 5 * 1024 * 1024 + 1);
  fs.closeSync(file);
  assert.throws(() => readExternalCanvasGalleries([entry], plugins, root, ref), /under 5 MiB/);
});
