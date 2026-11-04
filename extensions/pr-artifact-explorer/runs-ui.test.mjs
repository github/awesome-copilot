import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const sharedHome = await mkdtemp(join(tmpdir(), "pae-runs-ui-"));
process.env.COPILOT_HOME = sharedHome;

const run = (id, overrides = {}) => ({
  id,
  name: "Nightly",
  title: `Nightly build ${id}`,
  number: id - 100,
  attempt: 1,
  event: "schedule",
  status: "completed",
  conclusion: "success",
  branch: "main",
  headSha: "b".repeat(40),
  actor: "octo",
  createdAt: new Date().toISOString(),
  url: `https://github.com/o/r/actions/runs/${id}`,
  pullRequests: [],
  ...overrides,
});

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function launch(t) {
  const { loadPlaywright } = await import("./capture.mjs");
  let chromium;
  try {
    chromium = await loadPlaywright();
  } catch (error) {
    t.skip(error.message.split("\n")[0]);
    return null;
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
  if (!browser) {
    t.skip("Chromium is not available");
    return null;
  }
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instanceId = `runs-ui-${Date.now()}`;
  const server = await startInstance(instanceId, null, () => {});
  t.after(async () => {
    await browser.close();
    await stopInstance(instanceId);
    await rm(sharedHome, { recursive: true, force: true });
  });
  return { browser, base: server.url ?? `${server.origin}/` };
}

const COUNTS = { 101: 2, 102: 0, 103: 1 };

async function mockApi(page, { runs = [run(101), run(102, { event: "workflow_dispatch" }), run(103, { pullRequests: [7] })], counts = COUNTS } = {}) {
  const state = { listRequests: [], branchRequests: [] };
  await page.route("**/api/runs?*", (route) => {
    state.listRequests.push(new URL(route.request().url()).searchParams);
    return json(route, {
      repository: "o/r",
      runs,
      totalCount: runs.length,
      page: 1,
      perPage: 30,
      hasPrevious: false,
      hasMore: false,
      capped: false,
    });
  });
  await page.route("**/api/workflows?*", (route) =>
    json(route, { repository: "o/r", workflows: [{ id: 1, name: "Nightly", path: ".github/workflows/nightly.yml", ref: "nightly.yml", state: "active" }] }),
  );
  await page.route("**/api/branches?*", (route) => {
    const q = new URL(route.request().url()).searchParams.get("q") ?? "";
    state.branchRequests.push(q);
    const all = [
      { name: "main", protected: true, isDefault: true },
      { name: "dev", protected: false, isDefault: false },
      { name: "release/1.0", protected: false, isDefault: false },
      { name: "release/1.1", protected: false, isDefault: false },
    ];
    return json(route, { repository: "o/r", branches: q ? all.filter((branch) => branch.name.startsWith(q)) : all, defaultBranch: "main" });
  });
  await page.route("**/api/runs/artifact-counts?*", (route) => json(route, { repository: "o/r", counts }));
  return state;
}

test("workflow runs default to hiding PR runs and runs without artifacts, with matching controls", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await mockApi(page);

  await page.goto(`${launched.base}#/runs/o%2Fr`);
  await page.waitForSelector("[data-run-row]");
  assert.equal(state.listRequests[0].get("nopr"), "1", "pull request runs are hidden by default");
  assert.equal(await page.getAttribute('[data-run-toggle="excludePullRequests"]', "aria-pressed"), "true");
  assert.equal(await page.getAttribute('[data-run-toggle="hasArtifacts"]', "aria-pressed"), "true");

  await page.waitForFunction(() => document.querySelector('[data-run-artifacts="101"]')?.textContent.includes("2 artifacts"));
  assert.match(await page.locator('[data-run-artifacts="102"]').textContent(), /No artifacts/);
  assert.equal(await page.locator("[data-run-row]:visible").count(), 2, "runs without artifacts are hidden by default");
  assert.match(await page.locator("#run-list-artifact-note").textContent(), /1 without artifacts hidden/);
  assert.match(await page.locator('[data-run-row="103"]').textContent(), /#7/);

  const heights = await page.$$eval(".run-filter-controls .app-button", (buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().height)));
  assert.ok(heights.length >= 6);
  assert.equal(new Set(heights).size, 1, `every filter control has the same height: ${heights}`);

  await page.click('[data-run-toggle="hasArtifacts"]');
  await page.waitForFunction(() => location.hash.includes("artifacts=0"));
  await page.waitForFunction(() => document.querySelectorAll("[data-run-row]:not([hidden])").length === 3);
  assert.equal(await page.getAttribute('[data-run-toggle="hasArtifacts"]', "aria-pressed"), "false");

  await page.click('[data-run-toggle="excludePullRequests"]');
  await page.waitForFunction(() => location.hash.includes("nopr=0"));
  await page.waitForFunction(() => document.querySelector('[data-run-toggle="excludePullRequests"]')?.getAttribute("aria-pressed") === "false");
  assert.equal(state.listRequests.at(-1).has("nopr"), false, "PR runs are requested once the toggle is off");

  await page.click('[data-toggle-run-filter="event"]');
  await page.click('[data-run-filter-option="event"][data-value="pull_request"]');
  await page.waitForFunction(() => location.hash.includes("event=pull_request"));
  assert.equal(await page.getAttribute('[data-run-toggle="excludePullRequests"]', "aria-pressed"), "false");
  assert.deepEqual(errors, []);
});

