import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { APPROVED_FILES, approvalChanges, fingerprint, takeWaivers, waiverFile } from "../lib/approval.mjs";
import { META, validateArgs } from "../lib/args.mjs";
import { ContainmentError, contained } from "../lib/fsguard.mjs";
import { LEASE, LOCK, acquireLease } from "../lib/lease.mjs";
import { MAX_ROUNDS, checkpointLines } from "../lib/loop.mjs";
import { owner, ownershipCheck } from "../lib/ownership.mjs";
import { rerunPlan } from "../lib/rerun.mjs";
import { buildPrompt } from "../lib/prompts.mjs";
import { MAX_EVIDENCE, normalize, planWorkstreams, recordFile, runFile, writeRecord } from "../lib/record.mjs";
import { SKILLS, skillDrift, skillProvenance } from "../lib/skills.mjs";
import { createWorkflow } from "../lib/workflow.mjs";
import { BRIEF, WORKSTREAMS, defaultResponder, extensionDir, failed, harness, labels, logMatches, passed, workspace } from "./helpers.mjs";

const git = promisify(execFile);
const sha = text => createHash("sha256").update(text).digest("hex");
const exists = file => stat(file).then(() => true, () => false);
const AUTO = { brief: BRIEF, autonomy: "auto", maxFixLoops: 0 };
const SUB = "0000aaaa-bbbb-4ccc-8ddd-eeeeffff0000";

async function azure(cwd, { plan = "# Plan v1\n", location = "eastus2", foundry = "" } = {}) {
    await mkdir(path.join(cwd, ".azure", "claims-dev"), { recursive: true });
    await mkdir(path.join(cwd, "docs"), { recursive: true });
    await writeFile(path.join(cwd, ".azure", "deployment-plan.md"), plan);
    await writeFile(path.join(cwd, "docs", "spec.md"), "# Spec\n");
    await writeFile(path.join(cwd, ".azure", "config.json"), JSON.stringify({ version: 1, defaultEnvironment: "claims-dev" }));
    await writeFile(path.join(cwd, ".azure", "claims-dev", ".env"), `AZURE_ENV_NAME="claims-dev"\nAZURE_SUBSCRIPTION_ID="${SUB}"\nAZURE_LOCATION="${location}"\nAZURE_RESOURCE_GROUP="rg-claims-dev"\n${foundry}AZURE_OPENAI_KEY="s3cret"\n`);
}

async function routerSkill(dir, text = "# Router\n") {
    await mkdir(path.join(dir, "references"), { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), text);
    for (const file of ["sdd.md", "specify.md", "implement.md", "verify.md", "deploy.md"]) await writeFile(path.join(dir, "references", file), `# ${file}\n`);
}

const latest = (run, prefix) => run.state.calls.filter(call => call.attempt === run.state.attempts && call.label.startsWith(prefix)).map(call => call.label);
const promptOf = (run, label) => run.state.calls.find(call => call.label === label)?.prompt ?? "";

// 1 and 8: a pass is only a pass with no open issues, and Verify or Deploy passes need evidence.
test("normalize turns passes with open issues or without required evidence into failures, and bounds evidence", () => {
    const withIssues = normalize({ status: "passed", summary: "All good", issues: ["E2E still red"] }, "Specify · review");
    assert.equal(withIssues.status, "failed");
    assert.deepEqual(withIssues.issues, ["E2E still red"]);
    assert.equal(withIssues.summary, "Reported passed with 1 open issue, so it counts as failed: All good");

    const bare = normalize({ status: "passed", summary: "Looks fine", issues: [] }, "Verify · review", { requireEvidence: true });
    assert.equal(bare.status, "failed");
    assert.match(bare.issues[0], /^Verify · review reported passed without evidence items/);
    assert.equal(normalize({ status: "passed", summary: "ok", issues: [] }, "Specify · review").status, "passed", "Specify does not require evidence");

    const many = Array.from({ length: 20 }, (_, index) => ({ claim: `claim ${index} ${"x".repeat(300)}`, source: "s".repeat(400), result: "r\n".repeat(200) }));
    const proved = normalize({ status: "passed", summary: "ok", issues: [], evidence: [{ source: "no claim" }, ...many] }, "Deploy · review", { requireEvidence: true });
    assert.equal(proved.status, "passed");
    assert.equal(proved.evidence.length, MAX_EVIDENCE);
    assert.ok(proved.evidence.every(row => row.claim.length <= 200 && row.source.length <= 300 && row.result.length <= 200 && !row.result.includes("\n")));
    assert.deepEqual(normalize(null, "X").evidence, []);
});

test("Verify and Deploy gates fail a pass without evidence and persist the evidence of a real pass", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { ...AUTO, skipDeploy: true },
        responder: who => (who === "Verify · review" ? { status: "passed", summary: "trust me", issues: [], lessons: [] } : defaultResponder(who)),
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-verify-r1" });
    let record = await run.record();
    const gate = record.phases.find(entry => entry.phase === "Verify");
    assert.equal(gate.status, "failed");
    assert.match(gate.issues[0], /without evidence items/);
    assert.deepEqual(record.phases.find(entry => entry.phase === "Specify").evidence, [{ claim: "Specify · review gate checks", source: "test", result: "ok" }]);

    run.state.responder = defaultResponder;
    assert.equal((await run.attempt()).status, "completed");
    record = await run.record();
    assert.deepEqual(record.phases.at(-2).evidence, [{ claim: "Verify · review · r2 gate checks", source: "test", result: "ok" }]);
});

