import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { evaluateExternalPluginIssue, validateCanvasPluginMetadata } from "./external-plugin-intake.mjs";

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

// ---------------------------------------------------------------------------
// ref/sha consistency tests (evaluateExternalPluginIssue)
// ---------------------------------------------------------------------------

const ORIGINAL_FETCH = global.fetch;
const INTAKE_REPO = "octo/example";
const RESOLVED_REF_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PROVIDED_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

function buildIssueBody({ ref, sha }) {
  return [
    "<!-- external-plugin-submission -->",
    "### Plugin name",
    "",
    "intake-ref-sha-consistency-test-plugin",
    "",
    "### Short description",
    "",
    "Test plugin for external intake validation.",
    "",
    "### GitHub repository",
    "",
    INTAKE_REPO,
    "",
    "### Plugin path inside the repository",
    "",
    "_No response_",
    "",
    "### Ref to review",
    "",
    ref,
    "",
    "### Commit SHA to review",
    "",
    sha,
    "",
    "### Version",
    "",
    "1.2.3",
    "",
    "### License identifier",
    "",
    "MIT",
    "",
    "### Author name",
    "",
    "Copilot Test",
    "",
    "### Author URL",
    "",
    "_No response_",
    "",
    "### Homepage URL",
    "",
    "_No response_",
    "",
    "### Keywords",
    "",
    "testing",
    "",
    "### Additional notes for reviewers",
    "",
    "_No response_",
    "",
    "### Submission checklist",
    "",
    "- [x] The plugin lives in a public GitHub repository.",
    "- [x] The ref and/or sha I provided is immutable (release tag and/or full 40-character commit SHA), not a branch.",
    "- [x] This submission follows this repository's contribution, security, and responsible AI policies.",
    "- [x] This plugin is not already listed in the Awesome Copilot marketplace.",
    "",
  ].join("\n");
}

function jsonResponse(payload, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "OK",
    headers: new Map(),
    async json() {
      return payload;
    },
  };
}

function installMockFetch() {
  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl === `https://api.github.com/repos/${INTAKE_REPO}`) {
      return jsonResponse({ private: false, archived: false });
    }

    if (
      requestUrl === `https://api.github.com/repos/${INTAKE_REPO}/git/commits/${PROVIDED_SHA}` ||
      requestUrl === `https://api.github.com/repos/${INTAKE_REPO}/git/commits/${RESOLVED_REF_SHA}`
    ) {
      const sha = requestUrl.endsWith(RESOLVED_REF_SHA) ? RESOLVED_REF_SHA : PROVIDED_SHA;
      return jsonResponse({ sha });
    }

    if (requestUrl === `https://api.github.com/repos/${INTAKE_REPO}/git/ref/tags/v1.2.3`) {
      return jsonResponse({ object: { type: "tag", sha: "cccccccccccccccccccccccccccccccccccccccc" } });
    }

    if (requestUrl === `https://api.github.com/repos/${INTAKE_REPO}/commits/v1.2.3`) {
      return jsonResponse({ sha: RESOLVED_REF_SHA });
    }

    return jsonResponse({}, { status: 404 });
  };
}

test("evaluateExternalPluginIssue fails when ref and sha resolve to different commits", async () => {
  installMockFetch();
  const issue = { body: buildIssueBody({ ref: "v1.2.3", sha: PROVIDED_SHA }) };

  const result = await evaluateExternalPluginIssue({ issue });

  assert.equal(result.valid, false);
  assert.match(
    result.commentBody,
    /must reference the same commit \(ref "v1\.2\.3" resolves to "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", sha is "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"\)/,
  );
});

test("evaluateExternalPluginIssue passes when ref and sha resolve to the same commit", async () => {
  installMockFetch();
  const issue = { body: buildIssueBody({ ref: "v1.2.3", sha: RESOLVED_REF_SHA }) };

  const result = await evaluateExternalPluginIssue({ issue });

  assert.equal(result.valid, true);
  assert.equal(
    result.errors.some((error) => error.includes("must reference the same commit")),
    false,
  );
});
