import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { test } from "node:test";
import {
  checkExtensionModules,
  checkPreview,
  classifySpecifier,
  detectCanvasTargets,
  findUnsafeManifestPaths,
  inspectExtensionFiles,
  inspectPng,
  parseEsModule,
  isSafeExtensionId,
  readRegularFile,
  renderMarkdownReport,
  runCanvasSmokeTest,
  stripComments,
  unsafeExtensionRefs,
  unsafePathReason,
} from "./canvas-smoke-test.mjs";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function makePng(width, height, { truncate = false } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor
  const rows = Buffer.alloc(height * (width * 3 + 1));
  const raw = truncate ? rows.subarray(0, rows.length / 2) : rows;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-smoke-test-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof content === "string" || Buffer.isBuffer(content) ? content : JSON.stringify(content, null, 2));
  }
  return root;
}

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

function extensionPlugin(name) {
  return {
    $schema: PLUGIN_SCHEMA,
    name,
    description: `${name} canvas`,
    version: "1.0.0",
    extensions: { "com.github.copilot": { logo: "assets/preview.png" } },
  };
}

test("inspectPng accepts a valid PNG and reports dimensions", () => {
  const result = inspectPng(makePng(32, 16));
  assert.equal(result.ok, true);
  assert.equal(result.width, 32);
  assert.equal(result.height, 16);
});

test("inspectPng rejects non-PNG, corrupted, and truncated data", () => {
  assert.match(inspectPng(Buffer.from("GIF89a-not-a-png-at-all")).errors[0], /signature/);

  const corrupted = makePng(8, 8);
  corrupted[corrupted.length - 20] ^= 0xff;
  assert.equal(inspectPng(corrupted).ok, false);

  const truncated = inspectPng(makePng(8, 8, { truncate: true }));
  assert.equal(truncated.ok, false);
  assert.match(truncated.errors[0], /truncated/);
});

test("checkPreview enforces configurable minimum dimensions", () => {
  const root = makeRepo({ "ext/assets/preview.png": makePng(100, 50) });
  const small = checkPreview(path.join(root, "ext"), { minWidth: 400, minHeight: 160 });
  assert.match(small.errors[0], /minimum is 400×160/);
  const ok = checkPreview(path.join(root, "ext"), { minWidth: 100, minHeight: 50 });
  assert.deepEqual(ok.errors, []);
  const missing = checkPreview(path.join(root, "missing"), { minWidth: 1, minHeight: 1 });
  assert.match(missing.errors[0], /missing/);
});

test("unsafePathReason flags absolute and traversal paths", () => {
  assert.equal(unsafePathReason("./assets/preview.png"), null);
  assert.equal(unsafePathReason("assets/preview.png"), null);
  assert.match(unsafePathReason("../secrets.txt"), /traversal/);
  assert.match(unsafePathReason("./a/../../b"), /traversal/);
  assert.match(unsafePathReason("/etc/passwd"), /absolute/);
  assert.match(unsafePathReason("C:\\Windows\\system32"), /Windows/);
  assert.match(unsafePathReason("file:///tmp/x.mjs"), /file:/);
});

test("findUnsafeManifestPaths ignores prose and URLs", () => {
  const findings = findUnsafeManifestPaths({
    description: "Reads ../ style docs and / separators in text",
    homepage: "https://example.com/../x",
    extensions: { "com.github.copilot": { logo: "../outside.png" } },
    main: "/abs/entry.mjs",
  });
  assert.deepEqual(findings.map((finding) => finding.field).sort(), ["$.extensions.com.github.copilot.logo", "$.main"]);
});

test("classifySpecifier distinguishes builtins, host packages, dependencies, and unsafe specifiers", () => {
  const pkg = { dependencies: { playwright: "1.0.0" }, devDependencies: { vitest: "1.0.0" } };
  assert.equal(classifySpecifier("node:fs", pkg).kind, "builtin");
  assert.equal(classifySpecifier("path", pkg).kind, "builtin");
  assert.equal(classifySpecifier("@github/copilot-sdk/extension", pkg).kind, "host");
  assert.equal(classifySpecifier("playwright/test", pkg).kind, "dependency");
  assert.equal(classifySpecifier("vitest", pkg).kind, "dev-dependency");
  assert.equal(classifySpecifier("left-pad", pkg).kind, "undeclared");
  assert.equal(classifySpecifier("/tmp/evil.mjs", pkg).kind, "unsafe");
  assert.equal(classifySpecifier("https://example.com/x.mjs", pkg).kind, "remote");
  assert.equal(classifySpecifier("./local.mjs", pkg).kind, "relative");
});