// 2: the final round never promises a retry it cannot run.
test("the final round's blocked checkpoint says rounds are exhausted instead of promising a retry", async t => {
    const early = checkpointLines("blocked-verify-r3", { phase: "Verify", round: 3, status: "failed", issues: ["E2E red"] });
    assert.match(early.resume, /retrying Verify as round 4/);
    const last = checkpointLines(`blocked-verify-r${MAX_ROUNDS}`, { phase: "Verify", round: MAX_ROUNDS, status: "failed", issues: ["E2E red"], waivers: "x" });
    assert.match(last.wait, new RegExp(`round ${MAX_ROUNDS} of ${MAX_ROUNDS}, so this run cannot retry Verify`));
    assert.match(last.wait, /start a new run, or rerun only this phase with from and to: "Verify"/);
    assert.doesNotMatch(`${last.wait} ${last.resume}`, /retrying|round \d+ ?\+|resume to retry|waivers/);
    assert.match(last.resume, /no rounds left/);

    const { cwd, home } = await workspace(t);
    const blocked = { status: "blocked", summary: "Owner role needed", issues: ["Grant Foundry User"], lessons: [] };
    const run = harness({ cwd, home, args: AUTO, responder: who => (who.startsWith("Specify · lead") ? blocked : defaultResponder(who)) });
    for (let round = 1; round <= MAX_ROUNDS; round += 1) assert.deepEqual(await run.attempt(), { status: "paused", key: `blocked-specify-r${round}` });
    const wait = run.state.logs.at(-1);
    assert.match(wait, /^Needs you: Specify is blocked \(Grant Foundry User\)\. That was round 20 of 20/);
    assert.match(wait, /then start a new run\.$/);
    const outcome = await run.attempt();
    assert.equal(outcome.status, "error");
    assert.match(outcome.error.message, /did not pass its gate in 20 rounds/);
    assert.ok(!run.state.logs.some(line => /round 21/.test(line)));
    assert.equal((await run.record()).status, "error");
});

// 3: the record is mandatory at boundaries.
test("a flight record that cannot be written pauses the run, and resuming saves it before continuing", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF } });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-spec-v1" });
    const file = path.join(cwd, ...recordFile("run-1").split("/"));
    await rm(file);
    await mkdir(file);

    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-record-resume-approve-spec-v1" });
    assert.match(run.state.logs.at(-1), new RegExp(`^Needs you: the flight record could not be written to ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(`));
    assert.equal(labels(run.state, "Implement").length, 0, "nothing runs without a record");

    const failedAgain = await run.attempt();
    assert.equal(failedAgain.status, "error");
    assert.match(failedAgain.error.message, /still cannot be written/);

    await rm(file, { recursive: true });
    const outcome = await run.attempt();
    assert.deepEqual(outcome, { status: "paused", key: "approve-deploy-v1" });
    assert.ok(run.state.logs.includes("Flight record saved. Continuing."));
    const record = await run.record();
    assert.equal(record.pending, "approve-deploy-v1");
    assert.ok(record.checkpoints.some(row => row.key === "approve-spec-v1"));
});

test("a setup that cannot write the flight record fails instead of running without one", async t => {
    const { cwd, home } = await workspace(t);
    await mkdir(path.join(cwd, ...recordFile("run-1").split("/")), { recursive: true });
    const outcome = await harness({ cwd, home, args: { brief: BRIEF } }).attempt();
    assert.equal(outcome.status, "error");
    assert.match(outcome.error.message, /^The flight record could not be written to .*run-1\.json/);
});

