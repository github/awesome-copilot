import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { approveWorkflowRun, listOpenPullRequests, listWorkflowApprovals, summarizeChecks } from "../.github/extensions/open-pr-board/lib/github.mjs";
import { applyDecisionOnGitHub, approveWorkflowOnGitHub } from "../.github/extensions/open-pr-board/lib/decisions.mjs";
import { BoardStore } from "../.github/extensions/open-pr-board/lib/state.mjs";

const repo = "example/repo";
const pull = () => ({
    number: 1, state: "open",
    head: { sha: "first", ref: "feature", repo: { id: 2, private: false } },
    base: { repo: { id: 1 } },
});
const run = (extra = {}) => ({
    id: 10, workflow_id: 3, run_attempt: 1, name: "CI", html_url: "https://github.com/example/repo/actions/runs/10",
    event: "pull_request", status: "completed", conclusion: "action_required",
    head_sha: "first", head_branch: "feature", repository: { id: 1 }, head_repository: { id: 2 },
    pull_requests: [], ...extra,
});
const options = { runId: 10, attempt: 1, headRefOid: "first" };
const approval = { id: 10, attempt: 1, name: "CI", headRefOid: "first", url: run().html_url };

function fakeGitHub({ pr = pull(), runs = [run()], currentRun = run(), permissions = { push: true }, finalPr = pr, postError } = {}) {
    const calls = [];
    let prReads = 0;
    return {
        calls,
        runner: async (args) => {
            calls.push(args);
            const endpoint = args.find((arg) => arg.startsWith("repos/"));
            if (endpoint === `repos/${repo}`) return JSON.stringify({ permissions });
            if (endpoint === `repos/${repo}/pulls/1`) return JSON.stringify(prReads++ ? finalPr : pr);
            if (endpoint.includes("/actions/runs?")) return JSON.stringify([{ workflow_runs: runs }]);
            if (endpoint.endsWith("/actions/runs/10")) return JSON.stringify(currentRun);
            if (endpoint.endsWith("/approve")) {
                if (postError) throw postError;
                return "";
            }
            throw new Error(`Unexpected request: ${args.join(" ")}`);
        },
    };
}
const writes = (fake) => fake.calls.filter((args) => args.includes("POST"));

test("ACTION_REQUIRED is attention, not failure, pass, or proof of workflow approval", () => {
    const summary = summarizeChecks([
        { name: "Submission Gate", status: "COMPLETED", conclusion: "ACTION_REQUIRED" },
        { name: "CI", status: "QUEUED" },
    ]);
    assert.equal(summary.state, "actionRequired");
    assert.equal(summary.counts.actionRequired, 1);
    assert.equal(summary.counts.pending, 1);
    assert.equal(summary.counts.failure, 0);
    assert.equal(summarizeChecks([{ status: "COMPLETED", conclusion: "FAILURE" }]).state, "failure");
});

test("discovery paginates exact head runs and supports fork runs with no PR association", async () => {
    const fake = fakeGitHub();
    assert.deepEqual(await listWorkflowApprovals(repo, pull(), fake.runner), [approval]);
    assert.deepEqual(fake.calls[0], ["api", "--paginate", "--slurp",
        "repos/example/repo/actions/runs?event=pull_request&head_sha=first&per_page=100"]);
    assert.equal(writes(fake).length, 0);
    const pages = [{ workflow_runs: [run({ workflow_id: 4, id: 8 })] }, { workflow_runs: [run()] }];
    assert.equal((await listWorkflowApprovals(repo, pull(), async () => JSON.stringify(pages))).length, 2);
});

for (const extra of [
    { event: "workflow_run" }, { event: "pull_request_target" },
    { status: "queued", conclusion: null }, { status: "in_progress", conclusion: null },
    { status: "waiting", conclusion: null }, { conclusion: "failure" }, { conclusion: "success" },
    { head_sha: "old" }, { head_branch: "other" }, { repository: { id: 9 } },
    { head_repository: { id: 9 } }, { pull_requests: [{ number: 9 }] }, { run_attempt: undefined },
]) {
    test(`discovery excludes unsupported or unrelated run ${JSON.stringify(extra)}`, async () => {
        assert.deepEqual(await listWorkflowApprovals(repo, pull(), fakeGitHub({ runs: [run(extra)] }).runner), []);
    });
}