test("branch filter autocompletes real branches and is operable by keyboard", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await mockApi(page);

  await page.goto(`${launched.base}#/runs/o%2Fr?artifacts=0`);
  await page.waitForSelector("[data-run-row]");
  await page.click('[data-toggle-run-filter="branch"]');
  assert.equal(await page.evaluate(() => document.activeElement?.id), "run-branch-search");
  await page.waitForSelector('#run-branch-options [data-value="release/1.0"]');
  const initial = await page.$$eval("#run-branch-options [role=option]", (nodes) => nodes.map((node) => node.dataset.value));
  assert.deepEqual(initial, ["", "main", "dev", "release/1.0", "release/1.1"]);
  assert.match(await page.locator('#run-branch-options [data-value="main"]').textContent(), /default/);

  await page.fill("#run-branch-search", "rel");
  await page.waitForFunction(() => document.querySelectorAll("#run-branch-options [role=option]").length === 2);
  assert.ok(state.branchRequests.includes("rel"));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash.includes("branch=release%2F1.1"));
  await page.waitForSelector('[data-toggle-run-filter="branch"].is-filtered');
  for (let attempt = 0; attempt < 50 && state.listRequests.at(-1)?.get("branch") !== "release/1.1"; attempt++) {
    await page.waitForTimeout(100);
  }
  assert.equal(state.listRequests.at(-1).get("branch"), "release/1.1");
  assert.match(await page.locator('[data-toggle-run-filter="branch"]').textContent(), /release\/1\.1/);

  await page.click('[data-toggle-run-filter="branch"]');
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#run-branch-panel").isHidden(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.toggleRunFilter), "branch");

  await page.click("[data-run-reset]");
  await page.waitForFunction(() => !location.hash.includes("branch="));
  assert.deepEqual(errors, []);
});

test("an all-hidden page offers a way out and run detail keeps artifact context", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApi(page, { runs: [run(102)], counts: { 102: 0 } });
  await page.route("**/api/runs/101?*", (route) =>
    json(route, {
      repository: "o/r",
      run: run(101),
      runs: [run(101)],
      runCount: 1,
      runsTruncated: false,
      artifacts: [
        {
          id: 5,
          name: "coverage-report",
          sizeInBytes: 2048,
          expired: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          run: run(101),
        },
      ],
      artifactCount: 1,
      artifactsTruncated: false,
    }),
  );
  await page.route("**/api/artifacts/5", (route) => json(route, { error: "stubbed" }, 502));

  await page.goto(`${launched.base}#/runs/o%2Fr`);
  await page.waitForSelector("#run-list-empty:visible");
  assert.match(await page.locator("#run-list-empty").textContent(), /No runs with artifacts on this page/);
  await page.click('#run-list-empty [data-run-toggle="hasArtifacts"]');
  await page.waitForSelector("[data-run-row]:not([hidden])");

  await page.goto(`${launched.base}#/run/o%2Fr/101`);
  await page.waitForSelector(".artifact-row");
  assert.match(await page.locator("h1.page-title").textContent(), /Nightly build 101/);
  assert.equal(await page.locator("[data-rerun-run='101']").count(), 2, "header and artifact row both offer a re-run");
  const inspect = page.locator("button[data-inspect-artifact='5']").first();
  assert.equal(await inspect.getAttribute("data-run-id"), "101");
  assert.equal(await inspect.getAttribute("data-pull-number"), "0");
  assert.match(await page.locator("#breadcrumb-trail").textContent(), /Workflow runs/);

  await page.goto(`${launched.base}#/artifact/o%2Fr/0/5?run=101`);
  await page.waitForSelector("#view .flash-error");
  const crumbs = await page.locator("#breadcrumb-trail").textContent();
  assert.match(crumbs, /Workflow runs/);
  assert.match(crumbs, /Run 101/);
  assert.doesNotMatch(crumbs, /Pull requests/);
  assert.deepEqual(errors, []);
});

