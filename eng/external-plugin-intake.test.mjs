import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCanvasPluginMetadata } from "./external-plugin-intake.mjs";

const REPO = "owner/repo";
const SHA = "0123456789abcdef0123456789abcdef01234567";
const PLUGIN_ROOT = "plugins/upgrade-agent";

const TREE_PLUGINS = "tree-plugins";
const TREE_UPGRADE_AGENT = "tree-upgrade-agent";
const TREE_EXTENSIONS = "tree-extensions";

function fileNode(content) {
  return { type: "file", content: Buffer.from(content, "utf8").toString("base64") };
}

function treeEntry(path, type, sha) {
  return { path, type, mode: type === "tree" ? "040000" : "100644", sha: sha ?? "deadbeef" };
}

function treeResponse(entries, { truncated = false } = {}) {
  return { status: 200, data: { sha: "resolved", truncated, tree: entries } };
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

function decodeTreeish(url) {
  const match = String(url).match(/\/git\/trees\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function withMockedFetch({ contents = {}, trees = {} }, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    let route;
    if (requestUrl.includes("/git/trees/")) {
      route = trees[decodeTreeish(requestUrl)] ?? { status: 404, data: {} };
    } else {
      route = contents[decodeContentsPath(requestUrl)] ?? { status: 404, data: {} };
    }
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

function baseContents(extra) {
  return {
    [`${PLUGIN_ROOT}/.github/plugin/plugin.json`]: { status: 200, data: canvasManifest },
    [`${PLUGIN_ROOT}/assets/preview.png`]: { status: 200, data: fileNode("binary") },
    ...extra,
  };
}

// Wires up the directory-walk that resolves plugins/upgrade-agent/extensions to a tree SHA.
// `extensionsEntry` controls what the walk finds at the final ".../extensions" step, and
// `extensionsSubtree` is the recursive listing returned for that resolved tree SHA.
function buildTrees({ extensionsEntry, extensionsSubtree, overrides } = {}) {
  const trees = {
    [SHA]: treeResponse([treeEntry("plugins", "tree", TREE_PLUGINS)]),
    [TREE_PLUGINS]: treeResponse([treeEntry("upgrade-agent", "tree", TREE_UPGRADE_AGENT)]),
    [TREE_UPGRADE_AGENT]: treeResponse([
      extensionsEntry ?? treeEntry("extensions", "tree", TREE_EXTENSIONS),
    ]),
  };
  if (extensionsSubtree) {
    trees[TREE_EXTENSIONS] = extensionsSubtree;
  }
  return { ...trees, ...overrides };
}

function makePlugin() {
  return {
    name: "upgrade-agent",
    keywords: ["canvas"],
    source: { source: "github", repo: REPO, sha: SHA, path: PLUGIN_ROOT },
  };
}

async function runValidation({ contents, trees }) {
  const errors = [];
  const warnings = [];
  await withMockedFetch({ contents: baseContents(contents), trees }, () =>
    validateCanvasPluginMetadata(makePlugin(), errors, warnings, null),
  );
  return { errors, warnings };
}

test("validateCanvasPluginMetadata accepts a nested extension entry point", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse([
        treeEntry("modernize-dashboard", "tree"),
        treeEntry("modernize-dashboard/extension.mjs", "blob"),
      ]),
    }),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata accepts a flat extension entry point", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse([treeEntry("extension.mjs", "blob")]),
    }),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateCanvasPluginMetadata rejects when no extension.mjs exists flat or nested", async () => {
  const { errors } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse([
        treeEntry("modernize-dashboard", "tree"),
        treeEntry("modernize-dashboard/index.mjs", "blob"),
      ]),
    }),
  });

  assert.equal(
    errors.some((message) => /must include a canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when the extensions directory is missing", async () => {
  const { errors } = await runValidation({
    trees: buildTrees({
      extensionsEntry: treeEntry("other-dir", "tree", "tree-other"),
    }),
  });

  assert.equal(
    errors.some((message) => /must include an "extensions" directory/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when extensions is a file rather than a directory", async () => {
  const { errors } = await runValidation({
    trees: buildTrees({
      extensionsEntry: treeEntry("extensions", "blob", "blob-extensions"),
    }),
  });

  assert.equal(
    errors.some((message) => /"extensions" must be a directory/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata rejects when extensions/extension.mjs is a directory", async () => {
  const { errors } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse([
        treeEntry("extension.mjs", "tree"),
        treeEntry("extension.mjs/placeholder.txt", "blob"),
      ]),
    }),
  });

  assert.equal(
    errors.some((message) => /"extensions\/extension\.mjs" must be a file/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata surfaces an unverifiable result when the tree walk errors", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      overrides: { [SHA]: { status: 500, data: {} } },
    }),
  });

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata treats a truncated walk level as unverifiable", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      overrides: {
        [TREE_UPGRADE_AGENT]: treeResponse(
          [treeEntry("extensions", "tree", TREE_EXTENSIONS)],
          { truncated: true },
        ),
      },
    }),
  });

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata treats a truncated extensions subtree without an entry point as unverifiable", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse([treeEntry("modernize-dashboard", "tree")], { truncated: true }),
    }),
  });

  assert.deepEqual(errors, []);
  assert.equal(
    warnings.some((message) => /could not verify the canvas extension entry point/.test(message)),
    true,
  );
});

test("validateCanvasPluginMetadata accepts an entry point found within a truncated subtree", async () => {
  const { errors, warnings } = await runValidation({
    trees: buildTrees({
      extensionsSubtree: treeResponse(
        [
          treeEntry("modernize-dashboard", "tree"),
          treeEntry("modernize-dashboard/extension.mjs", "blob"),
        ],
        { truncated: true },
      ),
    }),
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});