// 4: one active run per workspace.
test("the workspace lease refuses a second active run, takes over a stale one and is released on pause", async t => {
    const { cwd, home } = await workspace(t);
    const lease = path.join(cwd, ...LEASE.split("/"));
    await mkdir(path.dirname(lease), { recursive: true });
    await writeFile(lease, JSON.stringify({ runId: "other-run", startedAt: "2026-01-01T00:00:00.000Z", heartbeatAt: "2026-01-01T00:00:00.000Z" }));
    const refused = await harness({ cwd, home, args: { brief: BRIEF } }).attempt();
    assert.equal(refused.status, "error");
    assert.match(refused.error.message, /Another Agentic Loop run, other-run, is active in this workspace/);
    assert.match(refused.error.message, /delete \.agentic-loop\/active-run\.json/);
    assert.equal(await exists(path.join(cwd, ...recordFile("run-1").split("/"))), false);

    await writeFile(lease, JSON.stringify({ runId: "other-run", startedAt: "2025-12-31T00:00:00.000Z", heartbeatAt: "2025-12-31T23:00:00.000Z" }));
    const held = [];
    const run = harness({
        cwd, home, args: { brief: BRIEF },
        responder: async who => {
            held.push(JSON.parse(await readFile(lease, "utf8")).runId);
            return defaultResponder(who);
        },
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-spec-v1" });
    assert.equal(logMatches(run.state, /^Workspace lease: took over the stale lease of run other-run/).length, 1);
    assert.deepEqual([...new Set(held)], ["run-1"]);
    assert.equal(await exists(lease), false, "a paused run releases the lease");

    await writeFile(lease, JSON.stringify({ runId: "run-2", startedAt: "2026-01-01T00:00:30.000Z", heartbeatAt: "2026-01-01T00:00:30.000Z" }));
    const blocked = await run.attempt();
    assert.equal(blocked.status, "error");
    assert.match(blocked.error.message, /run-2, is active/);
    await rm(lease);
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" }, "a resume of the same run takes the lease back");
    assert.equal(await exists(lease), false);
});

test("a heartbeat waiting on the lease lock never writes the lease back after release", async t => {
    const { cwd } = await workspace(t);
    const file = path.join(cwd, ...LEASE.split("/"));
    const lock = path.join(cwd, ...LOCK.split("/"));
    for (let trial = 1; trial <= 5; trial += 1) {
        const lease = await acquireLease(cwd, `run-${trial}`, { now: () => new Date().toISOString(), log: () => {} });
        await mkdir(lock);
        const refresh = lease.refresh();
        await new Promise(resolve => setTimeout(resolve, 10));
        const release = lease.release();
        await rm(lock, { recursive: true });
        await Promise.all([refresh, release]);
        assert.equal(await exists(file), false, `trial ${trial}: the released lease stays released`);
    }
});

test("a run that loses its lease to another run stops writing", async t => {
    const { cwd, home } = await workspace(t);
    const lease = path.join(cwd, ...LEASE.split("/"));
    const run = harness({
        cwd, home, args: { brief: BRIEF },
        responder: async who => {
            if (who === "Specify · review") await writeFile(lease, JSON.stringify({ runId: "intruder", startedAt: "2026-01-01T00:00:00.000Z", heartbeatAt: "2026-01-01T00:00:00.000Z" }));
            return defaultResponder(who);
        },
    });
    const outcome = await run.attempt();
    assert.equal(outcome.status, "error");
    assert.match(outcome.error.message, /now held by run intruder/);
    assert.equal(JSON.parse(await readFile(lease, "utf8")).runId, "intruder", "the other run's lease is left alone");
});

test("two runs taking over the same stale lease at once: exactly one wins", async t => {
    const { cwd } = await workspace(t);
    const lease = path.join(cwd, ...LEASE.split("/"));
    await mkdir(path.dirname(lease), { recursive: true });
    for (let trial = 0; trial < 5; trial += 1) {
        await writeFile(lease, JSON.stringify({ runId: "crashed", startedAt: "2025-12-31T00:00:00.000Z", heartbeatAt: "2025-12-31T00:00:00.000Z" }));
        const now = () => "2026-01-01T00:00:00.000Z";
        const results = await Promise.allSettled(["run-a", "run-b"].map(runId => acquireLease(cwd, runId, { now, log: () => {} })));
        const won = results.filter(row => row.status === "fulfilled");
        assert.equal(won.length, 1, `trial ${trial}: one takeover succeeds`);
        assert.match(results.find(row => row.status === "rejected").reason.message, /is active in this workspace/);
        assert.equal(JSON.parse(await readFile(lease, "utf8")).runId, won[0].value.lease.runId);
        assert.equal(await exists(path.join(cwd, ...LOCK.split("/"))), false, "the lock is removed");
        await won[0].value.release();
    }
});

test("a lease lock left by a crash is reported instead of ignored", async t => {
    const { cwd } = await workspace(t);
    const lock = path.join(cwd, ...LOCK.split("/"));
    await mkdir(lock, { recursive: true });
    const old = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(lock, old, old);
    await assert.rejects(acquireLease(cwd, "run-a", { now: () => new Date().toISOString(), log: () => {} }), /lock \.agentic-loop\/active-run\.lock is older than two minutes/);
    assert.equal(await exists(path.join(cwd, ...LEASE.split("/"))), false);
});

// 5: no symbolic link can move the workflow's reads or writes outside the workspace.
test("containment rejects symbolic links for AGENTS.md, .agentic-loop and its runs folder", async t => {
    for (const [name, link] of [["AGENTS.md", "file"], [".agentic-loop", "dir"], [".agentic-loop/runs", "dir"]]) {
        const { root, cwd, home } = await workspace(t);
        const outside = path.join(root, "outside");
        if (link === "file") await writeFile(outside, "# Outside\n");
        else await mkdir(outside, { recursive: true });
        await mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
        await symlink(outside, path.join(cwd, name));
        const outcome = await harness({ cwd, home, args: { brief: BRIEF } }).attempt();
        assert.equal(outcome.status, "error", name);
        assert.match(outcome.error.message, new RegExp(`${name.replace(/\./g, "\\.")} is a symbolic link`), name);
        if (link === "file") assert.equal(await readFile(outside, "utf8"), "# Outside\n");
        else assert.deepEqual(await (await import("node:fs/promises")).readdir(outside), [], `${name}: nothing written outside the workspace`);
    }
});

test("contained resolves plain workspace paths and refuses escapes and linked record files", async t => {
    const { root, cwd } = await workspace(t);
    assert.equal(await contained(cwd, "docs/spec.md"), path.join(await (await import("node:fs/promises")).realpath(cwd), "docs", "spec.md"));
    for (const bad of ["../x", "a/../../x", "./x", "", "a\\b"]) await assert.rejects(contained(cwd, bad), ContainmentError, bad);
    const runs = path.join(cwd, ".agentic-loop", "runs");
    await mkdir(runs, { recursive: true });
    await writeFile(path.join(root, "target.json"), "{}");
    await symlink(path.join(root, "target.json"), path.join(runs, "run-x.json"));
    await assert.rejects(writeRecord(cwd, { runId: "run-x" }), /runs\/run-x\.json is a symbolic link/);
    assert.equal(await readFile(path.join(root, "target.json"), "utf8"), "{}");
});

// 6: deployment runs only on what was approved.
test("approval fingerprints hash the reviewed files and the azd target without reading secrets", async t => {
    const { cwd } = await workspace(t);
    await azure(cwd);
    const args = validateArgs({ brief: BRIEF });
    const approved = await fingerprint(cwd, args);
    assert.deepEqual(Object.keys(approved.files), [...APPROVED_FILES]);
    assert.equal(approved.files[".azure/deployment-plan.md"], sha("# Plan v1\n"));
    assert.equal(approved.files["docs/verify.md"], sha("# Verify\n"));
    assert.deepEqual(approved.target, { environmentName: "claims-dev", subscriptionId: SUB, location: "eastus2", resourceGroup: "rg-claims-dev", foundryResourceGroup: null, aiAccountName: null, aiProjectName: null });
    assert.doesNotMatch(JSON.stringify(approved), /s3cret/);
    assert.deepEqual(approvalChanges(approved, await fingerprint(cwd, args)), []);
    await azure(cwd, { plan: "# Plan v2\n", location: "westus3" });
    assert.deepEqual(approvalChanges(approved, await fingerprint(cwd, args)), [".azure/deployment-plan.md", "AZURE_LOCATION (eastus2 → westus3)"]);
    assert.deepEqual(approvalChanges(null, approved), ["no approval fingerprint is recorded"]);
    const partial = { ...approved, target: { ...approved.target, resourceGroup: null } };
    assert.deepEqual(approvalChanges(partial, approved), ["AZURE_RESOURCE_GROUP (unset → rg-claims-dev)"], "a value set after approval was never reviewed");
    assert.deepEqual(approvalChanges(approved, partial), ["AZURE_RESOURCE_GROUP (rg-claims-dev → unset)"]);
    const foundry = name => `AZURE_FOUNDRY_RESOURCE_GROUP="${name}"\nAZURE_AI_ACCOUNT_NAME="ai-claims"\nAZURE_AI_PROJECT_NAME="claims_proj"\n`;
    await azure(cwd, { foundry: foundry("rg-claims-dev-foundry") });
    const withFoundry = await fingerprint(cwd, args);
    assert.deepEqual([withFoundry.target.foundryResourceGroup, withFoundry.target.aiAccountName, withFoundry.target.aiProjectName], ["rg-claims-dev-foundry", "ai-claims", "claims_proj"]);
    assert.deepEqual(approvalChanges(approved, withFoundry).filter(change => !change.startsWith(".azure/deployment-plan.md")), ["AZURE_FOUNDRY_RESOURCE_GROUP (unset → rg-claims-dev-foundry)", "AZURE_AI_ACCOUNT_NAME (unset → ai-claims)", "AZURE_AI_PROJECT_NAME (unset → claims_proj)"]);
    await azure(cwd, { foundry: foundry("rg-other-foundry") });
    assert.deepEqual(approvalChanges(withFoundry, await fingerprint(cwd, args)), ["AZURE_FOUNDRY_RESOURCE_GROUP (rg-claims-dev-foundry → rg-other-foundry)"], "another Foundry project is never covered by the approval");
    assert.match(buildPrompt({ base: { runId: "run-1", cwd: "/work", record: recordFile("run-1"), skills: { router: { name: SKILLS.router, dir: "/skills/router" } }, args }, phase: "Deploy", role: "lead", round: 1, task: "x", approval: { approvedAt: "t", ...withFoundry } }), /AZURE_FOUNDRY_RESOURCE_GROUP=rg-claims-dev-foundry, AZURE_AI_ACCOUNT_NAME=ai-claims, AZURE_AI_PROJECT_NAME=claims_proj\./);
    await azure(cwd);
    await rm(path.join(cwd, "docs", "verify.md"));
    const missing = await fingerprint(cwd, args);
    assert.equal(missing.files["docs/verify.md"], null);
    assert.ok(approvalChanges(approved, missing).includes("docs/verify.md (missing: add it, then approve again)"));
    assert.ok(approvalChanges(missing, await fingerprint(cwd, args)).includes("docs/verify.md (missing: add it, then approve again)"), "an approval taken while a file was missing never passes");
    await writeFile(path.join(cwd, "docs", "verify.md"), "# Verify\n");
    await writeFile(path.join(cwd, "notes.md"), "# Notes v1\n");
    await rm(path.join(cwd, "docs", "spec.md"));
    await symlink(path.join(cwd, "notes.md"), path.join(cwd, "docs", "spec.md"));
    const linked = await fingerprint(cwd, args);
    await writeFile(path.join(cwd, "notes.md"), "# Notes v2\n");
    assert.deepEqual(approvalChanges(linked, await fingerprint(cwd, args)).filter(change => change.startsWith("docs/spec.md")), ["docs/spec.md (cannot be read: fix it, then approve again)"], "a file that cannot be hashed never counts as unchanged");
    const skills = { router: { name: SKILLS.router, dir: "/skills/router" } };
    const base = { runId: "run-1", cwd: "/work", record: recordFile("run-1"), skills, args };
    const prompt = buildPrompt({ base, phase: "Deploy", role: "lead", round: 2, task: "x", approval: { approvedAt: "2026-01-01T00:00:00.000Z", ...partial } });
    assert.match(prompt, /AZURE_LOCATION=eastus2\. Unset at approval: AZURE_RESOURCE_GROUP, AZURE_FOUNDRY_RESOURCE_GROUP, AZURE_AI_ACCOUNT_NAME, AZURE_AI_PROJECT_NAME; set them only to values \.azure\/deployment-plan\.md names/);
});

for (const changed of [false, true]) {
    test(`deploy ${changed ? "re-asks for approval when the approved plan changed" : "continues without a new approval when nothing changed"}`, async t => {
        const { cwd, home } = await workspace(t);
        await azure(cwd);
        const run = harness({ cwd, home, args: AUTO, responder: who => (who === "Deploy · lead" ? failed(who, "azd up failed: quota") : defaultResponder(who)) });
        assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
        assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-deploy-r1" });
        let record = await run.record();
        assert.equal(record.deployApproval.key, "approve-deploy-v1");
        assert.equal(record.deployApproval.files[".azure/deployment-plan.md"], sha("# Plan v1\n"));
        assert.equal(record.checkpoints.find(row => row.key === "approve-deploy-v1").fingerprint.target.environmentName, "claims-dev");
        const prompt = promptOf(run, "Deploy · lead");
        assert.match(prompt, /Approved deployment \(approved [^)]+\): AZURE_ENV_NAME=claims-dev, AZURE_SUBSCRIPTION_ID=0000aaaa-bbbb-4ccc-8ddd-eeeeffff0000, AZURE_LOCATION=eastus2, AZURE_RESOURCE_GROUP=rg-claims-dev/);
        assert.match(prompt, /confirm that azd env get-values and az account show report the approved values; if any differs, change nothing and return blocked/);

        if (changed) await writeFile(path.join(cwd, ".azure", "deployment-plan.md"), "# Plan v2: bigger SKU\n");
        if (!changed) {
            assert.equal((await run.attempt()).status, "completed");
            assert.ok(!run.journal.pauses.has("approve-deploy-r2-v1"));
            assert.deepEqual(latest(run, "Deploy · lead"), ["Deploy · lead · r2"]);
            return;
        }
        assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-r2-v1" });
        assert.deepEqual(latest(run, "Deploy"), [], "Deploy does not run on a changed plan");
        assert.match(run.state.logs.at(-1), /^Needs you: approve deployment again\. Since you approved it, these changed: \.azure\/deployment-plan\.md\./);
        record = await run.record();
        assert.equal(record.status, "awaiting-approval");
        assert.equal(record.pending, "approve-deploy-r2-v1");
        assert.equal((await run.attempt()).status, "completed");
        record = await run.record();
        assert.equal(record.deployApproval.key, "approve-deploy-r2-v1");
        assert.equal(record.deployApproval.files[".azure/deployment-plan.md"], sha("# Plan v2: bigger SKU\n"));
        assert.ok(run.state.logs.includes("Deployment approved again. Running Deploy."));
    });
}

test("a Deploy fix that changes the approved plan pauses for approval before review can pass the gate", async t => {
    const { cwd, home } = await workspace(t);
    await azure(cwd);
    const responder = async who => {
        if (who === "Deploy · lead") return failed(who, "azd up failed: SKU unavailable");
        if (who === "Deploy · fix 1") {
            await writeFile(path.join(cwd, ".azure", "deployment-plan.md"), "# Plan v2: other SKU\n");
            return passed(who);
        }
        return defaultResponder(who);
    };
    const run = harness({ cwd, home, args: { ...AUTO, maxFixLoops: 1 }, responder });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-r1-a2-v1" });
    assert.match(promptOf(run, "Deploy · fix 1"), /make only that change, do not run azd up, provision or deploy, and return failed naming it/);
    assert.deepEqual(labels(run.state, "Deploy"), ["Deploy · lead", "Deploy · fix 1"], "review waits for the new approval");
    assert.match(run.state.logs.at(-1), /^Needs you: approve deployment again\. Since you approved it, these changed: \.azure\/deployment-plan\.md\./);
    assert.equal((await run.attempt()).status, "completed");
    const record = await run.record();
    assert.equal(record.deployApproval.key, "approve-deploy-r1-a2-v1");
    assert.equal(record.deployApproval.files[".azure/deployment-plan.md"], sha("# Plan v2: other SKU\n"));
    assert.ok(labels(run.state, "Deploy").includes("Deploy · review 2"));
});

test("a rerun inherits a spec approval only while its fingerprint matches the spec and plan", () => {
    const files = { ".azure/deployment-plan.md": sha("plan"), "docs/spec.md": sha("spec") };
    const record = approval => ({ runId: "run-1", checkpoints: [{ key: "approve-spec-v1" }], specApproval: approval, phases: [{ phase: "Specify", status: "passed", summary: "ok", at: "t" }] });
    const plan = (approval, current) => rerunPlan({ record: record(approval), file: "f" }, "Implement", { files: current });
    assert.equal(plan(null, files).specApproved, false, "a checkpoint without a fingerprint does not count");
    assert.equal(plan({ approvedAt: "t", files }, files).specApproved, true);
    assert.deepEqual(plan({ approvedAt: "t", files }, files).phases[0].specApproval, { approvedAt: "t", files }, "the approval travels with the inherited spec");
    const changed = plan({ approvedAt: "t", files }, { ...files, "docs/spec.md": sha("spec v2") });
    assert.equal(changed.specApproved, false);
    assert.deepEqual(changed.specChanges, ["docs/spec.md"]);
    assert.equal(plan({ approvedAt: "t", files }, { ...files, "docs/spec.md": "unreadable: EACCES" }).specApproved, false);
    const absent = { ...files, "docs/spec.md": null };
    assert.deepEqual(plan({ approvedAt: "t", files: absent }, absent).specChanges, ["docs/spec.md (missing: add it, then approve again)"], "a spec approved while missing never counts");
});

// 7: only waivers a human records during a blocked checkpoint count.
test("waivers count only when recorded during the blocked checkpoint for one of its issues", async t => {
    const { cwd, home } = await workspace(t);
    const issue = "Evaluation intent_resolution 3.9 is below the 4.0 threshold";
    const run = harness({ cwd, home, args: { ...AUTO, skipDeploy: true }, responder: who => (who.startsWith("Verify · review") ? failed(who, issue) : defaultResponder(who)) });
    const file = path.join(cwd, ...waiverFile("run-1").split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify([{ issue, reason: "pre-written by a subagent" }]));
    await utimes(file, new Date("2025-06-01"), new Date("2025-06-01"));
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-verify-r1" });
    assert.match(run.state.logs.at(-1), /write it with your reason to \.agentic-loop\/waivers\/run-1\.json/);

    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-verify-r2" });
    assert.equal(logMatches(run.state, /^Waivers ignored .*was written before blocked-verify-r1 paused/).length, 1);
    assert.deepEqual((await run.record()).waivers, []);
    assert.doesNotMatch(promptOf(run, "Verify · lead · r2"), /Human-approved waivers \(/);
    assert.equal(await exists(file), false, "a read waiver file is removed");

    await writeFile(file, JSON.stringify({ waivers: [{ issue, reason: "Product owner accepts 3.9 for the pilot" }, { issue: "made-up issue", reason: "x" }, { issue, reason: "" }] }));
    await utimes(file, new Date("2026-06-01"), new Date("2026-06-01"));
    run.state.responder = who => (who.startsWith("Verify · review") && run.state.calls.some(call => call.label === "Verify · lead · r3") ? passed(who) : who.startsWith("Verify · review") ? failed(who, issue) : defaultResponder(who));
    assert.equal((await run.attempt()).status, "completed");
    const record = await run.record();
    assert.equal(record.waivers.length, 1);
    assert.deepEqual({ ...record.waivers[0], approvedAt: "t" }, { issue, reason: "Product owner accepts 3.9 for the pilot", approvedAt: "t", checkpoint: "blocked-verify-r2" });
    assert.match(logMatches(run.state, /^Waivers ignored/).at(-1), /made-up issue/);
    const prompt = promptOf(run, "Verify · lead · r3");
    assert.match(prompt, /Human-approved waivers \(recorded by the workflow at a checkpoint/);
    assert.ok(prompt.includes(`${issue} (reason: Product owner accepts 3.9 for the pilot`));
    assert.match(prompt, /never waive, defer or downgrade an issue yourself/);
    assert.doesNotMatch(promptOf(run, "Specify · lead"), /Human-approved waivers \(/);
});

test("takeWaivers ignores unreadable or malformed files", async t => {
    const { cwd } = await workspace(t);
    const file = path.join(cwd, ...waiverFile("run/x").split("/"));
    assert.match(waiverFile("run/x"), /^\.agentic-loop\/waivers\/run-x-[0-9a-f]{8}\.json$/);
    const context = { runId: "run/x", key: "blocked-verify-r1", pausedAt: "2020-01-01T00:00:00.000Z", issues: ["a"], at: "2026-01-01T00:00:00.000Z" };
    assert.deepEqual(await takeWaivers(cwd, context), { waivers: [], ignored: [] });
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "not json");
    assert.match((await takeWaivers(cwd, context)).ignored[0], /is not a JSON list/);
});

// 9 and 10: evaluator list, azd eval contract, explicit poll deadlines and default ceilings.
test("prompts name the exact evaluators, the azd eval contract and explicit poll deadlines", () => {
    const skills = { router: { name: SKILLS.router, dir: "/skills/router" }, foundry: { name: SKILLS.foundry, dir: "/skills/foundry" } };
    const base = { runId: "run-1", cwd: "/work", record: recordFile("run-1"), skills, args: validateArgs({ brief: BRIEF }) };
    const verify = buildPrompt({ base, phase: "Verify", round: 1, role: "lead", task: "x" });
    for (const text of ["builtin.task_adherence", "builtin.intent_resolution", "builtin.groundedness when the agent is grounded", "content safety is enforced by guardrails",
        "azd ai agent eval generate --agent <service> --dataset tests/eval/dataset.jsonl --out-file tests/eval/<service>.eval.yaml",
        "azd ai agent eval run --agent <service> --config tests/eval/<service>.eval.yaml"]) assert.ok(verify.includes(text), text);
    assert.doesNotMatch(verify, /LAST_EVAL_ID|builtin\.(?:violence|hate|sexual|self_harm|content_safety|coherence|fluency)/);
    assert.match(verify, /evidence as up to 12 \{claim, source, result\} items/);
    assert.match(verify, /poll their status every 30-60 seconds with an explicit deadline \(20 minutes unless the guide sets another\); at the deadline stop and report blocked/);
    assert.doesNotMatch(buildPrompt({ base, phase: "Implement", round: 1, role: "lead", task: "x" }), /builtin\.task_adherence/);
});

test("META declares default ceilings that cover a multi-round run", () => {
    assert.deepEqual(META.limits, { maxTotalSubagents: 250, maxConcurrentSubagents: 4, timeoutSeconds: 43_200 });
    // Calls per run: Implement round 1 is foundation + up to 4 workers + integration + review, other rounds lead + review; each fix adds fix + review.
    const calls = (fixes, rounds) => 4 * rounds * (2 + 2 * fixes) + 5;
    assert.ok(calls(2, 3) <= META.limits.maxTotalSubagents / 3, "default fix loops, three rounds per phase, with room for retries");
    assert.ok(calls(5, 3) <= META.limits.maxTotalSubagents, "maximum fix loops, three rounds per phase");
    assert.ok(META.limits.maxConcurrentSubagents >= 4, "four parallel workstreams");
});

// 11: provenance and drift of the skills the subagents follow.
test("skill provenance records source, version and hashes, and a resume logs drift", async t => {
    const { root, cwd, home } = await workspace(t);
    const plugin = path.join(root, "plugin");
    await routerSkill(path.join(plugin, "skills", SKILLS.router));
    await writeFile(path.join(plugin, "plugin.json"), JSON.stringify({ name: "x", version: "9.9.9" }));
    const provenance = await skillProvenance({ router: { name: SKILLS.router, dir: path.join(plugin, "skills", SKILLS.router), source: "plugin" }, foundry: { name: SKILLS.foundry, dir: null, source: "skill-tool" } });
    assert.deepEqual(provenance[SKILLS.foundry], { source: "skill-tool", kind: "other", path: null, version: null, files: {} });
    const router = provenance[SKILLS.router];
    assert.equal(router.kind, "plugin");
    assert.equal(router.version, "9.9.9");
    assert.deepEqual(Object.keys(router.files), ["SKILL.md", "references/sdd.md", "references/specify.md", "references/implement.md", "references/verify.md", "references/deploy.md"]);
    assert.equal(router.files["SKILL.md"], sha("# Router\n"));
    assert.deepEqual(skillDrift(provenance, provenance), []);

    const override = path.join(cwd, ".github", "skills", SKILLS.router);
    await routerSkill(override);
    const run = harness({ cwd, home, args: { brief: BRIEF } });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-spec-v1" });
    let record = await run.record();
    assert.equal(record.skillProvenance[SKILLS.router].kind, "project-override");
    assert.equal(record.skillProvenance[SKILLS.router].path, override);
    assert.deepEqual(record.skillDrift, []);
    await writeFile(path.join(override, "references", "verify.md"), "# changed\n");
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.equal(logMatches(run.state, /^Skill drift since this run started: foundry-agentic-loop\/references\/verify\.md sha256 /).length, 1);
    record = await run.record();
    assert.equal(record.skillDrift.length, 1);
    assert.equal(record.skillDrift[0].file, "references/verify.md");
    assert.equal(record.skillProvenance[SKILLS.router].files["references/verify.md"], sha("# verify.md\n"), "the original provenance is kept");
});

// 12: a single-phase rerun inherits earlier phases only from a record that passed them.
test("from reruns a phase only when the latest flight record passed every earlier phase", async t => {
    assert.throws(() => validateArgs({ brief: BRIEF, from: "verify" }), /args.from must be one of Specify, Implement, Verify, Deploy/);
    assert.throws(() => validateArgs({ brief: BRIEF, from: "Deploy", skipDeploy: true }), /cannot be Deploy when skipDeploy/);

    const { cwd, home } = await workspace(t);
    const none = await harness({ cwd, home, runId: "run-0", args: { ...AUTO, from: "Verify" } }).attempt();
    assert.equal(none.status, "error");
    assert.match(none.error.message, /^Cannot start at Verify: this workspace has no earlier Agentic Loop flight record/);

    const first = harness({ cwd, home, runId: "run-1", args: { ...AUTO, skipDeploy: true }, responder: who => (who === "Implement · review" ? failed(who) : defaultResponder(who)) });
    assert.deepEqual(await first.attempt(), { status: "paused", key: "blocked-implement-r1" });
    const refused = await harness({ cwd, home, runId: "run-2", args: { ...AUTO, from: "Verify" } }).attempt();
    assert.equal(refused.status, "error");
    assert.match(refused.error.message, /^Cannot start at Verify: the latest run, run-1, has no passed Implement gate\./);
    assert.equal(await exists(path.join(cwd, ...recordFile("run-2").split("/"))), false, "a refused rerun writes no record");

    assert.equal((await first.attempt()).status, "completed");
    const rerun = harness({ cwd, home, runId: "run-3", clockStart: 100, args: { ...AUTO, from: "Verify", skipDeploy: true } });
    const outcome = await rerun.attempt();
    assert.equal(outcome.status, "completed");
    assert.deepEqual(rerun.state.phases, ["Verify"]);
    assert.deepEqual(labels(rerun.state), ["Verify · lead", "Verify · review"]);
    assert.deepEqual(outcome.result.phases, { Specify: "passed", Implement: "passed", Verify: "passed", Deploy: "skipped" });
    assert.match(logMatches(rerun.state, /^Implement gate: passed — Inherited from run run-1/)[0], /Implement · review · r2 done/);
    const record = await rerun.record();
    assert.deepEqual(record.rerun, { from: "Verify", runId: "run-1" });
    assert.deepEqual(record.phases.slice(0, 2).map(row => [row.phase, row.round, row.status, row.inheritedFrom]), [["Specify", 0, "passed", "run-1"], ["Implement", 0, "passed", "run-1"]]);
    assert.deepEqual(record.phases[1].inputs, { ".azure/deployment-plan.md": sha("# Plan\n"), "docs/spec.md": sha("# Spec\n") }, "an inherited gate keeps the spec and plan it passed on");

    // A requirement added after Implement and Verify passed is not covered by their gates, so they are not inherited.
    await writeFile(path.join(cwd, "docs", "spec.md"), "# Spec\n- New requirement\n");
    for (const [runId, from] of [["run-4", "Deploy"], ["run-5", "Verify"]]) {
        const stale = await harness({ cwd, home, runId, clockStart: 200, args: { ...AUTO, from } }).attempt();
        assert.equal(stale.status, "error");
        assert.equal(stale.error.message, `Cannot start at ${from}: the Implement gate of run run-3 no longer covers the current spec and plan (docs/spec.md). Start at Implement instead, or run the full loop.`);
        assert.equal(await exists(path.join(cwd, ...recordFile(runId).split("/"))), false);
    }
    const implement = harness({ cwd, home, runId: "run-6", clockStart: 300, args: { ...AUTO, from: "Implement", skipDeploy: true } });
    assert.equal((await implement.attempt()).status, "completed", "Implement reruns on the changed spec");
    assert.deepEqual(await harness({ cwd, home, runId: "run-7", clockStart: 400, args: { ...AUTO, from: "Deploy" } }).attempt(), { status: "paused", key: "approve-deploy-v1" }, "the new Implement and Verify gates cover the changed spec, so Deploy starts");

    const legacy = { runId: "old", phases: ["Specify", "Implement"].map(phase => ({ phase, status: "passed", summary: "ok", at: "t" })) };
    assert.throws(() => rerunPlan({ record: legacy, file: "f" }, "Verify", { files: {} }), /the Implement gate of run old no longer covers the current spec and plan \(the spec and plan it passed on were not recorded\)/);
});

test("from refuses to rerun when there are too many flight records to find the latest one", async t => {
    const { cwd, home } = await workspace(t);
    const runs = path.join(cwd, ".agentic-loop", "runs");
    await mkdir(runs, { recursive: true });
    for (let i = 500; i <= 1000; i++) await writeFile(path.join(runs, `wr_${i}.json`), "{}");
    const refused = await harness({ cwd, home, runId: "run-1", args: { ...AUTO, from: "Deploy" } }).attempt();
    assert.equal(refused.status, "error");
    assert.match(refused.error.message, /holds 501 flight records, more than the 500 a rerun checks/);
    assert.equal(await exists(path.join(cwd, ...recordFile("run-1").split("/"))), false, "a refused rerun writes no record");
});

test("from refuses to rerun when a flight record cannot be inspected safely", async t => {
    const { cwd, home } = await workspace(t);
    const first = harness({ cwd, home, runId: "run-1", args: { ...AUTO, skipDeploy: true } });
    assert.equal((await first.attempt()).status, "completed");
    const newer = path.join(cwd, ".agentic-loop", "runs", "run-2.json");
    for (const [content, reason] of [["x".repeat(2 * 1024 * 1024 + 1), /run-2\.json is larger than 2 MiB/], ["{\"workflow\":", /run-2\.json is not valid JSON/]]) {
        await writeFile(newer, content);
        const refused = await harness({ cwd, home, runId: "run-3", args: { ...AUTO, from: "Deploy" } }).attempt();
        assert.equal(refused.status, "error");
        assert.match(refused.error.message, reason);
    }
});

test("from and to run a single phase, and to ends the run early without the spec approval", async t => {
    assert.throws(() => validateArgs({ brief: BRIEF, to: "verify" }), /args.to must be one of Specify, Implement, Verify, Deploy/);
    assert.throws(() => validateArgs({ brief: BRIEF, to: "Deploy", skipDeploy: true }), /args.to cannot be Deploy when skipDeploy/);
    assert.throws(() => validateArgs({ brief: BRIEF, from: "Verify", to: "Implement" }), /args.to \(Implement\) cannot come before args.from \(Verify\)/);
    assert.equal(validateArgs({ brief: BRIEF, skipDeploy: true }).to, "Verify");

    const { cwd, home } = await workspace(t);
    const spec = harness({ cwd, home, runId: "run-1", args: { brief: BRIEF, to: "Specify" } });
    const specified = await spec.attempt();
    assert.equal(specified.status, "completed", "a gated run that ends at Specify does not pause for the spec approval");
    assert.deepEqual(spec.state.phases, ["Specify"]);
    assert.equal(specified.result.status, "specified");
    assert.deepEqual(specified.result.phases, { Specify: "passed", Implement: "skipped", Verify: "skipped", Deploy: "skipped" });
    assert.equal(logMatches(spec.state, /^Implement skipped: to is Specify, so the run ends after Specify\.$/).length, 1);
    assert.equal((await spec.record()).to, "Specify");

    const only = harness({ cwd, home, runId: "run-2", args: { ...AUTO, from: "Implement", to: "Implement" } });
    const implemented = await only.attempt();
    assert.equal(implemented.status, "completed");
    assert.deepEqual(only.state.phases, ["Implement"], "only the named phase runs");
    assert.ok(!labels(only.state).some(label => /^(Verify|Deploy)/.test(label)));
    assert.equal(implemented.result.status, "implemented");
    assert.deepEqual(implemented.result.phases, { Specify: "passed", Implement: "passed", Verify: "skipped", Deploy: "skipped" });
    assert.ok(!only.journal.pauses.has("approve-deploy-v1"), "Deploy approval is never asked when Deploy does not run");

    const gated = harness({ cwd, home, runId: "run-3", clockStart: 100, args: { brief: BRIEF, from: "Implement", to: "Implement" } });
    assert.deepEqual(await gated.attempt(), { status: "paused", key: "approve-spec-v1" }, "a gated rerun never provisions on a spec no human approved");
    assert.ok(!labels(gated.state).some(label => label.startsWith("Implement")), "Implement waits for the approval");
    assert.equal((await gated.attempt()).status, "completed");
    assert.ok((await gated.record()).checkpoints.some(row => row.key === "approve-spec-v1"));

    const verify = harness({ cwd, home, runId: "run-4", clockStart: 200, args: { brief: BRIEF, from: "Verify", to: "Verify" } });
    const verified = await verify.attempt();
    assert.equal(verified.status, "completed", verified.error?.message);
    assert.equal((await verify.record()).phases[0].specApproved, true, "the approval travels with the inherited spec");
    const again = harness({ cwd, home, runId: "run-5", clockStart: 300, args: { brief: BRIEF, from: "Implement", to: "Implement" } });
    assert.equal((await again.attempt()).status, "completed", "an approved spec is not asked again");
    assert.ok(!again.journal.pauses.has("approve-spec-v1"));

    await mkdir(path.join(cwd, "docs"), { recursive: true });
    await writeFile(path.join(cwd, "docs", "spec.md"), "# Spec v2: wider scope\n");
    const changed = harness({ cwd, home, runId: "run-6", clockStart: 400, args: { brief: BRIEF, from: "Implement", to: "Implement" } });
    assert.deepEqual(await changed.attempt(), { status: "paused", key: "approve-spec-v1" }, "a changed spec needs a fresh approval");
    assert.match(changed.state.logs.at(-1), /^Needs you: approve the spec\. Since the last spec approval, these changed: docs\/spec\.md\. Review/);
    assert.ok(!labels(changed.state).some(label => label.startsWith("Implement")), "nothing provisions on the changed spec");
    assert.equal((await changed.attempt()).status, "completed");
    assert.equal((await changed.record()).specApproval.files["docs/spec.md"], sha("# Spec v2: wider scope\n"));

    let blockedOnce = false;
    const responder = who => {
        if (who === "Implement · review" && !blockedOnce) {
            blockedOnce = true;
            return failed(who, "provisioning quota");
        }
        return defaultResponder(who);
    };
    const resumed = harness({ cwd, home, runId: "run-7", clockStart: 500, responder, args: { brief: BRIEF, from: "Implement", to: "Implement", maxFixLoops: 0 } });
    assert.deepEqual(await resumed.attempt(), { status: "paused", key: "blocked-implement-r1" }, "the inherited approval still matches, so round 1 runs");
    await writeFile(path.join(cwd, "docs", "spec.md"), "# Spec v3: during the pause\n");
    assert.deepEqual(await resumed.attempt(), { status: "paused", key: "approve-spec-r2-v1" }, "a resume re-checks the spec before more Implement work");
    assert.match(resumed.state.logs.at(-1), /^Needs you: approve the spec again\. Since you approved it, these changed: docs\/spec\.md\./);
    assert.ok(!labels(resumed.state).some(label => label.endsWith("· r2")), "round 2 waits for the approval");
    assert.equal((await resumed.attempt()).status, "completed");
    const record = await resumed.record();
    assert.equal(record.specApproval.key, "approve-spec-r2-v1");
    assert.equal(record.specApproval.files["docs/spec.md"], sha("# Spec v3: during the pause\n"));
});

// 13: ownership is checked against git after the workers, never trusted from their reports.
test("workstream ownership: overlapping claims are rejected and unowned changes go to integration", async t => {
    assert.match(planWorkstreams([{ name: "a", files: ["src/**"] }, { name: "b", files: ["src/api/x.py"] }]).reason, /both claim src/);
    assert.equal(owner("src/web/app/page.tsx", WORKSTREAMS), "web");
    assert.equal(owner("SRC/API/main.py", WORKSTREAMS), "api");
    assert.equal(owner("src/apiary/x.py", WORKSTREAMS), null);
    assert.equal(owner("README.md", WORKSTREAMS), null);
    assert.equal(ownershipCheck(null, null, WORKSTREAMS).checked, false);

    const { cwd, home } = await workspace(t);
    await git("git", ["init", "-q"], { cwd });
    await writeFile(path.join(cwd, "notes.txt"), "dirty before the fan-out\n");
    const write = async (file, text) => {
        await mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
        await writeFile(path.join(cwd, file), text);
    };
    const run = harness({
        cwd, home, args: { ...AUTO, skipDeploy: true },
        responder: async who => {
            if (who === "Implement · api") await write("src/api/main.py", "app = 1\n");
            if (who === "Implement · web") {
                await write("src/web/index.html", "<html></html>\n");
                await write("README.md", "# edited by a worker\n");
            }
            return defaultResponder(who);
        },
    });
    assert.equal((await run.attempt()).status, "completed");
    assert.ok(run.state.logs.includes("Workstream ownership: 1 changed path outside every workstream: README.md. Integration resolves them."));
    assert.match(promptOf(run, "Implement · integration"), /no workstream owns \(integration issues; nothing was reverted\)[^\n]*\n- README\.md$/m);
    const record = await run.record();
    assert.deepEqual(record.ownership.map(row => [row.phase, row.round, row.checked, row.unowned]), [["Implement", 1, true, ["README.md"]]]);
    assert.equal(await readFile(path.join(cwd, "README.md"), "utf8"), "# edited by a worker\n", "nothing is reverted");
});

test("workstream ownership is skipped gracefully outside a git repository", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { ...AUTO, skipDeploy: true } });
    assert.equal((await run.attempt()).status, "completed");
    assert.equal(logMatches(run.state, /^Workstream ownership not checked: git is not available or the workspace is not a repository\.$/).length, 1);
    assert.deepEqual((await run.record()).ownership.map(row => row.checked), [false]);
});