test("parseEsModule returns static specifiers without executing code", () => {
  const marker = path.join(os.tmpdir(), `canvas-smoke-exec-${process.pid}-${Date.now()}`);
  const source = `import fs from "node:fs";\nimport { x } from "./x.mjs";\nfs.writeFileSync(${JSON.stringify(marker)}, "ran");\n`;
  const result = parseEsModule(source, "entry.mjs");
  assert.equal(result.ok, true);
  assert.deepEqual(result.specifiers.sort(), ["./x.mjs", "node:fs"]);
  assert.equal(fs.existsSync(marker), false);

  const broken = parseEsModule("export const = 1;", "broken.mjs");
  assert.equal(broken.ok, false);
});

test("checkExtensionModules reports syntax errors, missing files, traversal, and undeclared packages", () => {
  const root = makeRepo({
    "extensions/bad/extension.mjs": [
      'import { joinSession } from "@github/copilot-sdk/extension";',
      'import { spawn } from "node:child_process";',
      'import helper from "./lib/helper.mjs";',
      'import missing from "./lib/missing.mjs";',
      'import outside from "../other/secret.mjs";',
      'import pad from "left-pad";',
      "export default { joinSession, spawn, helper, missing, outside, pad };",
    ].join("\n"),
    "extensions/bad/lib/helper.mjs": "export default fetch;\nexport const broken = ;\n",
    "extensions/bad/public/app.js": 'import { h } from "/vendor/preact.js";\nexport default h;\n',
    "extensions/bad/package.json": { name: "bad", version: "1.0.0" },
    "extensions/other/secret.mjs": "export default 1;\n",
  });
  const result = checkExtensionModules(path.join(root, "extensions", "bad"));
  const text = result.errors.join("\n");
  assert.match(text, /lib\/helper\.mjs: syntax error/);
  assert.match(text, /\.\/lib\/missing\.mjs" references a missing file/);
  assert.match(text, /escapes the extension directory/);
  assert.match(text, /"left-pad" is not a Node\.js builtin/);
  assert.doesNotMatch(text, /public\/app\.js/);
  assert.match(result.warnings.join("\n"), /public\/app\.js: import "\/vendor\/preact\.js" uses an unsafe absolute path \(module is not reachable/);
  assert.deepEqual(result.builtins, ["child_process"]);
});

test("inspectExtensionFiles flags native binaries, executables, and vendored node_modules", () => {
  const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(32)]);
  const root = makeRepo({
    "extensions/bin/extension.mjs": "export {};\n",
    "extensions/bin/tool": elf,
    "extensions/bin/addon.node": "not really native",
    "extensions/bin/run.sh": "#!/bin/sh\necho hi\n",
    "extensions/bin/assets/preview.png": makePng(4, 4),
    "extensions/bin/node_modules/dep/index.js": "module.exports = 1;\n",
    "extensions/bin/data.bin.dat": Buffer.from([0, 1, 2, 3]),
    "extensions/bin/tool.py": "print(1)\n",
  });
  const modes = new Map([["extensions/bin/run.sh", "100755"]]);
  const result = inspectExtensionFiles(path.join(root, "extensions", "bin"), { rootDir: root, fileModes: modes });
  const errors = result.errors.join("\n");
  assert.match(errors, /tool: contains a ELF executable/);
  assert.match(errors, /addon\.node: native\/compiled binary/);
  assert.match(errors, /run\.sh: file is marked executable/);
  assert.match(errors, /node_modules\/: vendored node_modules/);
  assert.match(result.warnings.join("\n"), /run\.sh: script file/);
  assert.match(result.warnings.join("\n"), /data\.bin\.dat: unexpected binary content/);
  assert.match(result.warnings.join("\n"), /tool\.py: script file/);
  assert.doesNotMatch(result.warnings.join("\n"), /preview\.png/);
});

