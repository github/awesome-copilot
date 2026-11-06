import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PNG_HEADER = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function readExternalCanvasGalleries(entries, plugins, root, ref) {
  assert.ok(Array.isArray(entries), "External extension metadata must be an array");
  assert.match(ref, /^[a-f0-9]{40}$/i, "Gallery assets require a pinned website revision");
  const canvases = new Set(plugins.filter(plugin =>
    plugin.keywords?.includes("canvas") || plugin.tags?.includes("canvas")
  ).map(plugin => plugin.name));
  const galleries = new Map();

  for (const entry of entries) {
    if (!entry?.pluginName) continue;
    const name = entry.pluginName;
    assert.ok(canvases.has(name), `Gallery owner is not a registered canvas plugin: ${name}`);
    assert.ok(!galleries.has(name), `Duplicate gallery for external plugin: ${name}`);
    const gallery = entry.screenshots?.gallery;
    assert.ok(Array.isArray(gallery) && gallery.length > 0 && gallery.length <= 6,
      `${name}: screenshots.gallery must contain between one and six images`);
    const assetRoot = fs.realpathSync(path.join(root, "extensions", "external-assets"));
    const seen = new Set();
    galleries.set(name, gallery.map(image => {
      assert.ok(image && typeof image === "object", `${name}: gallery images need path and alt fields`);
      assert.ok(typeof image.path === "string" &&
        /^extensions\/external-assets\/[a-z0-9/_-]+\.png$/.test(image.path) &&
        !image.path.split("/").some(part => part === "." || part === ".."),
      `${name}: gallery paths must name PNG files under extensions/external-assets`);
      assert.ok(!seen.has(image.path), `${name}: duplicate gallery image`);
      seen.add(image.path);
      assert.ok(typeof image.alt === "string" && image.alt.trim() && image.alt.length <= 200,
        `${name}: gallery images need descriptive alt text of at most 200 characters`);
      assert.ok(image.caption === undefined ||
        typeof image.caption === "string" && image.caption.trim() && image.caption.length <= 300,
      `${name}: gallery captions must be non-empty text of at most 300 characters`);
      const file = fs.realpathSync(path.join(root, ...image.path.split("/")));
      const relative = path.relative(assetRoot, file);
      assert.ok(relative && !path.isAbsolute(relative) && relative !== ".." &&
        !relative.startsWith(`..${path.sep}`), `${name}: gallery image escapes the asset directory`);
      const stat = fs.statSync(file);
      assert.ok(stat.isFile() && stat.size <= MAX_IMAGE_BYTES, `${name}: gallery images must be files under 5 MiB`);
      assert.ok(fs.readFileSync(file).subarray(0, PNG_HEADER.length).equals(PNG_HEADER),
        `${name}: gallery image is not a PNG`);
      return {
        path: `https://raw.githubusercontent.com/github/awesome-copilot/${ref}/${image.path}`,
        type: "image/png",
        alt: image.alt.trim(),
        ...(image.caption ? { caption: image.caption.trim() } : {}),
      };
    }));
  }
  return galleries;
}