test("discovery excludes private and same-repository PRs without extra API calls", async () => {
    const pr = pull();
    const fake = fakeGitHub();
    pr.head.repo = { id: 1, private: false };
    assert.deepEqual(await listWorkflowApprovals(repo, pr, fake.runner), []);
    pr.head.repo = { id: 2, private: true };
    assert.deepEqual(await listWorkflowApprovals(repo, pr, fake.runner), []);
    assert.equal(fake.calls.length, 0);
});

test("a newer successful run supersedes an old approval request at the same head", async () => {
    const fake = fakeGitHub({ runs: [run(), run({ id: 11, conclusion: "success" })] });
    assert.deepEqual(await listWorkflowApprovals(repo, pull(), fake.runner), []);
});

test("a newer run associated only with another PR does not displace this PR's waiting run", async () => {
    const fake = fakeGitHub({ runs: [
        run({ pull_requests: [{ number: 1 }] }),
        run({ id: 11, pull_requests: [{ number: 2 }] }),
    ] });
    assert.deepEqual(await listWorkflowApprovals(repo, pull(), fake.runner), [approval]);
});

test("PR listing preserves approval discovery errors without clearing checks", async () => {
    const items = await listOpenPullRequests(repo, async (args) => {
        if (args.includes("--json")) return JSON.stringify({
            statusCheckRollup: [{ status: "COMPLETED", conclusion: "ACTION_REQUIRED" }],
        });
        if (args.at(-1).includes("/pulls?")) return JSON.stringify([[pull()]]);
        throw new Error("Attacker-controlled workflow output");
    });
    assert.equal(items[0].checksState, "actionRequired");
    assert.deepEqual(items[0].workflowApprovals, []);
    assert.equal(items[0].workflowApprovalError,
        "Could not discover workflow approvals (WORKFLOW_APPROVAL_DISCOVERY_FAILED).");
    assert.doesNotMatch(items[0].workflowApprovalError, /Attacker-controlled/);
});

test("approval uses the supported POST endpoint after permission, run and live head guards", async () => {
    const fake = fakeGitHub();
    assert.deepEqual(await approveWorkflowRun(repo, 1, options, fake.runner), { status: "workflow-execution-approved" });
    assert.deepEqual(writes(fake), [["api", "repos/example/repo/actions/runs/10/approve", "--method", "POST"]]);
    assert.equal(fake.calls.at(-2)[1], "repos/example/repo/pulls/1");
    assert.equal(fake.calls.some((args) => args.includes("review") || args.includes("merge") || args.includes("rerun")), false);
});

for (const invalid of [{}, { ...options, runId: "../other" }, { ...options, attempt: 0 }, { ...options, headRefOid: "" }]) {
    test(`approval rejects missing or invalid provenance ${JSON.stringify(invalid)}`, async () => {
        const fake = fakeGitHub();
        await assert.rejects(approveWorkflowRun(repo, 1, invalid, fake.runner), /Refresh and select/);
        assert.equal(fake.calls.length, 0);
    });
}

for (const [name, config, message] of [
    ["no write permission", { permissions: { pull: true } }, /write access/],
    ["unknown permissions", { permissions: null }, /write access/],
    ["closed PR", { pr: { ...pull(), state: "closed" } }, /no longer open/],
    ["changed head", { pr: { ...pull(), head: { ...pull().head, sha: "new" } } }, /changed/],
    ["changed attempt", { currentRun: run({ run_attempt: 2 }) }, /run changed/],
    ["wrong run ID", { currentRun: run({ id: 11 }) }, /run changed/],
    ["run already running", { currentRun: run({ status: "in_progress", conclusion: null }) }, /run changed/],
    ["newer completed run", { runs: [run(), run({ id: 11, conclusion: "success" })] }, /no longer awaiting/],
    ["PR changes during discovery", { finalPr: { ...pull(), head: { ...pull().head, sha: "new" } } }, /changed/],
]) {
    test(`approval rejects ${name} without writes`, async () => {
        const fake = fakeGitHub(config);
        await assert.rejects(approveWorkflowRun(repo, 1, options, fake.runner), message);
        assert.equal(writes(fake).length, 0);
    });
}