test("detectCanvasTargets maps changed paths to extensions and extension-bearing plugins", () => {
  const root = makeRepo({
    "extensions/orb/extension.mjs": "export {};\n",
    "extensions/shared/extension.mjs": "export {};\n",
    "plugins/orb/plugin.json": extensionPlugin("orb"),
    "plugins/bundle/plugin.json": {
      $schema: PLUGIN_SCHEMA,
      name: "bundle",
      description: "bundle",
      version: "1.0.0",
      extensions: { "com.github.awesome-copilot": { extensions: ["./extensions/shared"] } },
    },
    "plugins/plain/plugin.json": { $schema: PLUGIN_SCHEMA, name: "plain", description: "plain", version: "1.0.0" },
  });

  assert.deepEqual(detectCanvasTargets(["README.md", "plugins/plain/README.md", "skills/x/SKILL.md"], { rootDir: root }).extensions, []);

  const orb = detectCanvasTargets(["extensions/orb/extension.mjs"], { rootDir: root });
  assert.deepEqual(orb.extensions, ["orb"]);
  assert.deepEqual(orb.plugins, ["orb"]);

  const bundle = detectCanvasTargets(["plugins/bundle/plugin.json", "extensions/gone/extension.mjs"], { rootDir: root });
  assert.deepEqual(bundle.extensions, ["shared"]);
  assert.deepEqual(bundle.plugins, ["bundle"]);
  assert.deepEqual(bundle.removedExtensions, ["gone"]);
});

test("runCanvasSmokeTest reports skipped when no canvas paths change", async () => {
  const root = makeRepo({ "plugins/plain/plugin.json": { name: "plain" } });
  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["docs/README.md"], install: "never" });
  assert.equal(report.status, "skipped");
  assert.match(renderMarkdownReport(report), /Skipped/);
});

test("runCanvasSmokeTest materializes a valid extension plugin and renders evidence", async () => {
  const root = makeRepo({
    "extensions/orb/extension.mjs": 'import { joinSession } from "@github/copilot-sdk/extension";\nimport http from "node:http";\nexport default { joinSession, http };\n',
    "extensions/orb/package.json": { name: "orb", version: "1.0.0", type: "module" },
    "extensions/orb/assets/preview.png": makePng(800, 400),
    "plugins/orb/plugin.json": extensionPlugin("orb"),
    "plugins/orb/README.md": "# Orb\n",
  });
  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["extensions/orb/extension.mjs"], install: "never" });
  assert.equal(report.status, "pass", JSON.stringify(report, null, 2));
  assert.equal(report.smoke.materialize.orb.status, "pass");
  assert.equal(report.smoke.installStatus, "skipped");
  assert.equal(report.extensions[0].preview.width, 800);

  const markdown = renderMarkdownReport(report, { previewBaseUrl: "https://raw.githubusercontent.com/o/r/sha/" });
  assert.match(markdown, /<!-- canvas-smoke-test -->/);
  assert.match(markdown, /Network sockets/);
  assert.match(markdown, /extensions\/orb\/assets\/preview\.png/);
});

test("runCanvasSmokeTest fails for an unregistered extension with a missing preview", async () => {
  const root = makeRepo({ "extensions/lonely/extension.mjs": "export {};\n" });
  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["extensions/lonely/extension.mjs"], install: "never" });
  assert.equal(report.status, "fail");
  const errors = report.extensions[0].errors.join("\n");
  assert.match(errors, /preview\.png is missing/);
  assert.match(errors, /not registered by any plugin/);
});

test("inspectPng rejects images whose decoded data exceeds the budget before inflating", () => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(16000, 0);
  header.writeUInt32BE(16000, 4);
  header[8] = 16; // bit depth
  header[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.alloc(1024))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const result = inspectPng(png);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /decoded image data would be/);
});

test("inspectPng rejects image data larger than IHDR allows", () => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(4, 0);
  header.writeUInt32BE(4, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.alloc(10_000))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  assert.match(inspectPng(png).errors[0], /larger than the IHDR/);
});

test("findUnsafeManifestPaths reports file: URLs", () => {
  const findings = findUnsafeManifestPaths({ main: "file:///tmp/x.mjs", homepage: "https://example.com/x" });
  assert.deepEqual(findings.map((finding) => finding.field), ["$.main"]);
  assert.match(findings[0].reason, /file:/);
});