// 14: distinct run IDs never share a flight record.
test("runFile keeps safe IDs and hashes any other ID so distinct IDs never collide", () => {
    assert.equal(runFile("run-1"), "run-1.json");
    assert.equal(runFile("a".repeat(120)), `${"a".repeat(120)}.json`);
    const long = "a".repeat(121);
    assert.equal(runFile(long), `${"a".repeat(100)}-${sha(long).slice(0, 8)}.json`);
    const ids = ["a/b", "a:b", "a b", "a-b", "a_b", "../a", "é", "", "a\u0000b"];
    const files = ids.map(runFile);
    assert.equal(new Set(files).size, ids.length);
    assert.ok(files.every(file => /^[A-Za-z0-9._-]{1,120}\.json$/.test(file) && !file.startsWith("..json")));
    assert.equal(runFile("a/b"), `a-b-${sha("a/b").slice(0, 8)}.json`);
});

// 16: the entry point's wiring, without the runtime SDK.
test("createWorkflow defines the workflow with META and a run function bound to runLoop", async () => {
    const calls = [];
    const workflow = createWorkflow({ defineWorkflow: definition => (calls.push(definition), { defined: definition }), extensionDir });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].meta, META);
    assert.equal(typeof calls[0].run, "function");
    assert.equal(workflow.defined, calls[0]);
    await assert.rejects(calls[0].run({ args: {} }), /args.brief is required/);
});