test("approval API errors are surfaced once with no rerun or fallback mutation", async () => {
    for (const message of ["Forbidden (403)", "Not Found (404)", "network timeout"]) {
        const fake = fakeGitHub({ postError: new Error(message) });
        await assert.rejects(approveWorkflowRun(repo, 1, options, fake.runner),
            (error) => error.message.includes(message) && /not confirmed/.test(error.message));
        assert.equal(writes(fake).length, 1);
    }
});

test("review briefs distinguish attention and execution approval and prohibit agent authorization", async () => {
    const { buildReviewPrompt } = await import("../.github/extensions/open-pr-board/lib/review-prompt.mjs");
    const prompt = buildReviewPrompt({
        repo, instanceId: "test", guidancePath: "review-guidance.md",
        items: [{
            number: 1, queueId: "queue", labels: [], workflowApprovals: [approval],
            checkCounts: { total: 1, failure: 0, pending: 0, success: 0, actionRequired: 1 },
        }],
        decisions: [],
    });
    assert.match(prompt, /1 needing attention/);
    assert.match(prompt, /fork workflows awaiting execution approval: 1/);
    assert.match(prompt, /Do not post comments, submit reviews, approve or run workflows/);
});

async function createStore(t) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "board-workflow-approval-"));
    t.after(() => rm(dir, { force: true, recursive: true }));
    const store = new BoardStore({ file: path.join(dir, "board.json"), repo });
    await store.syncPullRequests([{
        number: 1, headRefOid: "first", title: "PR", labels: [], workflowApprovals: [approval],
    }]);
    return store;
}

test("board requires explicit confirmation, displayed head, and discovered run/attempt", async (t) => {
    const store = await createStore(t);
    for (const extra of [{ confirmed: false }, { headRefOid: "old" }, { attempt: 2 }, { runId: 20 }]) {
        await assert.rejects(approveWorkflowOnGitHub({
            store, number: 1, ...options, confirmed: true, ...extra,
            github: { approveWorkflowRun: () => assert.fail("must not write") },
        }));
    }
});

test("successful execution approval persists history and refreshes without disturbing PR triage", async (t) => {
    const store = await createStore(t);
    await store.moveItem(1, "needs-insight", "first");
    await store.markQueued([1]);
    const before = structuredClone(store.getItem(1));
    let refreshes = 0;
    const result = await approveWorkflowOnGitHub({
        store, number: 1, ...options, confirmed: true,
        github: { approveWorkflowRun: async (...args) => {
            assert.deepEqual(args, [repo, 1, options]);
            return { status: "workflow-execution-approved" };
        } },
        refresh: async () => { refreshes++; },
    });
    assert.equal(result.warning, null);
    assert.equal(refreshes, 1);
    assert.deepEqual(store.getItem(1), before);
    assert.equal(store.state.history[0].kind, "workflow-execution");
    assert.equal((await new BoardStore({ file: store.file, repo }).load()).state.history[0].runId, 10);
});

test("workflow approval shares the PR decision lock and releases it after failure", async (t) => {
    const store = await createStore(t);
    let reject;
    const pending = new Promise((_, no) => { reject = no; });
    const args = { store, number: 1, ...options, confirmed: true, refresh: async () => {} };
    const first = approveWorkflowOnGitHub({ ...args, github: { approveWorkflowRun: () => pending } });
    await assert.rejects(approveWorkflowOnGitHub(args), /in progress/);
    await assert.rejects(applyDecisionOnGitHub({ store, number: 1, kind: "close" }), /in progress/);
    reject(new Error("403"));
    await assert.rejects(first, /403/);
    assert.equal(store.state.history.length, 0);
    await approveWorkflowOnGitHub({ ...args, github: { approveWorkflowRun: async () => ({ status: "approved" }) } });
});

test("successful write with failed history and refresh returns partial-success warnings, never retries", async (t) => {
    const store = await createStore(t);
    let writes = 0;
    store.recordWorkflowApproval = async () => { throw new Error("disk full"); };
    const result = await approveWorkflowOnGitHub({
        store, number: 1, ...options, confirmed: true,
        github: { approveWorkflowRun: async () => { writes++; return { status: "workflow-execution-approved" }; } },
        refresh: async () => { throw new Error("offline"); },
    });
    assert.equal(writes, 1);
    assert.match(result.warning, /disk full/);
    assert.match(result.warning, /offline/);
    assert.equal(store.getItem(1).decision, null);
});
