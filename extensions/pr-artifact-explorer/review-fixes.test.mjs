import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  analyzeArtifact,
  hasRootIndexHtml,
} from "./detector.mjs";
import { CacheMaintenanceCoordinator } from "./cache-coordinator.mjs";
import {
  enrichPullRequests,
  filterPullRequests,
  listPullRequestArtifacts,
} from "./github.mjs";
import { contentDeliveryMode, startInstance, stopInstance } from "./server.mjs";
import {
  CAPABILITY_TOKEN_HEADER,
  hasCapabilityToken,
  isCanonicalHost,
  isCrossSiteRequest,
  requiresCapabilityToken,
} from "./security.mjs";
import {
  DEFAULT_PREFS,
  normalizeRepository,
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

function rawStatus(url, headers) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { headers }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    request.on("error", reject);
    request.end();
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
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

test("pull artifact results report the intentional workflow-run cap", async (t) => {
  const originalFetch = globalThis.fetch;
  const artifactRequests = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    const requestUrl = new URL(url);
    if (requestUrl.pathname === "/repos/example/run-cap/pulls/7") {
      return jsonResponse({
        number: 7,
        title: "Run cap",
        state: "open",
        head: { sha: "head-sha", ref: "feature" },
        base: { ref: "main" },
        user: { login: "octocat" },
        labels: [],
      });
    }
    if (requestUrl.pathname === "/repos/example/run-cap/actions/runs") {
      assert.equal(requestUrl.searchParams.get("per_page"), "30");
      return jsonResponse({
        total_count: 35,
        workflow_runs: Array.from({ length: 30 }, (_, index) => ({
          id: index + 1,
          name: "CI",
          run_number: index + 1,
          run_attempt: 1,
          event: "pull_request",
          status: "completed",
          conclusion: "success",
          created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 35 - index)).toISOString(),
          html_url: `https://github.com/example/run-cap/actions/runs/${index + 1}`,
        })),
      });
    }
    const artifactMatch = requestUrl.pathname.match(
      /^\/repos\/example\/run-cap\/actions\/runs\/(\d+)\/artifacts$/,
    );
    assert.ok(artifactMatch);
    artifactRequests.push(Number(artifactMatch[1]));
    return jsonResponse({
      total_count: 1,
      artifacts: [
        {
          id: Number(artifactMatch[1]) * 10,
          name: `artifact-${artifactMatch[1]}`,
          size_in_bytes: 100,
          expired: false,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          expires_at: "2026-04-01T00:00:00Z",
        },
      ],
    });
  };

  const result = await listPullRequestArtifacts(
    "token",
    "example/run-cap",
    7,
  );
  assert.equal(artifactRequests.length, 30);
  assert.equal(result.runs.length, 30);
  assert.equal(result.runCount, 35);
  assert.equal(result.runsTruncated, true);
  assert.equal(result.artifacts.length, 30);
  assert.equal(result.artifactCount, 30);
  assert.equal(result.artifactsTruncated, true);
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
  const root = { path: "index.html", kind: "html", supported: true };
  const nested = {
    path: "docs/index.html",
    kind: "html",
    supported: true,
  };
  const unsupported = {
    path: "index.html",
    kind: "html",
    supported: false,
  };
  const entries = [root, nested];

  assert.equal(shouldUseStaticSitePreview(root, entries), true);
  assert.equal(shouldUseStaticSitePreview(nested, entries), false);
  assert.equal(shouldUseStaticSitePreview(nested, [nested]), false);
  assert.equal(
    shouldUseStaticSitePreview(unsupported, [unsupported]),
    false,
  );
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

test("repository normalization rejects owner and name dot segments", () => {
  for (const repository of ["../user", "./repo", "owner/..", "owner/."]) {
    assert.throws(
      () => normalizeRepository(repository),
      /cannot be dot segments/,
    );
  }
  assert.equal(
    normalizeRepository("github/awesome-copilot"),
    "github/awesome-copilot",
  );
});

test("unsupported entries remain listed but cannot become the primary preview", async () => {
  const analysis = await analyzeArtifact(
    {
      entries: [
        {
          name: "index.html",
          directory: false,
          supported: false,
          compressedSize: 10,
          uncompressedSize: 20,
        },
        {
          name: "session.cast",
          directory: false,
          supported: false,
          compressedSize: 10,
          uncompressedSize: 20,
        },
        {
          name: "results.trx",
          directory: false,
          supported: true,
          compressedSize: 10,
          uncompressedSize: 20,
        },
      ],
      totalUncompressedBytes: 60,
    },
    async () => {
      throw new Error("Unsupported entries must not be probed.");
    },
  );

  assert.equal(analysis.entries.length, 3);
  assert.deepEqual(analysis.primary, {
    kind: "trx",
    path: "results.trx",
    label: "Test results",
  });
  assert.equal(hasRootIndexHtml(analysis.entries), false);
});

test("unsupported entry downloads fall back to the original artifact archive", () => {
  assert.equal(contentDeliveryMode({ supported: false }, false), "unsupported");
  assert.equal(contentDeliveryMode({ supported: false }, true), "archive");
  assert.equal(contentDeliveryMode({ supported: true }, true), "entry");
});

