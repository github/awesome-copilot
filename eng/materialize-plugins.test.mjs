import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { after, test } from "node:test";
import { materializeExtensionPlugin } from "./materialize-plugins.mjs";
import { cleanMaterializedExtensionPlugin } from "./clean-materialized-plugins.mjs";

const tempDirs = [];

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("materializeExtensionPlugin writes extension bundles to ./extensions and preserves root logo assets", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "materialize-extension-plugin-"));
  tempDirs.push(tempDir);

  const pluginDir = path.join(tempDir, "extension-plugin");
  fs.mkdirSync(path.join(pluginDir, ".github", "plugin"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, ".github", "plugin", "plugin.json"), JSON.stringify({
    name: "test-extension-plugin",
    description: "test plugin",
    version: "1.0.0",
    logo: "assets/preview.png",
    extensions: ".",
  }, null, 2));
  fs.writeFileSync(path.join(pluginDir, "extension.mjs"), "export default {};\n");
  fs.writeFileSync(path.join(pluginDir, "README.md"), "# test\n");
  fs.writeFileSync(path.join(pluginDir, "assets", "preview.png"), "fake-image-bytes");

  const result = materializeExtensionPlugin(pluginDir);
  const bundleRoot = path.join(pluginDir, "extensions", "extension-plugin");

  assert.equal(result.skipped, false);
  assert.equal(result.manifestUpdated, true);
  assert.equal(result.movedEntries, 3);
  assert.equal(fs.existsSync(path.join(bundleRoot, "extension.mjs")), true);
  assert.equal(fs.existsSync(path.join(bundleRoot, "assets", "preview.png")), true);
  assert.equal(fs.existsSync(path.join(bundleRoot, "README.md")), true);
  assert.equal(fs.existsSync(path.join(pluginDir, "extensions", ".github")), false);
  assert.equal(fs.existsSync(path.join(pluginDir, "extension.mjs")), false);
  assert.equal(fs.existsSync(path.join(pluginDir, "README.md")), false);
  assert.equal(fs.existsSync(path.join(pluginDir, "assets", "preview.png")), true);

  const pluginManifest = JSON.parse(
    fs.readFileSync(path.join(pluginDir, ".github", "plugin", "plugin.json"), "utf8")
  );
  assert.equal(pluginManifest.extensions, "extensions");
  assert.equal(pluginManifest.logo, "assets/preview.png");
});

test("cleanMaterializedExtensionPlugin restores moved extension files to root", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clean-materialized-extension-plugin-"));
  tempDirs.push(tempDir);

  const pluginDir = path.join(tempDir, "extension-plugin");
  fs.mkdirSync(path.join(pluginDir, ".github", "plugin"), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, ".github", "plugin", "plugin.json"), JSON.stringify({
    name: "test-extension-plugin",
    description: "test plugin",
    version: "1.0.0",
    logo: "assets/preview.png",
    extensions: ".",
  }, null, 2));
  fs.writeFileSync(path.join(pluginDir, "extension.mjs"), "export default {};\n");
  fs.writeFileSync(path.join(pluginDir, "README.md"), "# test\n");
  fs.writeFileSync(path.join(pluginDir, "assets", "preview.png"), "fake-image-bytes");

  materializeExtensionPlugin(pluginDir);
  const result = cleanMaterializedExtensionPlugin(pluginDir);

  assert.equal(result.removed, 3);
  assert.equal(result.manifestUpdated, true);
  assert.equal(fs.existsSync(path.join(pluginDir, "extension.mjs")), true);
  assert.equal(fs.existsSync(path.join(pluginDir, "README.md")), true);
  assert.equal(fs.existsSync(path.join(pluginDir, "assets", "preview.png")), true);
  assert.equal(fs.existsSync(path.join(pluginDir, "extensions")), false);

  const pluginManifest = JSON.parse(
    fs.readFileSync(path.join(pluginDir, ".github", "plugin", "plugin.json"), "utf8")
  );
  assert.equal(pluginManifest.extensions, ".");
  assert.equal(pluginManifest.logo, "assets/preview.png");
});
