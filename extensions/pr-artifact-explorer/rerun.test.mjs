import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-rerun-"));
process.env.COPILOT_HOME = sharedHome;
process.env.GH_TOKEN = "mock-rerun-token";

const {
  MAX_RERUNS,
  RerunError,
  evaluateRerun,
  prepareRerun,
  requestRerun,
} = await import("./rerun.mjs");

const NOW = Date.parse("2026-06-15T00:00:00Z");
const json = (status, body = null, headers = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function mockGitHub(t, options = {}) {
  const original = globalThis.fetch;
  const state = {
    posts: [],
    gets: [],
    run: {
      id: 900,
      name: "CI",
      run_number: 12,
      run_attempt: 1,
      status: "completed",
      conclusion: "failure",
      event: "pull_request",
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      head_sha: "aaaaaaa1111111",
      head_branch: "feature",
      html_url: "https://github.com/o/r/actions/runs/900",
      triggering_actor: { login: "octo" },
      ...options.run,
    },
    permissions: options.permissions === undefined ? { push: true } : options.permissions,
    artifactRunId: options.artifactRunId ?? 900,
    pullHead: options.pullHead ?? "aaaaaaa1111111",
    postResponse: options.postResponse ?? (() => json(201)),
    postDelay: options.postDelay ?? 0,
  };
  globalThis.fetch = async (url, init = {}) => {
    const target = new URL(url);
    if (target.hostname !== "api.github.com") return original(url, init);
    const method = init.method ?? "GET";
    if (method === "POST") {
      state.posts.push(target.pathname);
      if (state.postDelay) await new Promise((resolve) => setTimeout(resolve, state.postDelay));
      return state.postResponse();
    }
    state.gets.push(target.pathname);
    if (target.pathname === "/user") {
      return json(200, { login: "tester", avatar_url: null }, { "x-oauth-scopes": "repo" });
    }
    if (target.pathname === "/repos/o/r") {
      if (options.repoFailure) return options.repoFailure();
      return json(200, { full_name: "o/r", ...(state.permissions ? { permissions: state.permissions } : {}) });
    }
    if (target.pathname === "/repos/o/r/actions/runs/900") return json(200, state.run);
    if (target.pathname === "/repos/o/r/actions/artifacts/5") {
      return json(200, { id: 5, workflow_run: { id: state.artifactRunId } });
    }
    if (target.pathname === "/repos/o/r/pulls/3") return json(200, { head: { sha: state.pullHead } });
    return json(404, { message: "Not Found" });
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return state;
}

const input = (extra = {}) => ({
  repository: "o/r",
  runId: 900,
  artifactId: 5,
  pullNumber: 3,
  attempt: 1,
  scope: "all",
  ...extra,
});

test("eligibility enforces the 30-day window, 50 re-run cap and permissions", () => {
  const base = { status: "completed", conclusion: "failure", attempt: 1 };
  const day = 86_400_000;
  const at = (days) => new Date(NOW - days * day).toISOString();
  assert.equal(evaluateRerun({ ...base, createdAt: at(29.9) }, { now: NOW }).eligible, true);
  assert.equal(evaluateRerun({ ...base, createdAt: at(30.1) }, { now: NOW }).eligible, false);
  // 50 re-runs means attempt 51; attempt 50 still has one left.
  assert.equal(evaluateRerun({ ...base, createdAt: at(1), attempt: MAX_RERUNS }, { now: NOW }).eligible, true);
  const capped = evaluateRerun({ ...base, createdAt: at(1), attempt: MAX_RERUNS + 1 }, { now: NOW });
  assert.equal(capped.eligible, false);
  assert.match(capped.disabledReason, /50/);
  const readOnly = evaluateRerun({ ...base, createdAt: at(1) }, { now: NOW, permissions: { pull: true, push: false } });
  assert.equal(readOnly.eligible, false);
  const unknown = evaluateRerun({ ...base, createdAt: at(1) }, { now: NOW, permissions: null });
  assert.equal(unknown.eligible, true);
  assert.equal(unknown.permissionKnown, false);
  assert.equal(evaluateRerun({ ...base, status: "in_progress", createdAt: at(1) }, { now: NOW }).eligible, false);
  assert.equal(evaluateRerun({ ...base, conclusion: "success", createdAt: at(1) }, { now: NOW }).failedEligible, false);
  assert.equal(evaluateRerun({ ...base, createdAt: "garbage" }, { now: NOW }).eligible, false);
});

test("prepare is read-only, validates the artifact and flags newer heads", async (t) => {
  const state = mockGitHub(t, { pullHead: "bbbbbbb2222222" });
  const context = await prepareRerun("tok", { repository: "o/r", runId: 900, artifactId: 5, pullNumber: 3 });
  assert.equal(context.newerHead, true);
  assert.equal(context.failedEligible, true);
  assert.equal(state.posts.length, 0);

  const other = mockGitHub(t, { artifactRunId: 901 });
  await assert.rejects(
    prepareRerun("tok", { repository: "o/r", runId: 900, artifactId: 5 }),
    (error) => error instanceof RerunError && error.status === 409,
  );
  assert.equal(other.posts.length, 0);
});

test("all and failed scopes POST the exact run endpoint once and accept an empty 201", async (t) => {
  const state = mockGitHub(t);
  const all = await requestRerun("tok", input());
  assert.equal(all.requested, true);
  assert.match(all.message, /requested/i);
  assert.doesNotMatch(all.message, /artifact.*ready/i);
  await requestRerun("tok", input({ scope: "failed" }));
  assert.deepEqual(state.posts, [
    "/repos/o/r/actions/runs/900/rerun",
    "/repos/o/r/actions/runs/900/rerun-failed-jobs",
  ]);
});

test("revalidation refuses changed attempts, ineligible runs and wrong scopes without POSTing", async (t) => {
  const changed = mockGitHub(t, { run: { run_attempt: 2 } });
  await assert.rejects(requestRerun("tok", input()), (e) => e.status === 409 && e.extra.code === "attempt_changed");
  assert.equal(changed.posts.length, 0);

  const old = mockGitHub(t, { run: { created_at: new Date(Date.now() - 31 * 86_400_000).toISOString() } });
  await assert.rejects(requestRerun("tok", input()), (e) => e.status === 409 && e.extra.code === "ineligible");
  assert.equal(old.posts.length, 0);

  const readOnly = mockGitHub(t, { permissions: { pull: true, push: false } });
  await assert.rejects(requestRerun("tok", input()), (e) => e.status === 409);
  assert.equal(readOnly.posts.length, 0);

  const passed = mockGitHub(t, { run: { conclusion: "success" } });
  await assert.rejects(requestRerun("tok", input({ scope: "failed" })), (e) => e.status === 409);
  assert.equal(passed.posts.length, 0);

  const mismatch = mockGitHub(t, { artifactRunId: 1 });
  await assert.rejects(requestRerun("tok", input()), (e) => e.status === 409);
  assert.equal(mismatch.posts.length, 0);
});

test("confirmation shows the ORIGINAL actor, separate from the re-run initiator", async (t) => {
  mockGitHub(t, { run: { actor: { login: "original" }, triggering_actor: { login: "rerunner" } } });
  const context = await prepareRerun("tok", { repository: "o/r", runId: 900, artifactId: 5 });
  assert.equal(context.run.actor, "original");
  assert.equal(context.run.triggeringActor, "rerunner");
});

test("a failing permission GET surfaces during prep and revalidation with zero POSTs", async (t) => {
  for (const status of [403, 404, 429]) {
    const state = mockGitHub(t, { repoFailure: () => json(status, { message: `nope ${status}` }) });
    await assert.rejects(
      prepareRerun("tok", { repository: "o/r", runId: 900, artifactId: 5 }),
      (e) => e instanceof RerunError && e.status === status && e.extra.code === "permission_check_failed",
    );
    await assert.rejects(requestRerun("tok", input()), (e) => e.status === status);
    assert.equal(state.posts.length, 0);
  }
  const net = mockGitHub(t, { repoFailure: () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(requestRerun("tok", input()), (e) => e instanceof RerunError && e.status === 502);
  assert.equal(net.posts.length, 0);

  const unknown = mockGitHub(t, { permissions: null });
  const context = await prepareRerun("tok", { repository: "o/r", runId: 900, artifactId: 5 });
  assert.equal(context.permissionKnown, false);
  assert.equal(unknown.posts.length, 0);
});

test("double submit sends exactly one POST", async (t) => {
  const state = mockGitHub(t, { postDelay: 60 });
  const results = await Promise.allSettled([requestRerun("tok", input()), requestRerun("tok", input())]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected")[0].reason.status, 409);
  assert.equal(state.posts.length, 1);
});

test("GitHub 403, 404, 422 and 429 surface clearly with no retry", async (t) => {
  for (const [status, pattern] of [
    [403, /write access/],
    [404, /could not find/],
    [422, /rejected/],
    [429, /rate-limited/],
  ]) {
    const state = mockGitHub(t, { postResponse: () => json(status, { message: `boom ${status}` }) });
    await assert.rejects(requestRerun("tok", input()), (error) => error.status === status && pattern.test(error.message));
    assert.equal(state.posts.length, 1, `status ${status} must not be retried`);
  }
});

test("Chromium dialog: cancel sends no POST, confirm sends one, failure keeps the cache and artifacts", async (t) => {
  const { loadPlaywright } = await import("./capture.mjs");
  let chromium;
  try {
    chromium = await loadPlaywright();
  } catch (error) {
    return t.skip(error.message.split("\n")[0]);
  }
  let browser;
  for (const options of [{}, { channel: "chrome" }, { channel: "msedge" }]) {
    try {
      browser = await chromium.launch({ headless: true, ...options });
      break;
    } catch {
      // try the next channel
    }
  }
  if (!browser) return t.skip("Chromium is not available");

  const state = mockGitHub(t, { pullHead: "bbbbbbb2222222" });
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `rerun-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await browser.close();
    await stopInstance(instanceId);
    await rm(sharedHome, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/pulls/3?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pullRequest: {
          number: 3,
          title: "Rerun",
          url: "https://github.com/o/r/pull/3",
          state: "open",
          author: "octo",
          baseRef: "main",
          updatedAt: new Date().toISOString(),
        },
        artifacts: [
          {
            id: 5,
            name: "report",
            sizeInBytes: 10,
            expired: false,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            run: { id: 900, name: "CI", number: 12, attempt: 1, status: "completed", conclusion: "failure" },
          },
        ],
        runs: [],
        artifactCount: 1,
        runCount: 0,
      }),
    }),
  );

  const base = server.url ?? `${server.origin}/`;
  await page.goto(`${base}#/pull/o%2Fr/3`);
  await page.waitForSelector("[data-rerun-run]");

  // Cancel: context reads only, zero POSTs.
  await page.click("[data-rerun-run]");
  await page.waitForSelector("dialog.rerun-dialog[open]");
  const text = await page.textContent("dialog.rerun-dialog");
  assert.match(text, /CI/);
  assert.match(text, /run #12/);
  assert.match(text, /attempt 1/);
  assert.match(text, /aaaaaaa/);
  assert.match(text, /newer commits/);
  assert.match(text, /original commit, ref and original triggering actor/);
  assert.equal(await page.locator("input[value=failed]").count(), 1);
  await page.click("[data-rerun-cancel]");
  await page.waitForSelector("dialog.rerun-dialog", { state: "detached" });
  assert.equal(state.posts.length, 0);

  // Confirm failing: error shown inside the dialog, one POST, no retry.
  state.postResponse = () => json(403, { message: "Resource not accessible" });
  await page.click("[data-rerun-run]");
  await page.waitForSelector("dialog.rerun-dialog[open]");
  await page.click("[data-rerun-confirm]", { clickCount: 2, delay: 5 });
  await page.waitForFunction(() => /write access/.test(document.querySelector(".rerun-status")?.textContent ?? ""));
  assert.equal(state.posts.length, 1);
  assert.equal(await page.locator("[data-rerun-run]").count(), 1, "artifact row preserved after failure");
  await page.click("[data-rerun-cancel]");
  await page.waitForSelector("dialog.rerun-dialog", { state: "detached" });

  // Confirm succeeding with failed-only scope: "requested", not "ready".
  state.postResponse = () => json(201);
  state.posts.length = 0;
  await page.click("[data-rerun-run]");
  await page.waitForSelector("dialog.rerun-dialog[open]");
  await page.check("input[value=failed]");
  await page.click("[data-rerun-confirm]");
  await page.waitForFunction(() => /Re-run requested/.test(document.querySelector(".rerun-status")?.textContent ?? ""));
  assert.deepEqual(state.posts, ["/repos/o/r/actions/runs/900/rerun-failed-jobs"]);
  assert.equal(await page.locator(".rerun-status a").getAttribute("href"), "https://github.com/o/r/actions/runs/900");
  assert.doesNotMatch(await page.textContent(".rerun-status"), /ready/i);
  assert.deepEqual(errors, []);
});
