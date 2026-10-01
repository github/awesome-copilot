import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";
import { test } from "node:test";
import {
  checkExtensionModules,
  checkPreview,
  classifySpecifier,
  detectCanvasTargets,
  findDynamicImportSpecifiers,
  findNonLiteralRuntimeLoads,
  findRequireSpecifiers,
  findUnsafeManifestPaths,
  importsAliasTargets,
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

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
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

test("inspectPng rejects malformed IEND chunks and trailing data", () => {
  const valid = makePng(8, 8);
  assert.match(inspectPng(Buffer.concat([valid, Buffer.from("trailing")])).errors[0], /after the IEND/);

  const iendOffset = valid.length - 12;
  const nonEmptyIend = Buffer.concat([
    valid.subarray(0, iendOffset),
    chunk("IEND", Buffer.from([0])),
  ]);
  assert.match(inspectPng(nonEmptyIend).errors[0], /IEND chunk has invalid length/);
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

test("checkExtensionModules fails reachable data URL imports and warns for unreachable dynamic data imports", () => {
  const root = makeRepo({
    "extensions/data/extension.mjs": [
      'import inline from "data:text/javascript,export default 1";',
      'const later = await import("data:text/javascript,export default 2");',
      "export default { inline, later };",
    ].join("\n"),
    "extensions/data/public/app.js": 'await import("data:text/javascript,export default 3");\n',
  });
  const result = checkExtensionModules(path.join(root, "extensions", "data"));
  const errors = result.errors.join("\n");
  assert.match(errors, /extension\.mjs: import "data:text\/javascript,export default 1" is a data: URL import/);
  assert.match(errors, /extension\.mjs: dynamic import\("data:text\/javascript,export default 2"\) is a data: URL import/);
  assert.match(result.warnings.join("\n"), /public\/app\.js: dynamic import\("data:text\/javascript,export default 3"\) is a data: URL import \(module is not reachable/);
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

test("inspectPng rejects a duplicate IHDR chunk", () => {
  const valid = makePng(4, 4);
  const ihdr = valid.subarray(8, 8 + 25);
  const png = Buffer.concat([valid.subarray(0, 33), ihdr, valid.subarray(33)]);
  const result = inspectPng(png);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate IHDR chunk/);
});

test("dynamic import and require extraction ignores call-shaped text inside literals", () => {
  const source = [
    'const a = \'import("./in-single.mjs")\';',
    'const b = "require(\\"./in-double.cjs\\")";',
    "const c = `import(\"./in-template.mjs\") ${await import(\"./in-expr.mjs\")}`;",
    'const d = /import\\("\\.\\/in-regex\\.mjs"\\)/;',
    'const e = await import("./real.mjs"); const f = require("./real.cjs");',
  ].join("\n");
  assert.deepEqual(findDynamicImportSpecifiers(source).sort(), ["./in-expr.mjs", "./real.mjs"]);
  assert.deepEqual(findRequireSpecifiers(source), ["./real.cjs"]);
  const root = makeRepo({
    "extensions/lit/extension.mjs": 'const note = \'import("./missing.mjs")\';\nexport default { note };\n',
  });
  assert.deepEqual(checkExtensionModules(path.join(root, "extensions", "lit")).errors, []);
});

test("non-literal runtime loads are detected outside comments and literals", () => {
  const source = [
    'const literalImport = import("./literal.mjs");',
    'const literalRequire = require("left-pad");',
    'const computedImport = import("node:" + moduleName);',
    "const computedRequire = require(moduleName);",
    'const text = "require(hidden)";',
    "// import(variable)",
    "const templateImport = import(`./${name}.mjs`);",
  ].join("\n");
  assert.deepEqual(findNonLiteralRuntimeLoads(source), ["dynamic import", "dynamic import", "require"]);

  const root = makeRepo({
    "extensions/runtime/extension.mjs": 'const name = "fs";\nexport default import("node:" + name);\n',
  });
  assert.match(
    checkExtensionModules(path.join(root, "extensions", "runtime")).errors.join("\n"),
    /extension\.mjs: non-literal dynamic import cannot be analyzed safely/,
  );
});

test("checkExtensionModules resolves package.json imports aliases and fails closed on unknown shapes", () => {
  assert.deepEqual(importsAliasTargets({ node: "./a.mjs", default: { import: "./b.mjs" } }), ["./a.mjs", "./b.mjs"]);
  assert.equal(importsAliasTargets(["./a.mjs"]), null);
  const root = makeRepo({
    "extensions/alias/extension.mjs": [
      'import ok from "#ok";',
      'import gone from "#gone";',
      'import pad from "#pad";',
      'import odd from "#odd";',
      'import up from "#up";',
      "export default { ok, gone, pad, odd, up };",
    ].join("\n"),
    "extensions/alias/lib/ok.mjs": 'import pad from "left-pad";\nexport default pad;\n',
    "extensions/alias/package.json": {
      name: "alias",
      version: "1.0.0",
      type: "module",
      imports: { "#ok": "./lib/ok.mjs", "#gone": "./lib/gone.mjs", "#pad": "left-pad", "#odd": ["./lib/ok.mjs"], "#up": "../x.mjs" },
    },
  });
  const result = checkExtensionModules(path.join(root, "extensions", "alias"));
  const errors = result.errors.join("\n");
  assert.ok(result.modules.find((entry) => entry.path === "lib/ok.mjs").reachable);
  assert.match(errors, /lib\/ok\.mjs: import "left-pad" is not a Node\.js builtin/);
  assert.match(errors, /import "#gone" -> "\.\/lib\/gone\.mjs" references a missing file/);
  assert.match(errors, /import "#pad" -> "left-pad" is not a Node\.js builtin/);
  assert.match(errors, /import "#odd" uses a package\.json "imports" alias that cannot be analyzed/);
  assert.match(errors, /import "#up" uses a package\.json "imports" alias that cannot be analyzed/);
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

test("detectCanvasTargets uses base plugin manifests when deleted bundle manifests referenced extensions", async () => {
  const root = makeRepo({
    "extensions/daily-focus-board/extension.mjs": "export {};\n",
    "extensions/daily-focus-board/assets/preview.png": makePng(800, 400),
    "plugins/ember/plugin.json": {
      $schema: PLUGIN_SCHEMA,
      name: "ember",
      description: "Ember bundle",
      version: "1.0.0",
      extensions: { "com.github.awesome-copilot": { extensions: ["./extensions/daily-focus-board"] } },
    },
  });
  git(root, ["init"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test User"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "base"]);
  const baseRef = git(root, ["rev-parse", "HEAD"]);
  fs.rmSync(path.join(root, "plugins", "ember", "plugin.json"));

  const targets = detectCanvasTargets(["plugins/ember/plugin.json"], { rootDir: root, baseRef });
  assert.deepEqual(targets.extensions, ["daily-focus-board"]);
  assert.deepEqual(targets.plugins, ["ember"]);

  const report = await runCanvasSmokeTest({ rootDir: root, changedFiles: ["plugins/ember/plugin.json"], baseRef, install: "never" });
  assert.equal(report.status, "fail");
  assert.equal(report.extensions[0].id, "daily-focus-board");
  assert.match(report.plugins[0].errors.join("\n"), /plugins\/ember\/plugin\.json is missing/);
});

test("deleted plugin manifest base read errors fail closed when a base ref is provided", async () => {
  const root = makeRepo({});
  const report = await runCanvasSmokeTest({
    rootDir: root,
    changedFiles: ["plugins/ember/plugin.json"],
    baseRef: "missing-base",
    install: "never",
  });
  assert.equal(report.status, "fail");
  assert.match(report.plugins[0].errors.join("\n"), /cannot read deleted plugins\/ember\/plugin\.json from base missing-base/);
});

test("detectCanvasTargets unions base and head extension references for an edited bundle manifest", () => {
  const manifest = (refs) => ({
    $schema: PLUGIN_SCHEMA,
    name: "ember",
    description: "Ember bundle",
    version: "1.0.0",
    extensions: { "com.github.awesome-copilot": { extensions: refs } },
  });
  const root = makeRepo({
    "extensions/daily-focus-board/extension.mjs": "export {};\n",
    "extensions/daily-focus-board/assets/preview.png": makePng(800, 400),
    "extensions/orb/extension.mjs": "export {};\n",
    "extensions/orb/assets/preview.png": makePng(800, 400),
    "plugins/ember/plugin.json": manifest(["./extensions/daily-focus-board"]),
  });
  git(root, ["init"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test User"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "base"]);
  const baseRef = git(root, ["rev-parse", "HEAD"]);
  fs.writeFileSync(
    path.join(root, "plugins", "ember", "plugin.json"),
    `${JSON.stringify(manifest(["./extensions/orb"]), null, 2)}\n`,
  );

  const targets = detectCanvasTargets(["plugins/ember/plugin.json"], { rootDir: root, baseRef });
  assert.deepEqual(targets.extensions, ["daily-focus-board", "orb"]);
  assert.deepEqual(targets.plugins, ["ember"]);
});

test("the comment stripper treats a slash after a postfix update as division", () => {
  const source = [
    'for (let i = 0; i < n; i++) {}',
    'const r = x++ / y; const dep = require("left-pad");',
    'const s = count-- / total; const dyn = import("./real.mjs");',
    'const t = ++x / y;',
  ].join("\n");
  assert.deepEqual(findRequireSpecifiers(source), ["left-pad"]);
  assert.deepEqual(findDynamicImportSpecifiers(source), ["./real.mjs"]);
  // A prefix update still allows a regex literal to follow.
  assert.deepEqual(findRequireSpecifiers('const re = ++i, m = /require("hidden")/;'), []);
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