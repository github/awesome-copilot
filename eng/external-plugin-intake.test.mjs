import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCanvasPluginMetadata } from "./external-plugin-intake.mjs";

const REPO = "owner/repo";
const SHA = "0123456789abcdef0123456789abcdef01234567";
const PLUGIN_ROOT = "plugins/upgrade-agent";
const EXTENSIONS_DIR = `${PLUGIN_ROOT}/extensions`;

function fileNode(content) {
  return { type: "file", content: Buffer.from(content, "utf8").toString("base64") };
}

function treeEntry(path, type) {
  return { path, type, mode: type === "tree" ? "040000" : "100644", sha: "deadbeef" };
}

function treeResponse(entries, { truncated = false } = {}) {
  return { status: 200, data: { sha: "roottree", truncated, tree: entries } };
}

function decodeContentsPath(url) {
  const { pathname } = new URL(url);
  const afterContents = pathname.split("/contents/")[1] ?? "";
  return afterContents
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

async function withMockedFetch({ routes = {}, tree }, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    const route = requestUrl.includes("/git/trees/")
      ? tree ?? { status: 404, data: {} }
      : routes[decodeContentsPath(requestUrl)] ?? { status: 404, data: {} };
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.data ?? {},
    };
  };

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const canvasManifest = fileNode(
  JSON.stringify({
    name: "upgrade-agent",
    version: "1.0.0",
    description: "Canvas plugin",
    logo: "assets/preview.png",
  }),
);

function baseRoutes(extra) {
  return {
    [`${PLUGIN_ROOT}/.github/plugin/plugin.json`]: { status: 200, data: canvasManifest },
    [`${PLUGIN_ROOT}/assets/preview.png`]: { status: 200, data: fileNode("binary") },
    ...extra,
  };
}

function makePlugin() {
  return {
    name: "upgrade-agent",
    keywords: ["canvas"],
    source: { source: "github", repo: REPO, sha: SHA, path: PLUGIN_ROOT },
  };
}

async function runValidation({ tree }) {
  const errors = [];
  const warnings = [];
  await withMockedFetch({ routes: baseRoutes(), tree }, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );
  return { errors, warnings };
}

test("validateCanvasPluginMetadata accepts a nested extension entry point", async () => {
  const { errors, warnings } = await runValidation({
    tree: treeResponse([
      treeEntry(EXTENSIONS_DIR, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard`, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard/extension.mjs`, "blob"),
    ]),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata accepts a flat extension entry point", async () => {
  const { errors, warnings } = await runValidation({
    tree: treeResponse([
      treeEntry(EXTENSIONS_DIR, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/extension.mjs`, "blob"),
    ]),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata rejects when no extension.mjs exists flat or nested", async () => {
  const { errors } = await runValidation({
    tree: treeResponse([
      treeEntry(EXTENSIONS_DIR, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard`, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard/index.mjs`, "blob"),
    ]),
  });

  assert.equal(
    errors.some((message) => /must include a canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when the extensions directory is missing", async () => {
  const { errors } = await runValidation({
    tree: treeResponse([
      treeEntry(`${PLUGIN_ROOT}/.github/plugin/plugin.json`, "blob"),
      treeEntry(`${PLUGIN_ROOT}/assets/preview.png`, "blob"),
    ]),
  });

  assert.equal(
    errors.some((message) => /must include an "extensions" directory/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when extensions is a file rather than a directory", async () => {
  const { errors } = await runValidation({
    tree: treeResponse([treeEntry(EXTENSIONS_DIR, "blob")]),
  });

  assert.equal(
    errors.some((message) => /"extensions" must be a directory/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when extensions/extension.mjs is a directory", async () => {
  const { errors } = await runValidation({
    tree: treeResponse([
      treeEntry(EXTENSIONS_DIR, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/extension.mjs`, "tree"),
      treeEntry(`${EXTENSIONS_DIR}/extension.mjs/placeholder.txt`, "blob"),
    ]),
  });

  assert.equal(
    errors.some((message) => /"extensions\/extension\.mjs" must be a file/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata surfaces an unverifiable result when the tree fetch errors", async () => {
  const { errors, warnings } = await runValidation({
    tree: { status: 500, data: {} },
  });

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata treats a truncated tree without an entry point as unverifiable", async () => {
  const { errors, warnings } = await runValidation({
    tree: treeResponse(
      [
        treeEntry(EXTENSIONS_DIR, "tree"),
        treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard`, "tree"),
      ],
      { truncated: true },
    ),
  });

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata accepts an entry point found within a truncated tree", async () => {
  const { errors, warnings } = await runValidation({
    tree: treeResponse(
      [
        treeEntry(EXTENSIONS_DIR, "tree"),
        treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard`, "tree"),
        treeEntry(`${EXTENSIONS_DIR}/modernize-dashboard/extension.mjs`, "blob"),
      ],
      { truncated: true },
    ),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});