test("filtering a retried PR by Failing still lists the superseded failing artifact", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApi(page);
  const failed = run(201, { name: "CI", event: "pull_request", conclusion: "failure", createdAt: "2026-01-01T00:00:00Z" });
  const retried = run(202, { name: "CI", event: "pull_request", conclusion: "success", createdAt: "2026-01-02T00:00:00Z" });
  const artifact = (id, source) => ({
    id,
    name: "All-TestResults",
    sizeInBytes: 1024,
    expired: false,
    createdAt: source.createdAt,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    run: source,
  });
  await page.route("**/api/pulls/9?*", (route) =>
    json(route, {
      repository: "o/r",
      pullRequest: {
        number: 9,
        title: "Retried PR",
        state: "open",
        author: "octo",
        baseRef: "main",
        headRef: "feature",
        headSha: "c".repeat(40),
        url: "https://github.com/o/r/pull/9",
        updatedAt: new Date().toISOString(),
      },
      runs: [retried, failed],
      runCount: 2,
      runsTruncated: false,
      artifacts: [artifact(2, retried), artifact(1, failed)],
      artifactCount: 2,
      artifactsTruncated: false,
    }),
  );

  await page.goto(`${launched.base}#/pull/o%2Fr/9`);
  await page.waitForSelector(".artifact-row");
  assert.equal(await page.locator(".artifact-row").count(), 1, "default view shows only the latest copy");
  await page.click('[data-toggle-artifact-filter="status"]');
  assert.match(await page.locator('[data-select-artifact-status="failing"]').textContent(), /1/);
  await page.click('[data-select-artifact-status="failing"]');
  await page.waitForSelector("button[data-inspect-artifact='1']");
  assert.equal(await page.locator(".artifact-row").count(), 1);
  assert.deepEqual(errors, []);
});

test("a failed runs request shows a retryable error inside the page shell", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mockApi(page);
  let fail = true;
  await page.route("**/api/runs?*", (route) =>
    fail ? json(route, { error: "Upstream exploded" }, 502) : route.fallback(),
  );
  await page.goto(`${launched.base}#/runs/o%2Fr`);
  await page.waitForSelector(".run-list-error");
  assert.match(await page.locator(".run-list-error").textContent(), /Upstream exploded/);
  assert.equal(await page.locator("[data-run-filters]").count(), 1, "filters stay available");
  fail = false;
  await page.click(".run-list-error [data-refresh-view]");
  await page.waitForSelector("[data-run-row]");
});

test("the job progress popup has a bounded width, readable layout, and toasts stack above it", async (t) => {
  const launched = await launch(t);
  if (!launched) return;
  const page = await launched.browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApi(page);
  await page.goto(`${launched.base}#/runs/o%2Fr`);
  await page.waitForSelector("[data-run-row]");
  await page.evaluate(() => {
    handleJobEvent({ id: "11111111-1111-1111-1111-111111111111", kind: "download", status: "running", stage: "downloading", attempt: 1, repository: "o/r", artifactId: 5, artifactName: "x.zip", progress: { percent: 40, receivedBytes: 4000000, totalBytes: 10000000, bytesPerSecond: 1000000, etaSeconds: 6 }, prompts: [] });
    showToast("Retrying. A completed download is reused instead of fetched again.");
  });
  await page.waitForSelector(".job-card progress");
  const panel = await page.locator(".job-panel").boundingBox();
  assert.ok(panel.width >= 320 && panel.width <= 400, `panel width ${panel.width}`);
  assert.match(await page.locator(".job-progress-meta").textContent(), /40%.*3\.8 MiB of 9\.5 MiB.*977 KiB\/s.*6s left/s);
  assert.equal(await page.locator(".job-status").textContent(), "Running");
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--job-panel-offset") !== "");
  const toast = await page.locator(".toast-message").boundingBox();
  assert.ok(toast.y + toast.height <= panel.y, "the toast sits above the panel instead of covering it");

  await page.evaluate(() => handleJobEvent({ id: "11111111-1111-1111-1111-111111111111", kind: "download", status: "succeeded", attempt: 1, repository: "o/r", artifactId: 5, artifactName: "x.zip", progress: null, prompts: [] }));
  await page.waitForFunction(() => document.querySelector(".job-panel")?.hidden === true);
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--job-panel-offset") === "0px");
  assert.deepEqual(errors, []);
});