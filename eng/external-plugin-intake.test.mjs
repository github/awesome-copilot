import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCanvasPluginMetadata } from "./external-plugin-intake.mjs";

const REPO = "owner/repo";
const SHA = "0123456789abcdef0123456789abcdef01234567";
const PLUGIN_ROOT = "plugins/upgrade-agent";

function fileNode(content) {
  return { type: "file", content: Buffer.from(content, "utf8").toString("base64") };
}

function dirNode(entries) {
  return entries.map((entry) => ({ type: entry.type, name: entry.name, path: entry.path ?? entry.name }));
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

async function withMockedFetch(routes, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestPath = decodeContentsPath(String(url));
    const route = routes[requestPath] ?? { status: 404, data: {} };
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

test("validateCanvasPluginMetadata accepts a nested extension entry point", async () => {
  const routes = baseRoutes({
    [`${PLUGIN_ROOT}/extensions`]: {
      status: 200,
      data: dirNode([{ name: "modernize-dashboard", type: "dir" }]),
    },
    [`${PLUGIN_ROOT}/extensions/modernize-dashboard/extension.mjs`]: {
      status: 200,
      data: fileNode("export default {};\n"),
    },
  });

  const errors = [];
  const warnings = [];
  await withMockedFetch(routes, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata accepts a flat extension entry point", async () => {
  const routes = baseRoutes({
    [`${PLUGIN_ROOT}/extensions`]: {
      status: 200,
      data: dirNode([{ name: "extension.mjs", type: "file" }]),
    },
    [`${PLUGIN_ROOT}/extensions/extension.mjs`]: {
      status: 200,
      data: fileNode("export default {};\n"),
    },
  });

  const errors = [];
  const warnings = [];
  await withMockedFetch(routes, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata rejects when no extension.mjs exists flat or nested", async () => {
  const routes = baseRoutes({
    [`${PLUGIN_ROOT}/extensions`]: {
      status: 200,
      data: dirNode([{ name: "modernize-dashboard", type: "dir" }]),
    },
    [`${PLUGIN_ROOT}/extensions/modernize-dashboard/extension.mjs`]: { status: 404, data: {} },
  });

  const errors = [];
  const warnings = [];
  await withMockedFetch(routes, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );

  assert.equal(
    errors.some((message) => /must include a canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata surfaces an unverifiable entry point when the extensions listing errors", async () => {
  const routes = baseRoutes({
    [`${PLUGIN_ROOT}/extensions`]: { status: 500, data: {} },
    // No route for the entry point → the mock defaults to a 404, so it cannot be found
    // and (because the listing errored) nested subfolders cannot be enumerated either.
  });

  const errors = [];
  const warnings = [];
  await withMockedFetch(routes, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata still accepts a flat entry point when the extensions listing errors", async () => {
  const routes = baseRoutes({
    [`${PLUGIN_ROOT}/extensions`]: { status: 500, data: {} },
    [`${PLUGIN_ROOT}/extensions/extension.mjs`]: {
      status: 200,
      data: fileNode("export default {};\n"),
    },
  });

  const errors = [];
  const warnings = [];
  await withMockedFetch(routes, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );

  assert.deepEqual(errors, []);
});