test("cache maintenance blocks inspections during artifact deletion", async () => {
  const coordinator = new CacheMaintenanceCoordinator();
  const deletionEntered = deferred();
  const releaseDeletion = deferred();
  const deletion = coordinator.deleteArtifact("42", async () => {
    deletionEntered.resolve();
    await releaseDeletion.promise;
    return { deleted: "42" };
  });
  await deletionEntered.promise;

  let inspectionStarted = false;
  const inspection = (async () => {
    while (true) {
      const barrier = coordinator.inspectionBarrier("42");
      if (!barrier) break;
      await barrier;
    }
    inspectionStarted = true;
  })();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(inspectionStarted, false);
  assert.equal(coordinator.inspectionBarrier("99"), null);

  releaseDeletion.resolve();
  assert.deepEqual(await deletion, { deleted: "42" });
  await inspection;
  assert.equal(inspectionStarted, true);
});

test("cache clearing waits for deletions and blocks every inspection", async () => {
  const coordinator = new CacheMaintenanceCoordinator();
  const deletionEntered = deferred();
  const releaseDeletion = deferred();
  const deletion = coordinator.deleteArtifact("42", async () => {
    deletionEntered.resolve();
    await releaseDeletion.promise;
  });
  await deletionEntered.promise;

  const clearEntered = deferred();
  const releaseClear = deferred();
  const clear = coordinator.clearCache(async () => {
    clearEntered.resolve();
    await releaseClear.promise;
    return { cleared: true };
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(coordinator.inspectionBarrier("99") !== null, true);

  let inspectionStarted = false;
  const inspection = (async () => {
    while (true) {
      const barrier = coordinator.inspectionBarrier("99");
      if (!barrier) break;
      await barrier;
    }
    inspectionStarted = true;
  })();
  releaseDeletion.resolve();
  await deletion;
  await clearEntered.promise;
  assert.equal(inspectionStarted, false);

  releaseClear.resolve();
  assert.deepEqual(await clear, { cleared: true });
  await inspection;
  assert.equal(inspectionStarted, true);
});

test("artifact truncation messaging names omitted workflow runs", async () => {
  const source = await readFile(new URL("assets/app.js", here), "utf8");
  const helperSource = source.slice(
    source.indexOf("function artifactResultLimitMessage"),
    source.indexOf("function renderPullPayload"),
  );
  const artifactResultLimitMessage = Function(
    `${helperSource}; return artifactResultLimitMessage;`,
  )();

  assert.equal(
    artifactResultLimitMessage({
      runs: Array.from({ length: 30 }),
      runCount: 35,
      runsTruncated: true,
      artifacts: Array.from({ length: 100 }),
      artifactCount: 120,
    }),
    "Showing artifacts from the newest 30 of 35 workflow runs. Showing the newest 100 of 120 artifacts from those runs.",
  );
});

test("capability tokens protect loopback APIs, content, and events", () => {
  const token = "secret-token";
  const req = (headers = {}) => ({ headers });
  const apiUrl = new URL("http://127.0.0.1:1234/api/bootstrap");
  const contentUrl = new URL(
    `http://127.0.0.1:1234/content/1/file.txt?token=${token}`,
  );
  const eventsUrl = new URL(
    `http://127.0.0.1:1234/events?token=${token}`,
  );

  assert.equal(
    isCanonicalHost(req({ host: "127.0.0.1:1234" }), "127.0.0.1:1234"),
    true,
  );
  assert.equal(
    isCanonicalHost(req({ host: "attacker.example:1234" }), "127.0.0.1:1234"),
    false,
  );
  assert.equal(requiresCapabilityToken("/api/bootstrap"), true);
  assert.equal(requiresCapabilityToken("/content/1/file.txt"), true);
  assert.equal(requiresCapabilityToken("/events"), true);
  assert.equal(requiresCapabilityToken("/assets/app.js"), false);
  assert.equal(
    hasCapabilityToken(req({ [CAPABILITY_TOKEN_HEADER]: token }), apiUrl, token),
    true,
  );
  assert.equal(hasCapabilityToken(req(), contentUrl, token), true);
  assert.equal(hasCapabilityToken(req(), eventsUrl, token), true);
  assert.equal(
    hasCapabilityToken(
      req(),
      new URL(`${apiUrl}?token=${token}`),
      token,
    ),
    false,
  );
  assert.equal(
    isCrossSiteRequest(
      req({ origin: "https://attacker.example" }),
      "http://127.0.0.1:1234",
    ),
    true,
  );
});

test("canvas server rejects spoofed hosts and unauthenticated protected routes", async (t) => {
  const instanceId = `review-security-${Date.now()}`;
  const entry = await startInstance(instanceId, null, () => {});
  t.after(() => stopInstance(instanceId));

  const root = await fetch(entry.url);
  assert.equal(root.status, 200);
  assert.match(
    await root.text(),
    new RegExp(`name="pr-artifact-explorer-token" content="${entry.token}"`),
  );
  assert.equal((await fetch(`${entry.origin}/`)).status, 403);

  for (const path of ["api/bootstrap", "content/1/file.txt", "events"]) {
    const response = await fetch(`${entry.origin}/${path}`);
    assert.equal(response.status, 403);
  }

  assert.equal(
    await rawStatus(entry.url, { Host: "attacker.example" }),
    403,
  );
  const foreignOriginResponse = await fetch(`${entry.origin}/api/bootstrap`, {
    headers: {
      [CAPABILITY_TOKEN_HEADER]: entry.token,
      Origin: "https://attacker.example",
    },
  });
  assert.equal(foreignOriginResponse.status, 403);
});