test("checkExtensionModules follows CommonJS requires and literal dynamic imports", () => {
  const root = makeRepo({
    "extensions/graph/extension.mjs": [
      'import cjs from "./lib/legacy.cjs";',
      'const worker = await import("./lib/worker.mjs");',
      'const later = await import("./lib/missing.mjs");',
      "// import(\"./lib/commented.mjs\")",
      "export default { cjs, worker, later };",
    ].join("\n"),
    "extensions/graph/lib/legacy.cjs": [
      'const helper = require("./helper");',
      'const pad = require("left-pad");',
      'const outside = require("../../other/x.js");',
      "// require(\"ignored-in-comment\")",
      "module.exports = { helper, pad, outside };",
    ].join("\n"),
    "extensions/graph/lib/helper.js": "module.exports = 1;\n",
    "extensions/graph/lib/worker.mjs": 'import { spawn } from "node:child_process";\nimport vitest from "vitest";\nexport default { spawn, vitest };\n',
    "extensions/graph/package.json": { name: "graph", version: "1.0.0", devDependencies: { vitest: "1.0.0" } },
    "extensions/other/x.js": "module.exports = 1;\n",
  });
  const result = checkExtensionModules(path.join(root, "extensions", "graph"));
  const errors = result.errors.join("\n");
  assert.match(errors, /legacy\.cjs: require\("left-pad"\) is not a Node\.js builtin/);
  assert.match(errors, /legacy\.cjs: require\("\.\.\/\.\.\/other\/x\.js"\) escapes the extension directory/);
  assert.doesNotMatch(errors, /require\("\.\/helper"\)/);
  assert.doesNotMatch(errors, /ignored-in-comment|commented\.mjs/);
  assert.match(errors, /dynamic import\("\.\/lib\/missing\.mjs"\) references a missing file/);
  assert.match(errors, /worker\.mjs: import "vitest" is only declared in devDependencies/);
  assert.deepEqual(result.builtins, ["child_process"]);
  assert.ok(result.modules.find((entry) => entry.path === "lib/worker.mjs").reachable);
  assert.ok(result.modules.find((entry) => entry.path === "lib/helper.js").reachable);
});

test("removed canvas paths are validated instead of skipped", async () => {
  // Entry point deleted but the extension directory remains.
  const partial = makeRepo({
    "extensions/orb/assets/preview.png": makePng(800, 400),
    "plugins/orb/plugin.json": extensionPlugin("orb"),
  });
  const partialReport = await runCanvasSmokeTest({ rootDir: partial, changedFiles: ["extensions/orb/extension.mjs"], install: "never" });
  assert.equal(partialReport.status, "fail");
  assert.match(partialReport.extensions[0].errors.join("\n"), /extension\.mjs: entry point is missing/);

  // Extension deleted, but its direct plugin and a bundling plugin remain.
  const orphaned = makeRepo({
    "plugins/orb/plugin.json": extensionPlugin("orb"),
    "plugins/bundle/plugin.json": {
      $schema: PLUGIN_SCHEMA,
      name: "bundle",
      description: "bundle",
      version: "1.0.0",
      extensions: { "com.github.awesome-copilot": { extensions: ["./extensions/orb"] } },
    },
  });
  const orphanedTargets = detectCanvasTargets(["extensions/orb/extension.mjs"], { rootDir: orphaned });
  assert.deepEqual(orphanedTargets.plugins, ["bundle", "orb"]);
  const orphanedReport = await runCanvasSmokeTest({ rootDir: orphaned, changedFiles: ["extensions/orb/extension.mjs"], install: "never" });
  assert.equal(orphanedReport.status, "fail");
  const pluginErrors = orphanedReport.plugins.flatMap((plugin) => plugin.errors).join("\n");
  assert.match(pluginErrors, /plugins\/orb is the plugin for removed extension/);
  assert.match(pluginErrors, /plugins\/bundle\/plugin\.json references missing extension extensions\/orb/);

  // Extension and plugin both deleted: accepted.
  const clean = makeRepo({ "plugins/plain/plugin.json": { name: "plain" } });
  const cleanReport = await runCanvasSmokeTest({
    rootDir: clean,
    changedFiles: ["extensions/orb/extension.mjs", "plugins/orb/plugin.json"],
    install: "never",
  });
  assert.equal(cleanReport.status, "pass");
  assert.match(renderMarkdownReport(cleanReport), /removed extensions/);
});

test("stripComments keeps string, template, and regex literals that contain comment markers", () => {
  const source = [
    'const s = "x//y"; await import("./a.mjs");',
    "const t = `/* ${'//'} */`; await import(\"./b.mjs\");",
    'const r = /\\/\\*/; await import("./c.mjs");',
    '// await import("./hidden.mjs");',
    '/* await import("./hidden2.mjs"); */',
    'const q = a / b; const w = c / d; await import("./d.mjs");',
  ].join("\n");
  const text = stripComments(source);
  for (const name of ["a", "b", "c", "d"]) assert.match(text, new RegExp(`import\\("\\./${name}\\.mjs"\\)`));
  assert.doesNotMatch(text, /hidden/);
  assert.equal(text.split("\n").length, source.split("\n").length);
});

