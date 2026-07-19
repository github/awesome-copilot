import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  enrichPullRequests,
  filterPullRequests,
} from "./github.mjs";
import {
  DEFAULT_PREFS,
  normalizePrefs,
  rememberRepository,
} from "./state.mjs";

const here = new URL(".", import.meta.url);

function jsonResponse(payload, status = 200) {
  return {
    headers: { get: () => "application/json" },
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

test("malformed recent repository values normalize to an empty list", () => {
  for (const recent of [{ unexpected: true }, 42]) {
    const preferences = normalizePrefs({
      repository: "github/awesome-copilot",
      repositories: { recent },
    });
    assert.deepEqual(preferences.repositories.recent, [
      "github/awesome-copilot",
    ]);
  }

  const fallback = normalizePrefs({
    repository: "not a repository",
    repositories: { recent: 42 },
  });
  assert.equal(fallback.repository, DEFAULT_PREFS.repository);
  assert.deepEqual(fallback.repositories.recent, [DEFAULT_PREFS.repository]);

  const preferences = {
    repositories: { recent: { unexpected: true } },
  };
  rememberRepository(preferences, "github/awesome-copilot");
  assert.deepEqual(preferences.repositories.recent, [
    "github/awesome-copilot",
  ]);
});

test("artifact filtering pages repository artifacts once and caches head SHAs", async (t) => {
  const originalFetch = globalThis.fetch;
  const artifactRequests = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = new URL(url);
    if (requestUrl.pathname === "/graphql") {
      const body = JSON.parse(options.body);
      assert.equal(body.variables.owner, "example");
      assert.equal(body.variables.name, "artifact-cache-test");
      return jsonResponse({
        data: {
          repository: {
            pull0: {
              headRefOid: "head-with-artifact",
              isDraft: false,
              reviewDecision: null,
              totalCommentsCount: 0,
              commits: { nodes: [] },
            },
            pull1: {
              headRefOid: "head-without-artifact",
              isDraft: false,
              reviewDecision: null,
              totalCommentsCount: 0,
              commits: { nodes: [] },
            },
          },
        },
      });
    }

    assert.equal(
      requestUrl.pathname,
      "/repos/example/artifact-cache-test/actions/artifacts",
    );
    artifactRequests.push(requestUrl.search);
    const page = Number(requestUrl.searchParams.get("page"));
    if (page === 1) {
      return jsonResponse({
        total_count: 101,
        artifacts: Array.from({ length: 100 }, (_, index) => ({
          id: index + 1,
          workflow_run: { head_sha: "unrelated-head" },
        })),
      });
    }
    assert.equal(page, 2);
    return jsonResponse({
      total_count: 101,
      artifacts: [
        {
          id: 101,
          workflow_run: { head_sha: "head-with-artifact" },
        },
      ],
    });
  };

  const pulls = [{ number: 1 }, { number: 2 }];
  const filters = { artifacts: "with" };
  const first = await enrichPullRequests(
    "token",
    "example/artifact-cache-test",
    pulls,
    filters,
  );
  assert.deepEqual(
    first.map((pull) => pull.hasArtifacts),
    [true, false],
  );
  assert.deepEqual(
    filterPullRequests(first, filters).map((pull) => pull.number),
    [1],
  );
  assert.deepEqual(
    filterPullRequests(first, { artifacts: "without" }).map(
      (pull) => pull.number,
    ),
    [2],
  );

  await enrichPullRequests(
    "token",
    "example/artifact-cache-test",
    pulls,
    filters,
  );
  assert.equal(artifactRequests.length, 2);
  assert.match(artifactRequests[0], /per_page=100/);
  assert.match(artifactRequests[0], /page=1/);
  assert.match(artifactRequests[1], /page=2/);
});

test("only the archive root index uses static-site preview routing", async () => {
  const source = await readFile(new URL("assets/app.js", here), "utf8");
  const helpers = source.slice(
    source.indexOf("function artifactEntryKind"),
    source.indexOf("function directoryPathsForFile"),
  );
  const shouldUseStaticSitePreview = Function(
    `${helpers}; return shouldUseStaticSitePreview;`,
  )();
  const root = { path: "index.html", kind: "html" };
  const nested = { path: "docs/index.html", kind: "html" };
  const entries = [root, nested];

  assert.equal(shouldUseStaticSitePreview(root, entries), true);
  assert.equal(shouldUseStaticSitePreview(nested, entries), false);
  assert.equal(shouldUseStaticSitePreview(nested, [nested]), false);
});

test("completed TRX summaries derive their displayed outcome from counters", async () => {
  const source = await readFile(
    new URL("assets/trx-preview.js", here),
    "utf8",
  );
  const helpers = source.slice(
    source.indexOf("const KNOWN_TRX_OUTCOMES"),
    source.indexOf("function parseDuration"),
  );
  const summarizedRunOutcome = Function(
    `${helpers}; return summarizedRunOutcome;`,
  )();

  assert.equal(
    summarizedRunOutcome({
      outcome: "Completed",
      summaryCounts: { failed: 1, passed: 4, skipped: 0 },
    }),
    "Failed",
  );
  assert.equal(
    summarizedRunOutcome({
      outcome: "Completed",
      summaryCounts: { failed: 0, passed: 5, skipped: 0 },
    }),
    "Passed",
  );
  assert.equal(
    summarizedRunOutcome({
      outcome: "Completed",
      summaryCounts: { failed: 0, passed: 0, skipped: 2 },
    }),
    "Skipped",
  );
  assert.equal(
    summarizedRunOutcome({
      outcome: "Completed",
      summaryCounts: { failed: 0, passed: 0, skipped: 0 },
    }),
    "Completed",
  );
  assert.equal(
    summarizedRunOutcome({
      outcome: "Failed",
      summaryCounts: { failed: 0, passed: 5, skipped: 0 },
    }),
    "Failed",
  );
});