test("checkExtensionModules follows imports placed after strings containing //", () => {
  const root = makeRepo({
    "extensions/str/extension.mjs": 'const s = "x//y"; const w = await import("./worker.mjs");\nexport default { s, w };\n',
    "extensions/str/worker.mjs": 'import pad from "left-pad";\nexport default pad;\n',
  });
  const result = checkExtensionModules(path.join(root, "extensions", "str"));
  assert.match(result.errors.join("\n"), /worker\.mjs: import "left-pad" is not a Node\.js builtin/);
  assert.ok(result.modules.find((entry) => entry.path === "worker.mjs").reachable);
});

test("readRegularFile and checkExtensionModules refuse symlinked files", (t) => {
  const root = makeRepo({
    "outside/secret.txt": "secret\n",
    "extensions/link/extension.mjs": 'import x from "./lib.mjs";\nexport default x;\n',
  });
  const extensionDir = path.join(root, "extensions", "link");
  try {
    fs.symlinkSync(path.join(root, "outside", "secret.txt"), path.join(extensionDir, "lib.mjs"));
    fs.symlinkSync(path.join(root, "outside", "secret.txt"), path.join(extensionDir, "package.json"));
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error.code)) return t.skip("symlinks unavailable");
    throw error;
  }
  assert.match(readRegularFile(path.join(extensionDir, "lib.mjs")).error, /symbolic link/);
  const errors = checkExtensionModules(extensionDir).errors.join("\n");
  assert.match(errors, /package\.json/);
  assert.match(errors, /lib\.mjs/);
  assert.doesNotMatch(errors, /secret/);
});

test("readRegularFile enforces the size cap and containment root", () => {
  const root = makeRepo({ "a/big.json": "x".repeat(64), "b/ok.json": "{}" });
  assert.match(readRegularFile(path.join(root, "a", "big.json"), { maxBytes: 10 }).error, /limit/);
  assert.match(readRegularFile(path.join(root, "b", "ok.json"), { root: path.join(root, "a") }).error, /outside/);
  assert.equal(readRegularFile(path.join(root, "b", "ok.json"), { root: path.join(root, "b") }).text, "{}");
  assert.equal(readRegularFile(path.join(root, "b", "missing.json")).missing, true);
});

test("detectCanvasTargets still validates a plugin whose plugin.json was deleted", async () => {
  const root = makeRepo({
    "extensions/orb/extension.mjs": "export {};\n",
    "extensions/orb/assets/preview.png": makePng(800, 400),
  });
  const targets = detectCanvasTargets(["plugins/orb/plugin.json"], { rootDir: root });
  assert.deepEqual(targets.plugins, ["orb"]);
  assert.deepEqual(targets.extensions, ["orb"]);
  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["plugins/orb/plugin.json"], install: "never" });
  assert.equal(report.status, "fail");
});

test("unsafe extension references in plugin manifests are rejected and never materialized", async () => {
  assert.equal(isSafeExtensionId("orb"), true);
  for (const id of ["..", "../x", "a/b", "", ".hidden"]) assert.equal(isSafeExtensionId(id), false, id);
  const manifest = {
    $schema: PLUGIN_SCHEMA,
    name: "evil",
    description: "evil",
    version: "1.0.0",
    extensions: { "com.github.awesome-copilot": { extensions: ["./extensions/../../x", "./extensions/ok"] } },
  };
  assert.deepEqual(unsafeExtensionRefs(manifest), ["./extensions/../../x"]);
  const root = makeRepo({
    "plugins/evil/plugin.json": manifest,
    "extensions/ok/extension.mjs": "export {};\n",
    "extensions/ok/assets/preview.png": makePng(800, 400),
  });
  const targets = detectCanvasTargets(["plugins/evil/plugin.json"], { rootDir: root });
  assert.deepEqual(targets.plugins, ["evil"]);
  assert.deepEqual(targets.extensions, ["ok"]);
  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["plugins/evil/plugin.json"], install: "never" });
  assert.equal(report.status, "fail");
  const pluginErrors = report.plugins.flatMap((plugin) => plugin.errors).join("\n");
  assert.match(pluginErrors, /\.\/extensions\/\.\.\/\.\.\/x/);
  assert.notEqual(report.smoke.materialize.evil?.status, "pass");
});