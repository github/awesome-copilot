import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { AGENTS, FALLBACK_SDD, appendSection, lockedMode } from "../lib/agents-md.mjs";
import { LESSONS, MAX_FIX_LOOPS, META, PHASES, WORKFLOW, validateArgs } from "../lib/args.mjs";
import { FOUNDATION_SCHEMA, REPORT_SCHEMA, TASKS, buildPrompt, label, retryPrompt } from "../lib/prompts.mjs";
import { SHARED_PHRASE, clean, normalize, planWorkstreams, recordFile, reduce, scope, writeRecord } from "../lib/record.mjs";
import { SKILLS, resolveSkills } from "../lib/skills.mjs";
import { MAX_ROUNDS, checkpointLines, gateLine, noteLine } from "../lib/loop.mjs";
import { BRIEF, WORKSTREAMS, defaultResponder, extensionDir, failed, harness, labels, logMatches, passed, workspace } from "./helpers.mjs";

// What the canvas (foundry-agentic-loop-canvas/lib/live.mjs) parses from the workflow's Chat lines and checkpoint keys;
// the canvas contract pin test checks these against the canvas parsers.
const CANVAS = {
    gate: /^(Specify|Implement|Verify|Deploy) gate: (passed|failed|blocked)(?: [—-] (.*))?$/,
    blocked: /^blocked-(specify|implement|verify|deploy)-r([1-9]\d{0,2})$/,
    brief: /^Brief: (.+)$/,
    approvals: ["approve-spec-v1", "approve-deploy-v1"],
    // A spec or plan changed after its approval: the canvas shows the matching approval again, with what changed.
    reapprovals: { "approve-spec-r2-v1": "Specify", "approve-deploy-r1-v1": "Deploy", "approve-deploy-r2-a3-v1": "Deploy" },
    record: "blocked-record-resume-approve-spec-v1",
};


test("gated run: phases in order, approvals, replay without duplicate work, flight record", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF, scenarioId: "insurance-claims-triage" } });

    let outcome = await run.attempt();
    assert.deepEqual(outcome, { status: "paused", key: "approve-spec-v1" });
    assert.deepEqual(run.state.phases, ["Specify"]);
    assert.deepEqual(labels(run.state), ["Specify · lead", "Specify · review"]);
    assert.match(run.state.logs[0], CANVAS.brief);
    assert.equal(CANVAS.brief.exec(run.state.logs[0])[1], "Claims triage assistant for insurance adjusters.", "the Brief line carries the first line of the brief");
    const specify = CANVAS.gate.exec(logMatches(run.state, CANVAS.gate)[0]);
    assert.deepEqual([specify[1], specify[2], specify[3]], ["Specify", "passed", "Specify · review done"]);
    let record = await run.record();
    assert.equal(record.status, "awaiting-approval");
    assert.equal(record.pending, "approve-spec-v1");
    assert.equal(record.scenarioId, "insurance-claims-triage");
    assert.ok(run.state.logs.includes("Specify · lead passed: Specify · lead done. Next: independent review."));
    assert.ok(run.state.logs.includes("Specify · review passed: Specify · review done"), "the gate line follows a passing review");
    assert.match(run.state.logs.at(-1), /^Needs you: approve the spec\. Review docs\/spec\.md and \.azure\/deployment-plan\.md, then choose "Approve spec and continue"/);

    outcome = await run.attempt();
    assert.deepEqual(outcome, { status: "paused", key: "approve-deploy-v1" });
    assert.deepEqual(run.state.phases, PHASES);
    assert.deepEqual(labels(run.state, "Specify"), ["Specify · lead", "Specify · review"], "Specify replays from the journal");
    assert.deepEqual(labels(run.state, "Implement").sort(), ["Implement · api", "Implement · foundation", "Implement · integration", "Implement · review", "Implement · web"]);
    assert.deepEqual(labels(run.state, "Verify"), ["Verify · lead", "Verify · review"]);
    assert.deepEqual(labels(run.state, "Deploy"), []);
    const foundation = run.state.calls.find(call => call.label === "Implement · foundation");
    assert.equal(foundation.schema, FOUNDATION_SCHEMA);
    const integration = run.state.calls.find(call => call.label === "Implement · integration");
    assert.ok(integration.prompt.includes("- api: passed. Implement · api done\n  Lessons:\n    - Implement · api lesson\n- web: passed."), "integration sees each workstream with its lessons");
    assert.match(integration.prompt, /Workstream results \(resolve every issue and upsert the worker lessons you verify in docs\/LOOP\.md\):/);
    assert.ok(run.state.logs.includes("Implement plan: 2 parallel workstreams (api, web)"));
    assert.ok(run.state.logs.includes("Spec approved. Continuing with Implement."));
    assert.ok(run.state.logs.includes("Implement · foundation passed: Implement · foundation done. Next: workstream plan."));
    assert.ok(run.state.logs.includes("Implement · api passed: Implement · api done"), "only the last worker names the next step");
    assert.ok(run.state.logs.includes("Implement · web passed: Implement · web done. Next: integration."));
    assert.ok(run.state.logs.includes("Implement · integration passed: Implement · integration done. Next: independent review."));
    assert.match(run.state.logs.at(-1), /^Needs you: approve deployment\. Review docs\/verify\.md and \.azure\/deployment-plan\.md/);

    outcome = await run.attempt();
    assert.equal(outcome.status, "completed");
    assert.deepEqual(outcome.result, {
        status: "deployed",
        runId: "run-1",
        phases: { Specify: "passed", Implement: "passed", Verify: "passed", Deploy: "passed" },
        rounds: { Specify: 1, Implement: 1, Verify: 1, Deploy: 1 },
        endpoints: [{ name: "web", url: "https://web.example.azurecontainerapps.io/" }],
        flightRecord: ".agentic-loop/runs/run-1.json",
    });
    assert.equal(logMatches(run.state, CANVAS.brief).length, 1, "the Brief line is logged once across attempts");
    assert.equal(logMatches(run.state, /^Specify · lead passed: /).length, 1, "replayed notes are not logged again");
    for (const line of [/^Needs you: approve the spec\./, /^Spec approved\./, /^Needs you: approve deployment\./, /^Deployment approved\. Running Deploy\.$/]) {
        assert.equal(logMatches(run.state, line).length, 1, `checkpoint line logged once across replays: ${line}`);
    }
    assert.deepEqual(logMatches(run.state, CANVAS.gate).map(line => CANVAS.gate.exec(line).slice(1, 3).join(":")),
        ["Specify:passed", "Implement:passed", "Verify:passed", "Deploy:passed"]);
    assert.ok(run.state.logs.at(-1).startsWith("Agentic Loop deployed. Endpoints: web https://web.example.azurecontainerapps.io/."));

    record = await run.record();
    assert.equal(record.workflow, WORKFLOW);
    assert.equal(record.status, "deployed");
    assert.equal(record.pending, null);
    assert.equal(record.brief, BRIEF);
    assert.deepEqual(record.checkpoints.map(row => row.key), ["approve-spec-v1", "approve-deploy-v1"]);
    assert.deepEqual(record.phases.map(row => `${row.phase}:${row.round}:${row.status}`), ["Specify:1:passed", "Implement:1:passed", "Verify:1:passed", "Deploy:1:passed"]);
    assert.ok(record.phases[1].lessons.includes("Implement · api lesson"));
    assert.deepEqual(record.skills, { "foundry-agentic-loop": "repository", "microsoft-foundry": "skill-tool" });
    assert.ok(record.completedAt);
});

test("auto autonomy skips the spec approval but always pauses before Deploy", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto" } });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.deepEqual(run.state.phases, PHASES);
    assert.ok(!run.journal.pauses.has("approve-spec-v1"));
    assert.equal((await run.attempt()).result.status, "deployed");
});

test("failed gate: bounded fix loop, blocked checkpoint, next round on resume", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto", maxFixLoops: 1 },
        responder: who => (who.startsWith("Verify · review") ? failed(who, "E2E test test_claim_upload fails with HTTP 500") : defaultResponder(who)),
    });

    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-verify-r1" });
    assert.match("blocked-verify-r1", CANVAS.blocked);
    assert.deepEqual(labels(run.state, "Verify"), ["Verify · lead", "Verify · review", "Verify · fix 1", "Verify · review 2"]);
    const fix = run.state.calls.find(call => call.label === "Verify · fix 1");
    assert.match(fix.prompt, /Gate issues to resolve \(fix 1 of 1\):\n- E2E test test_claim_upload fails with HTTP 500/);
    assert.match(fix.prompt, /without deploying the frontend or backend/, "Verify fixes never deploy the app before the deploy gate");
    const gate = CANVAS.gate.exec(logMatches(run.state, CANVAS.gate).at(-1));
    assert.deepEqual(gate.slice(1), ["Verify", "failed", "1 issue: E2E test test_claim_upload fails with HTTP 500 · Verify · review 2 failed"], "failed gates lead with their issues");
    const review = run.state.calls.find(call => call.label === "Verify · review").prompt;
    assert.doesNotMatch(review, /Re-review/, "the first review of round 1 checks from scratch");
    assert.match(review, /no frontend or backend revision created after the passed Implement gate \(its time is in the flight record\) runs a new image/, "Verify reviews check that nothing was deployed before the deploy gate");
    assert.ok(review.includes("Flight record (read-only): .agentic-loop/runs/run-1.json."), "every subagent knows where the flight record is");
    const recheck = run.state.calls.find(call => call.label === "Verify · review 2").prompt;
    assert.match(recheck, /Re-review after fix 1\. First confirm, with evidence, that each of these issues is resolved and that the changes broke nothing nearby; report any that persist as issues:\n- E2E test test_claim_upload fails with HTTP 500\nThen finish the remaining checks\./);
    assert.doesNotMatch(recheck, /Verify · fix 1 done/, "re-reviews never see the fixer's own report");
    assert.deepEqual(logMatches(run.state, /^Verify · /), [
        "Verify · lead passed: Verify · lead done. Next: independent review.",
        "Verify · review found 1 issue: E2E test test_claim_upload fails with HTTP 500. Next: automatic fix 1 of 1.",
        "Verify · fix 1 passed: Verify · fix 1 done. Next: review 2.",
        "Verify · review 2 found 1 issue: E2E test test_claim_upload fails with HTTP 500",
    ], "the last review names no automatic fix once fixes are exhausted");
    assert.equal(run.state.logs.at(-1), 'Needs you: Verify still fails its gate after 1 automatic fix (E2E test test_claim_upload fails with HTTP 500). Ask Copilot to fix it, or use "Fix in Chat" on the Build tab of the Foundry Agentic Loop canvas, then resume to retry Verify. To accept an issue instead, write it with your reason to .agentic-loop/waivers/run-1.json as [{"issue", "reason"}] before resuming.');
    let record = await run.record();
    assert.equal(record.status, "blocked");
    assert.equal(record.pending, "blocked-verify-r1");

    run.state.responder = defaultResponder;
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.equal(logMatches(run.state, /^Needs you: Verify still fails/).length, 1);
    assert.ok(run.state.logs.includes("Resumed: retrying Verify as round 2."));
    const lead = run.state.calls.find(call => call.label === "Verify · lead · r2");
    assert.ok(lead, "resume retries Verify as round 2");
    assert.match(lead.prompt, /Round 1 stopped at the Verify gate \(failed\): Verify · review 2 failed/);
    assert.match(lead.prompt, /a human may have resolved it/);
    assert.match(run.state.calls.find(call => call.label === "Verify · review · r2").prompt, /Re-review after the round 1 gate\.[^\n]*\n- E2E test test_claim_upload fails with HTTP 500\n/);
    record = await run.record();
    assert.deepEqual(record.phases.filter(row => row.phase === "Verify").map(row => `${row.round}:${row.status}`), ["1:failed", "2:passed"]);
    assert.deepEqual(record.checkpoints.map(row => row.key), ["blocked-verify-r1"]);
    assert.equal(record.status, "awaiting-approval");
});

test("blocked makers skip review and fixes; zero fix loops stop at the first failed review", async t => {
    const { cwd, home } = await workspace(t);
    const blocked = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => (who === "Specify · lead" ? { status: "blocked", summary: "Owner role needed", issues: ["Grant Foundry User on the Foundry account"], lessons: [] } : defaultResponder(who)),
    });
    assert.deepEqual(await blocked.attempt(), { status: "paused", key: "blocked-specify-r1" });
    assert.deepEqual(labels(blocked.state), ["Specify · lead"]);
    assert.equal(logMatches(blocked.state, CANVAS.gate).at(-1), "Specify gate: blocked — 1 issue: Grant Foundry User on the Foundry account · Owner role needed");
    assert.ok(blocked.state.logs.includes("Specify · lead blocked: Owner role needed"), "a blocked report names no next step");
    assert.match(blocked.state.logs.at(-1), /^Needs you: Specify is blocked \(Grant Foundry User on the Foundry account\)\. Ask Copilot to fix it, /);

    const strict = await workspace(t);
    const noFix = harness({
        ...strict, args: { brief: BRIEF, autonomy: "auto", maxFixLoops: 0 },
        responder: who => (who === "Specify · review" ? failed(who) : defaultResponder(who)),
    });
    assert.deepEqual(await noFix.attempt(), { status: "paused", key: "blocked-specify-r1" });
    assert.deepEqual(labels(noFix.state), ["Specify · lead", "Specify · review"]);

    const third = await workspace(t);
    const fixer = harness({
        ...third, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => {
            if (who === "Specify · review") return failed(who);
            if (who === "Specify · fix 1") return { status: "blocked", summary: "Quota needed", issues: ["Request 50K TPM of gpt-5-mini in eastus2"], lessons: [] };
            return defaultResponder(who);
        },
    });
    assert.deepEqual(await fixer.attempt(), { status: "paused", key: "blocked-specify-r1" });
    assert.deepEqual(labels(fixer.state), ["Specify · lead", "Specify · review", "Specify · fix 1"]);
    assert.match(logMatches(fixer.state, CANVAS.gate).at(-1), /^Specify gate: blocked — 1 issue: Request 50K TPM/);
});

test("fix loops re-review every passing fix and stop at maxFixLoops", async t => {
    const { cwd, home } = await workspace(t);
    let reviews = 0;
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto", maxFixLoops: 3 },
        responder: who => {
            if (who.startsWith("Specify · review")) return ++reviews < 3 ? failed(who) : passed(who);
            if (who.startsWith("Verify · review")) return failed(who);
            return defaultResponder(who);
        },
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-verify-r1" });
    assert.deepEqual(labels(run.state, "Specify"), ["Specify · lead", "Specify · review", "Specify · fix 1", "Specify · review 2", "Specify · fix 2", "Specify · review 3"]);
    assert.deepEqual(labels(run.state, "Verify"), ["Verify · lead", "Verify · review", "Verify · fix 1", "Verify · review 2", "Verify · fix 2", "Verify · review 3", "Verify · fix 3", "Verify · review 4"]);
    const [specify, , verify] = (await run.record()).phases;
    assert.equal(specify.status, "passed");
    assert.equal(specify.attempts.length, 6);
    assert.equal(verify.status, "failed");
    assert.deepEqual(verify.attempts.at(-1), { role: "review", label: "Verify · review 4", status: "failed", summary: "Verify · review 4 failed", issues: ["Verify · review 4 found a defect"] });
});

test("skipDeploy ends after Verify without a deploy approval", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto", skipDeploy: true } });
    const outcome = await run.attempt();
    assert.equal(outcome.status, "completed");
    assert.equal(outcome.result.status, "verified");
    assert.equal(outcome.result.phases.Deploy, "skipped");
    assert.deepEqual(run.state.phases, ["Specify", "Implement", "Verify"]);
    assert.ok(!run.journal.pauses.size);
    assert.ok(run.state.logs.includes("Deploy skipped: skipDeploy is set, so the run ends after Verify."));
    const record = await run.record();
    assert.equal(record.status, "verified");
    assert.equal(record.phases.at(-1).status, "skipped");
});

test("missing or malformed reports fail closed", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => (who.startsWith("Specify · lead") ? null : defaultResponder(who)),
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-specify-r1" });
    assert.deepEqual(labels(run.state), ["Specify · lead", "Specify · lead · retry"]);
    const [specify] = (await run.record()).phases;
    assert.equal(specify.status, "blocked");
    assert.deepEqual(specify.issues, ["Specify · lead ended twice without a report, likely a provider error: check the session log, then resume."]);
    assert.equal(specify.attempts[0].retried, true);
    assert.ok(checkpointLines("blocked-specify-r1", specify).wait.length < 400);

    const malformed = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto", maxFixLoops: 0 }, runId: "run-malformed",
        responder: who => (who === "Specify · lead" ? [] : defaultResponder(who)),
    });
    assert.deepEqual(await malformed.attempt(), { status: "paused", key: "blocked-specify-r1" });
    assert.deepEqual(labels(malformed.state), ["Specify · lead"]);
    const [failedSpec] = (await malformed.record()).phases;
    assert.equal(failedSpec.status, "failed");
    assert.match(failedSpec.issues[0], /Specify · lead returned no usable report/);
});

test("a subagent that ends without a report is retried once and continues from the current state", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF }, responder: who => (who === "Specify · lead" ? null : defaultResponder(who)) });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-spec-v1" });
    assert.deepEqual(labels(run.state), ["Specify · lead", "Specify · lead · retry", "Specify · review"]);
    const [first, retry] = run.state.calls;
    assert.equal(retry.prompt, retryPrompt(first.prompt, "Specify · lead"));
    assert.ok(retry.prompt.startsWith(`${first.prompt}\n\n`));
    assert.match(retry.prompt, /\n\nRetry: the previous attempt \(Specify · lead\) ended without a report[^\n]*$/, "the retry adds one line");
    assert.match(first.prompt, /check the current state and continue from it instead of starting over/, "every attempt continues from the current state");
    assert.equal(retry.schema, REPORT_SCHEMA);
    const notices = logMatches(run.state, /^Specify · lead ended without a report/);
    assert.deepEqual(notices, ["Specify · lead ended without a report, often after a provider error. Retrying it once."]);
    assert.ok(!CANVAS.gate.test(notices[0]) && !CANVAS.brief.test(notices[0]));
    const [specify] = (await run.record()).phases;
    assert.equal(specify.status, "passed");
    assert.deepEqual(specify.attempts[0], { role: "lead", label: "Specify · lead", status: "passed", summary: "Specify · lead · retry done", issues: [], retried: true });
    assert.equal(specify.attempts[1].retried, undefined);

    run.state.responder = defaultResponder;
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.equal(labels(run.state, "Specify").length, 3);
    assert.equal(logMatches(run.state, /ended without a report/).length, 1);
});

test("a resume after provider errors replays every report and starts the next round", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => (who.startsWith("Implement") ? null : defaultResponder(who)),
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-implement-r1" });
    assert.deepEqual(labels(run.state, "Implement"), ["Implement · foundation", "Implement · foundation · retry"]);
    const [, implement] = (await run.record()).phases;
    assert.equal(implement.status, "blocked");
    assert.deepEqual(implement.attempts.map(row => [row.label, row.status, row.retried]), [["Implement · foundation", "blocked", true]]);
    assert.ok(run.state.logs.includes("Implement · foundation blocked: No report after one retry, likely a provider error."));

    run.state.responder = defaultResponder;
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.deepEqual(run.state.calls.filter(call => call.attempt === 2).map(call => call.label), ["Implement · lead · r2", "Implement · review · r2", "Verify · lead", "Verify · review"]);
    assert.equal(logMatches(run.state, /^Resumed: retrying Implement as round 2\.$/).length, 1);
    const lead = run.state.calls.find(call => call.label === "Implement · lead · r2");
    assert.match(lead.prompt, /Round 1 stopped at the Implement gate \(blocked\)/);
    assert.equal((await run.record()).phases[2].status, "passed");
});

test("Implement falls back to one sequential build when workstreams overlap", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => (who === "Implement · foundation"
            ? passed(who, { workstreams: [{ name: "api", goal: "API", files: ["src"] }, { name: "web", goal: "Web", files: ["src/web"] }] })
            : defaultResponder(who)),
    });
    await run.attempt();
    assert.deepEqual(labels(run.state, "Implement"), ["Implement · foundation", "Implement · build", "Implement · review"]);
    assert.ok(run.state.logs.includes('Implement plan: sequential build (workstreams "api" and "web" both claim src/web)'));
});

test("a failed worker is handed to integration instead of stopping the round", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => {
            if (who === "Implement · web") throw new Error("subagent crashed");
            return defaultResponder(who);
        },
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    const integration = run.state.calls.find(call => call.label === "Implement · integration");
    assert.match(integration.prompt, /- web: failed\. Implement · web returned no report\./);
});

test("a worker with no report after its retry is handed to integration as failed", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => (who.startsWith("Implement · web") ? null : defaultResponder(who)),
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.deepEqual(labels(run.state, "Implement · web"), ["Implement · web", "Implement · web · retry"]);
    const integration = run.state.calls.find(call => call.label === "Implement · integration");
    assert.match(integration.prompt, /- web: failed\. No report after one retry, likely a provider error\./);
    assert.match(integration.prompt, /Implement · web ended twice without a report, likely a provider error: finish this workstream from the current workspace\./);
    const [, implement] = (await run.record()).phases;
    assert.equal(implement.status, "passed");
    const web = implement.attempts.find(row => row.label === "Implement · web");
    assert.deepEqual([web.status, web.retried], ["failed", true]);
});

test("Implement round 2 resumes with one lead instead of re-planning", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto", maxFixLoops: 0 },
        responder: who => (who === "Implement · review" ? failed(who, "Hosted checkpoint returns 403") : defaultResponder(who)),
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: "blocked-implement-r1" });
    run.state.responder = defaultResponder;
    await run.attempt();
    const round2 = labels(run.state, "Implement").filter(name => name.endsWith("· r2"));
    assert.deepEqual(round2, ["Implement · lead · r2", "Implement · review · r2"]);
    const lead = run.state.calls.find(call => call.label === "Implement · lead · r2");
    assert.ok(lead.prompt.includes(TASKS.Implement.lead));
    assert.match(lead.prompt, /- Hosted checkpoint returns 403/);
});

test("genuine failures are recorded and rethrown; invalid input stops before any work", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => {
            if (who === "Specify · review") throw Object.assign(new Error("connection reset by peer"), { name: "ConnectionError" });
            return defaultResponder(who);
        },
    });
    const outcome = await run.attempt();
    assert.equal(outcome.status, "error");
    assert.equal(outcome.error.name, "ConnectionError");
    const record = await run.record();
    assert.equal(record.status, "error");
    assert.equal(record.error, "connection reset by peer");

    const noCwd = harness({ cwd: "", home, args: { brief: BRIEF }, runId: "run-nocwd" });
    const missing = await noCwd.attempt();
    assert.equal(missing.status, "error");
    assert.match(missing.error.message, /no working directory/);
    assert.equal(noCwd.state.calls.length, 0);

    const invalid = harness({ cwd, home, args: { brief: "too short" }, runId: "run-invalid" });
    const rejected = await invalid.attempt();
    assert.equal(rejected.status, "error");
    assert.match(rejected.error.message, /args\.brief is required/);
    assert.equal(invalid.journal.steps.size, 0);
});

test("a resume after a genuine failure marks the flight record running at its first live step", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: who => {
            if (who === "Specify · review") throw Object.assign(new Error("connection reset by peer"), { name: "ConnectionError" });
            return defaultResponder(who);
        },
    });
    assert.equal((await run.attempt()).status, "error");
    assert.equal((await run.record()).status, "error");

    let first = null;
    run.state.responder = async who => {
        first ??= { who, record: await run.record() };
        return defaultResponder(who);
    };
    assert.deepEqual(await run.attempt(), { status: "paused", key: "approve-deploy-v1" });
    assert.equal(first.who, "Specify · review", "the completed lead report replays");
    assert.deepEqual([first.record.status, first.record.error], ["running", null], "the record is rewritten before the first live subagent starts");
});

test("cancellation outside a checkpoint leaves the flight record as it was", async t => {
    const { cwd, home } = await workspace(t);
    const file = path.join(cwd, ...recordFile("run-1").split("/"));
    let before = null;
    const run = harness({
        cwd, home, args: { brief: BRIEF, autonomy: "auto" },
        responder: async who => {
            if (who !== "Specify · review") return defaultResponder(who);
            before = await readFile(file, "utf8");
            throw new DOMException("The operation was aborted", "AbortError");
        },
    });
    assert.deepEqual(await run.attempt(), { status: "paused", key: null });
    assert.equal(await readFile(file, "utf8"), before);
    assert.equal(JSON.parse(before).status, "running");
});

test("a failed flight record write leaves no temporary file", async t => {
    const { cwd } = await workspace(t);
    const file = path.join(cwd, ...recordFile("run-x").split("/"));
    await mkdir(file, { recursive: true });
    await assert.rejects(writeRecord(cwd, { runId: "run-x" }));
    assert.deepEqual(await readdir(path.dirname(file)), ["run-x.json"]);
});

test("skills missing on disk are logged and loaded through the skill tool", async t => {
    const { cwd, home } = await workspace(t);
    const run = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto", skipDeploy: true }, dir: path.join(cwd, "x", "y", "z") });
    assert.equal((await run.attempt()).status, "completed");
    const [absent] = logMatches(run.state, /^Skills not found on disk, so subagents load them with the skill tool: /);
    assert.deepEqual(absent.split(": ").at(-1).split(", ").sort(), ["foundry-agentic-loop", "microsoft-foundry"]);
    assert.ok(run.state.calls.every(call => call.prompt.includes("(load it with the skill tool)")));
    assert.equal((await run.record()).skills["foundry-agentic-loop"], "skill-tool");
    assert.equal(await readFile(path.join(cwd, AGENTS), "utf8"), `${FALLBACK_SDD}\n`, "without the skill on disk the minimal SDD section is written");
});

const SKILL_ASSETS = path.resolve(extensionDir, "..", "..", "skills", "foundry-agentic-loop", "assets");

test("the skill names the same shared files as the workflow", async () => {
    const skillDir = path.dirname(SKILL_ASSETS);
    for (const file of ["SKILL.md", path.join("references", "implement.md")]) {
        const text = (await readFile(path.join(skillDir, file), "utf8")).replaceAll("`", "");
        assert.ok(text.includes(SHARED_PHRASE), `${file} lists the shared files as: ${SHARED_PHRASE}`);
    }
});

test("a run adds the SDD section to AGENTS.md once and keeps the rest of the file", async t => {
    const { cwd, home } = await workspace(t);
    const file = path.join(cwd, AGENTS);
    await writeFile(file, "# Team conventions\n\nUse tabs.\n\n\n", "utf8");
    const first = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto", skipDeploy: true } });
    assert.equal((await first.attempt()).status, "completed");
    const section = (await readFile(path.join(SKILL_ASSETS, "agents-md-sdd.md"), "utf8")).trim();
    const written = await readFile(file, "utf8");
    assert.equal(written, `# Team conventions\n\nUse tabs.\n\n${section}\n`);
    assert.equal(lockedMode(written), "sdd");
    assert.equal(logMatches(first.state, /^AGENTS\.md: added the Agentic Loop SDD section/).length, 1);

    const second = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto", skipDeploy: true }, runId: "run-2" });
    assert.equal((await second.attempt()).status, "completed");
    assert.equal(await readFile(file, "utf8"), written, "an existing SDD section is kept as is");
    assert.equal(logMatches(second.state, /^AGENTS\.md:/).length, 0);
});

test("a workspace that AGENTS.md locks to rapid prototyping refuses to start", async t => {
    const { cwd, home } = await workspace(t);
    const file = path.join(cwd, AGENTS);
    const rapid = `# Notes\n\n${await readFile(path.join(SKILL_ASSETS, "agents-md-rapid.md"), "utf8")}`;
    await writeFile(file, rapid, "utf8");
    const run = harness({ cwd, home, args: { brief: BRIEF, autonomy: "auto" } });
    const result = await run.attempt();
    assert.equal(result.status, "error");
    assert.match(result.error.message, /^AGENTS\.md locks this workspace to rapid prototyping\. To switch, ask Copilot to convert the prototype to SDD/);
    assert.equal(run.state.calls.length, 0);
    await assert.rejects(run.record(), { code: "ENOENT" }, "no flight record is written");
    assert.equal(await readFile(file, "utf8"), rapid);
});

test("the AGENTS.md section templates, parser and writer agree", async () => {
    for (const mode of ["rapid", "sdd"]) {
        const text = await readFile(path.join(SKILL_ASSETS, `agents-md-${mode}.md`), "utf8");
        assert.equal(lockedMode(text), mode);
        assert.equal(text.match(/foundry-agentic-loop:(begin|end)/g).join(), "foundry-agentic-loop:begin,foundry-agentic-loop:end");
        assert.match(text, /\| `deploy` \|/);
        assert.match(text, /Azure settings only in `\.azure\/deployment-plan\.md`, never here/);
        assert.doesNotMatch(text, /\/subscriptions\/|[0-9a-f]{8}-[0-9a-f]{4}-|https?:\/\//i, "templates carry no Azure values");
    }
    assert.equal(lockedMode(FALLBACK_SDD), "sdd");
    assert.equal(lockedMode("<!--foundry-agentic-loop:begin  mode=rapid-->"), "rapid");
    for (const text of [null, "", "# Repo instructions\n<!-- microsoft-foundry -->", "<!-- foundry-agentic-loop:begin mode=other -->"]) assert.equal(lockedMode(text), null);
    assert.equal(appendSection("", "S\n"), "S\n");
    assert.equal(appendSection("# A\r\nB\r\n\r\n", "<!-- s -->\nline\n"), "# A\r\nB\r\n\r\n<!-- s -->\r\nline\r\n", "CRLF files stay CRLF");
    const plan = planWorkstreams([{ name: "docs", files: ["AGENTS.md"] }, { name: "web", files: ["src/web"] }]);
    assert.equal(plan.mode, "single");
    assert.match(plan.reason, /shared path AGENTS\.md/);
});

test("validateArgs enforces the documented contract", () => {
    assert.deepEqual({ ...validateArgs({ brief: `  ${BRIEF}  ` }) }, {
        brief: BRIEF, subscriptionId: null, location: null, environmentName: null, scenarioId: null, autonomy: "gated", maxFixLoops: 2, skipDeploy: false, from: "Specify", to: "Deploy",
    });
    const full = validateArgs({ brief: BRIEF, subscriptionId: "0000AAAA-BBBB-4CCC-8DDD-EEEEFFFF0000", location: "eastus2", environmentName: "claims-dev", scenarioId: "insurance-claims-triage", autonomy: "auto", maxFixLoops: 5, skipDeploy: true });
    assert.equal(full.location, "eastus2");
    assert.equal(full.maxFixLoops, MAX_FIX_LOOPS);
    assert.ok(Object.isFrozen(full));
    assert.equal(validateArgs({ brief: BRIEF, location: "auto" }).location, null);
    for (const [bad, message] of [
        [null, /args must be an object/],
        [[], /args must be an object/],
        [{ brief: BRIEF, model: "gpt" }, /Unknown args: model\. Allowed:/],
        [{ brief: "short" }, /at least 20 characters/],
        [{ brief: "x".repeat(20_001) }, /at most 20,000/],
        [{ brief: BRIEF, location: "East US" }, /Azure region name/],
        [{ brief: BRIEF, subscriptionId: "not-a-guid" }, /subscription GUID/],
        [{ brief: BRIEF, environmentName: "1env" }, /2-20 letters/],
        [{ brief: BRIEF, environmentName: "a".repeat(21) }, /2-20 letters/],
        [{ brief: BRIEF, scenarioId: "../etc" }, /canvas scenario ID/],
        [{ brief: BRIEF, autonomy: "yolo" }, /gated or auto/],
        [{ brief: BRIEF, maxFixLoops: 6 }, /0 to 5/],
        [{ brief: BRIEF, maxFixLoops: 1.5 }, /0 to 5/],
        [{ brief: BRIEF, skipDeploy: "yes" }, /boolean/],
    ]) assert.throws(() => validateArgs(bad), message);
});

test("every optional arg accepts null in the schema and in validation, where it means the default", () => {
    const defaults = validateArgs({ brief: BRIEF });
    const { properties, required } = META.argsSchema;
    for (const [key, schema] of Object.entries(properties)) {
        if (required.includes(key)) continue;
        assert.ok([schema.type].flat().includes("null"), `${key}: the schema type allows null`);
        if (schema.enum) {
            assert.ok(schema.enum.includes(null), `${key}: the schema enum allows null`);
            for (const value of schema.enum.filter(item => item !== null)) assert.equal(validateArgs({ brief: BRIEF, [key]: value })[key], value);
        }
        assert.equal(validateArgs({ brief: BRIEF, [key]: null })[key], defaults[key], `${key}: null means the default`);
    }
});

test("META and schemas stay inside the runtime's schema subset and match the canvas phases", () => {
    const allowed = new Set(["type", "required", "enum", "const", "properties", "items", "anyOf", "oneOf", "allOf"]);
    const walk = (schema, where) => {
        for (const [key, value] of Object.entries(schema)) {
            assert.ok(allowed.has(key), `${where}.${key} is outside the schema subset`);
            if (key === "properties") for (const [name, child] of Object.entries(value)) walk(child, `${where}.${name}`);
            if (key === "items") walk(value, `${where}[]`);
            if (["anyOf", "oneOf", "allOf"].includes(key)) value.forEach((child, index) => walk(child, `${where}.${key}[${index}]`));
        }
    };
    walk(META.argsSchema, "argsSchema");
    walk(REPORT_SCHEMA, "report");
    walk(FOUNDATION_SCHEMA, "foundation");
    assert.equal(META.name, WORKFLOW);
    assert.deepEqual(META.phases.map(phase => phase.title), [...PHASES]);
    assert.deepEqual(Object.keys(META.argsSchema.properties).sort(), ["autonomy", "brief", "environmentName", "from", "location", "maxFixLoops", "scenarioId", "skipDeploy", "subscriptionId", "to"]);
    for (const phase of PHASES) for (const role of ["review", "fix"]) assert.ok(TASKS[phase][role], `${phase} ${role} task`);
});

test("planWorkstreams accepts disjoint ownership and rejects unsafe plans", () => {
    const ok = planWorkstreams([
        { name: "api", goal: "API", files: ["./src/api/", "src\\api\\models.py"], checks: ["pytest"] },
        { name: "review", goal: "Review UI", files: ["src/web/**/*.tsx"] },
        { name: "agents", goal: "", files: ["src/agents"] },
    ]);
    assert.equal(ok.mode, "parallel");
    assert.deepEqual(ok.items.map(item => item.name), ["api", "ws review", "agents"]);
    assert.equal(ok.items[2].goal, "Build agents.");
    const reasons = [
        [[], /no workstreams/],
        [[{ name: "a", goal: "g", files: ["src/a"] }], /one workstream/],
        [Array.from({ length: 5 }, (_, index) => ({ name: `w${index}`, goal: "g", files: [`src/w${index}`] })), /exceed the limit of four/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["infra/app.bicep"] }], /shared path infra/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["docs"] }], /shared path docs/],
        [[{ name: "a", goal: "g", files: ["src/a/**"] }, { name: "b", goal: "g", files: ["src/a/b.py"] }], /both claim src\/a\/b\.py/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["**/*.py"] }], /whole workspace/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["../outside"] }], /outside it/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["/src/b"] }], /an absolute path/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["C:\\src\\b"] }], /an absolute path/],
        [[{ name: "api", goal: "g", files: ["src/API"] }, { name: "b", goal: "g", files: ["src/api/x.py"] }], /both claim src\/api\/x\.py/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["Infra/main.bicep"] }], /shared path Infra\/main\.bicep/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: ["package-lock.json"] }], /shared path package-lock\.json/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "A", goal: "g", files: ["src/b"] }], /duplicate workstream/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: "b", goal: "g", files: [] }], /owns no files/],
        [[{ name: "a", goal: "g", files: ["src/a"] }, { name: " ", goal: "g", files: ["src/b"] }], /has no name/],
    ];
    for (const [list, reason] of reasons) {
        const plan = planWorkstreams(list);
        assert.equal(plan.mode, "single");
        assert.match(plan.reason, reason);
    }
    assert.equal(scope("src/api/**/x.py"), "src/api");
    assert.equal(scope("./a/./b/"), "a/b");
    for (const absolute of ["/abs", "C:/x", "c:\\x", "\\\\server\\share"]) assert.equal(scope(absolute), null, absolute);
    const lockfiles = planWorkstreams([{ name: "web", files: ["src/web", "src/web/package-lock.json"] }, { name: "api", files: ["src/api", "src/api/uv.lock"] }]);
    assert.equal(lockfiles.mode, "parallel", "workers may own the lockfiles inside their folders");
    for (const shared of ["azure.yaml", "infra/", "docs/", ".env", ".azure/", ".agentic-loop/", "AGENTS.md"]) assert.ok(SHARED_PHRASE.includes(shared), `the shared-file phrase names ${shared}`);
});

test("normalize bounds untrusted reports", () => {
    const report = normalize({
        status: "passed",
        summary: "line one\nline\u0007two",
        issues: ["a", "a", " ", 7],
        lessons: Array.from({ length: 30 }, (_, index) => `lesson ${index}`),
        endpoints: [
            { name: "web", url: "https://app.example.com" },
            { name: "dup", url: "https://app.example.com/" },
            { name: "creds", url: "https://user:secret@example.com" },
            { name: "js", url: "javascript:alert(1)" },
            { url: "http://localhost:8000/health" },
        ],
    }, "Deploy · review");
    assert.equal(report.status, "failed", "a pass that still lists issues counts as failed");
    assert.equal(report.summary, "Reported passed with 2 open issues, so it counts as failed: line one line two");
    assert.deepEqual(report.issues, ["a", "7"]);
    assert.equal(report.lessons.length, 20);
    assert.deepEqual(report.endpoints, [{ name: "web", url: "https://app.example.com/" }, { name: "localhost:8000", url: "http://localhost:8000/health" }]);
    assert.equal(normalize({ status: "done", summary: "" }, "X").status, "failed");
    assert.deepEqual(normalize({ status: "failed", summary: "bad" }, "X").issues, ["X reported failed without listing issues; re-check the gate and record the evidence."]);
    assert.equal(normalize([], "X").status, "failed");
    assert.equal(clean("x".repeat(400), 300).length, 300);
});

test("gate lines are single-line, bounded and parse as canvas gates", () => {
    const line = gateLine({ phase: "Deploy", status: "failed", summary: "Health check failed", issues: ["x".repeat(500), "second"] });
    assert.ok(line.length <= 300);
    assert.match(line, CANVAS.gate);
    const pass = CANVAS.gate.exec(gateLine({ phase: "Verify", status: "passed", summary: "All checks passed", issues: ["note"] }));
    assert.deepEqual(pass.slice(1), ["Verify", "passed", "All checks passed"], "a passed gate shows only its summary");
    const fail = CANVAS.gate.exec(gateLine({ phase: "Specify", status: "failed", summary: "Placement passes", issues: ["a", "b"] }));
    assert.deepEqual(fail.slice(1, 3), ["Specify", "failed"]);
    assert.ok(fail[3].startsWith("2 issues: a") && fail[3].includes("Placement passes"), "failed gates lead with their issue count and first issue");
    assert.match(`blocked-deploy-r${MAX_ROUNDS}`, CANVAS.blocked);
});

test("note and checkpoint lines stay bounded, keep their next step and never parse as gates", () => {
    const long = { role: "lead", who: "Deploy · lead", report: { status: "passed", summary: "y".repeat(500), issues: [] } };
    const note = noteLine(long, "Next: independent review.");
    assert.ok(note.length <= 300);
    assert.match(note, /y… Next: independent review\.$/);
    const fixNote = noteLine({ role: "fix", who: "Verify · fix 1", report: { status: "failed", summary: "Still 500", issues: ["a"] } });
    assert.match(fixNote, /^Verify · fix 1 failed: Still 500/);
    assert.doesNotMatch(fixNote, /Next:/, "a note without a next step names none");
    const reviewNote = noteLine({ role: "review", who: "Specify · review", report: { status: "failed", summary: "4 defects", issues: ["a", "b", "c", "d"] } }, "Next: automatic fix 1 of 2.");
    assert.match(reviewNote, /^Specify · review found 4 issues: a\b/, "a failed review leads with its issue count and first issue");
    assert.ok(reviewNote.endsWith(" Next: automatic fix 1 of 2."));
    const blocked = checkpointLines("blocked-implement-r2", { phase: "Implement", round: 2, status: "failed", issues: ["z".repeat(500), "second"], fixes: 2 });
    assert.ok(blocked.wait.length <= 400);
    assert.match(blocked.wait, /^Needs you: Implement still fails its gate after 2 automatic fixes \(2 issues; first: z+…\)\. Ask Copilot to fix them, /);
    assert.equal(checkpointLines("blocked-verify-r1", { phase: "Verify", round: 1, status: "failed", issues: ["a"] }).wait.split(". ")[0], "Needs you: Verify still fails its gate (a)", "zero fix loops name no automatic fixes");
    assert.equal(blocked.resume, "Resumed: retrying Implement as round 3.");
    for (const key of CANVAS.approvals) assert.match(checkpointLines(key).wait, /^Needs you: approve /);
    for (const line of [note, blocked.wait, blocked.resume, ...CANVAS.approvals.flatMap(key => Object.values(checkpointLines(key)))]) {
        assert.doesNotMatch(line, CANVAS.gate);
        assert.doesNotMatch(line, CANVAS.brief);
    }
});

test("prompts are deterministic, scoped and fall back to the skill tool", async t => {
    const { cwd, home } = await workspace(t);
    const skills = await resolveSkills({ cwd, extensionDir, home });
    const args = validateArgs({ brief: BRIEF, subscriptionId: "0000aaaa-bbbb-4ccc-8ddd-eeeeffff0000", location: "eastus2", scenarioId: "insurance-claims-triage" });
    const base = { runId: "run-1", cwd, record: recordFile("run-1"), skills, args };
    const specify = buildPrompt({ base, phase: "Specify", round: 1, role: "lead", who: label("Specify", "lead", 1), task: TASKS.Specify.lead });
    assert.equal(specify, buildPrompt({ base, phase: "Specify", round: 1, role: "lead", who: label("Specify", "lead", 1), task: TASKS.Specify.lead }));
    assert.ok(specify.includes(`<brief>\n${BRIEF}\n</brief>`));
    assert.ok(specify.includes("Canvas scenario: insurance-claims-triage."));
    assert.ok(specify.includes("pass --subscription to az commands"));
    assert.ok(specify.includes(`Follow ${path.join(skills.router.dir, "references", "specify.md")} with the defaults in ${path.join(skills.router.dir, "SKILL.md")}`));
    assert.ok(!specify.includes(path.join(skills.router.dir, "references", "verify.md")), "each phase reads only its own guide");
    assert.ok(specify.includes(path.join(skills.router.dir, "references", "sdd.md")));
    assert.ok(specify.includes("For Foundry platform operations use SKILL.md of the microsoft-foundry skill (load it with the skill tool)."));
    assert.match(specify, /never search other projects on this machine/);
    assert.match(specify, /Delete only Azure resources this run created whose provisioning failed/);
    assert.match(specify, /never fixed sleeps/);
    assert.doesNotMatch(specify, /quick-start-hosted/, "only Implement creates hosted agents");
    const verify = buildPrompt({ base, phase: "Verify", round: 2, role: "review", who: label("Verify", "review", 2), task: TASKS.Verify.review });
    assert.ok(!verify.includes(BRIEF), "only Specify sees the brief; later phases read the spec");
    assert.match(verify, /independent reviewer \(Verify · review · r2\)/);
    assert.match(verify, /earlier reports are claims, not evidence/);
    assert.match(verify, /Finish every check before you report/);
    assert.doesNotMatch(verify, /Re-review/, "a review without recheck issues starts from scratch");
    const worker = buildPrompt({ base, phase: "Implement", round: 1, role: "worker", who: "Implement · api", task: TASKS.Implement.worker, workstream: { name: "api", goal: "API", files: ["src/api"], checks: [] } });
    assert.match(worker, /You own: src\/api/);
    assert.match(worker, /Edit only the files you own/);
    assert.ok(worker.includes(`Never edit the shared files (${SHARED_PHRASE}) or lockfiles outside the folders you own`));
    assert.ok(buildPrompt({ base, phase: "Implement", round: 1, role: "lead", task: TASKS.Implement.foundation }).includes(`Shared files stay with the lead: ${SHARED_PHRASE}.`), "workers and the planner name the same shared files");
    assert.ok(worker.includes("Hosted agents start from foundry-agent/create/quick-start-hosted.md of the microsoft-foundry skill (load it with the skill tool)."));
    const foundry = { ...skills, foundry: { name: "microsoft-foundry", dir: path.join(home, ".agents", "skills", "microsoft-foundry"), source: "personal" } };
    assert.ok(buildPrompt({ base: { ...base, skills: foundry }, phase: "Implement", round: 1, role: "lead", task: TASKS.Implement.foundation }).includes(`Hosted agents start from ${path.join(home, ".agents", "skills", "microsoft-foundry", "foundry-agent", "create", "quick-start-hosted.md")}.`));
    const fallback = { ...skills, router: { name: "foundry-agentic-loop", dir: null, source: "skill-tool" } };
    assert.ok(buildPrompt({ base: { ...base, skills: fallback }, phase: "Verify", round: 1, role: "lead", task: TASKS.Verify.lead }).includes(`Follow ${path.join("references", "verify.md")} of the foundry-agentic-loop skill (load it with the skill tool)`));
});

test("skill resolution prefers complete project overrides, then the shipping plugin or repository", async t => {
    const { cwd, home } = await workspace(t);
    const override = path.join(cwd, ".github", "skills", SKILLS.router);
    await mkdir(path.join(override, "references"), { recursive: true });
    await writeFile(path.join(override, "SKILL.md"), "---\nname: foundry-agentic-loop\n---\n");
    const partial = await resolveSkills({ cwd, extensionDir, home });
    assert.equal(partial.router.source, "repository", "a copy without the SDD and phase guides never shadows a complete one");
    for (const file of ["sdd.md", "specify.md", "implement.md", "verify.md", "deploy.md"]) await writeFile(path.join(override, "references", file), "# Guide\n");
    const skills = await resolveSkills({ cwd, extensionDir, home });
    assert.deepEqual(skills.router, { name: "foundry-agentic-loop", dir: override, source: "project" });
    assert.equal(skills.foundry.source, "skill-tool");
    const elsewhere = path.join(cwd, "a", "b", "c");
    assert.equal((await resolveSkills({ cwd, extensionDir: elsewhere, home })).router.source, "project");
    await rm(override, { recursive: true });
    assert.equal((await resolveSkills({ cwd, extensionDir: elsewhere, home })).router.source, "skill-tool");
});

test("the flight record reducer folds events and rejects unknown ones", () => {
    const base = { phases: [], checkpoints: [], endpoints: [], status: "running", pending: null };
    const paused = reduce(base, { type: "pending", key: "approve-spec-v1", kind: "approve", at: "t1" });
    assert.equal(paused.status, "awaiting-approval");
    const resumed = reduce(paused, { type: "resumed", key: "approve-spec-v1", kind: "approve", pausedAt: "t1", at: "t2" });
    assert.deepEqual(resumed.checkpoints, [{ key: "approve-spec-v1", kind: "approve", pausedAt: "t1", resumedAt: "t2" }]);
    assert.equal(resumed.status, "running");
    assert.equal(paused.status, "awaiting-approval", "reduce is pure");
    assert.deepEqual(paused.checkpoints, []);
    assert.throws(() => reduce(base, { type: "nope", at: "t" }), /Unknown flight record event/);
    assert.equal(recordFile("run/../x y"), `.agentic-loop/runs/run-..-x-y-${createHash("sha256").update("run/../x y").digest("hex").slice(0, 8)}.json`);
});

test("canvas contract pin: foundry-agentic-loop-canvas reads what the workflow writes and accepts the same args", async t => {
    const dir = new URL("../../foundry-agentic-loop-canvas/lib/", import.meta.url);
    try { await stat(dir); }
    catch { t.skip("foundry-agentic-loop-canvas is not installed next to this extension"); return; }
    const live = await import(new URL("live.mjs", dir));
    const model = await import(new URL("model.mjs", dir));

    assert.equal(live.WORKFLOW, WORKFLOW);
    assert.deepEqual([...live.PHASES], [...PHASES]);
    assert.equal(live.LESSONS, LESSONS);
    assert.deepEqual(Object.keys(live.APPROVALS), CANVAS.approvals);
    for (const phase of PHASES) for (const file of live.ARTIFACTS[phase]) assert.ok(Object.values(TASKS[phase]).some(task => task.includes(file)), `the ${phase} tasks write ${file}, which the canvas opens`);
    for (const runId of ["run-1", "run/../x y", "Ünï ✓", "../../etc/passwd", "C:\\x", "a.b_c-D", 42]) assert.equal(live.flightRecordPath(runId), recordFile(runId), `flight record path of ${runId}`);

    // The canvas sends trimmed text field values; the workflow also trims, so both are compared on trimmed values.
    const workflowTarget = target => {
        try {
            const args = validateArgs({ brief: BRIEF, ...target });
            return { subscriptionId: args.subscriptionId, location: args.location ?? "auto", environmentName: args.environmentName ?? "" };
        } catch { return null; }
    };
    const canvasTarget = target => {
        try {
            const { subscriptionId, location, environmentName } = model.validTarget(target);
            return { subscriptionId, location, environmentName };
        } catch { return null; }
    };
    for (const [target, valid] of [
        [{}, true],
        [{ subscriptionId: null, location: null, environmentName: null }, true],
        [{ subscriptionId: "", location: "", environmentName: "" }, true],
        [{ subscriptionId: "0000aaaa-bbbb-4ccc-8ddd-eeeeffff0000", location: "eastus2", environmentName: "claims-dev" }, true],
        [{ subscriptionId: "0000AAAA-BBBB-4CCC-8DDD-EEEEFFFF0000" }, true],
        [{ subscriptionId: "not-a-guid" }, false],
        [{ subscriptionId: "0000aaaa-bbbb-4ccc-8ddd-eeeeffff00000" }, false],
        [{ location: "auto" }, true],
        [{ location: "East US" }, false],
        [{ location: "EASTUS" }, false],
        [{ location: "eu" }, false],
        [{ location: "2eastus" }, false],
        [{ environmentName: "a1" }, true],
        [{ environmentName: "a".repeat(20) }, true],
        [{ environmentName: "a" }, false],
        [{ environmentName: "1env" }, false],
        [{ environmentName: "a".repeat(21) }, false],
        [{ environmentName: "claims_dev" }, false],
    ]) {
        assert.equal(workflowTarget(target) !== null, valid, `workflow validity of ${JSON.stringify(target)}`);
        assert.deepEqual(canvasTarget(target), workflowTarget(target), `canvas and workflow agree on ${JSON.stringify(target)}`);
    }

    const templates = await Promise.all(["rapid", "sdd"].map(mode => readFile(path.join(SKILL_ASSETS, `agents-md-${mode}.md`), "utf8")));
    for (const text of [FALLBACK_SDD, appendSection("# A\r\n", FALLBACK_SDD), ...templates, null, "", "<!-- foundry-agentic-loop:begin mode=other -->", "<!-- foundry-agentic-loop:begin mode=SDD -->", "<!--foundry-agentic-loop:begin  mode=rapid-->"]) {
        assert.equal(live.parseLock(text), lockedMode(text), `AGENTS.md lock of ${JSON.stringify(text)?.slice(0, 80)}`);
    }
    for (const mode of model.MODES) assert.equal(lockedMode(`<!-- foundry-agentic-loop:begin mode=${mode} -->`), mode);

    for (const key of [...CANVAS.approvals, "blocked-verify-r1", ...PHASES.map(phase => `blocked-${phase.toLowerCase()}-r${MAX_ROUNDS}`), "blocked-verify-r0", "blocked-Verify-r1", "blocked-verify-r1000", "pause-v1"]) {
        assert.equal(live.checkpointInfo(key).kind === "blocked", CANVAS.blocked.test(key), `blocked checkpoint ${key}`);
    }
    const changes = ["docs/spec.md", "docs/verify.md (missing: add it, then approve again)", ".azure/deployment-plan.md (cannot be read: fix it, then approve again)"];
    for (const [key, phase] of Object.entries(CANVAS.reapprovals)) {
        const info = live.checkpointInfo(key);
        assert.deepEqual([info.kind, info.phase, info.again], ["approve", phase, true], `the canvas reads re-approval ${key}`);
        const { wait } = checkpointLines(key, { changes });
        assert.match(wait, /^Needs you: approve /);
        assert.deepEqual(live.needsOf([{ kind: "log", text: wait }]), { needs: wait, changes: changes.join(", ") }, `the canvas recovers what changed for ${key}`);
        assert.match(model.promptFor("changes", { runId: "run-1", checkpoint: key, text: "x" }), phase === "Specify" ? /docs\/spec\.md/ : /Do not deploy anything/);
    }
    assert.deepEqual(live.checkpointInfo(CANVAS.record), { key: CANVAS.record, kind: "record", phase: null, round: null });

    const { cwd, home } = await workspace(t);
    const run = harness({
        cwd, home, args: { brief: `\n  Claims\u0007triage ${"x".repeat(200)}\nUsers: adjusters.`, maxFixLoops: 0 },
        responder: who => (who === "Verify · review" ? failed(who, "E2E test fails") : defaultResponder(who)),
    });
    for (const [key, kind, phase, round] of [["approve-spec-v1", "approve", "Specify"], ["blocked-verify-r1", "blocked", "Verify", 1], ["approve-deploy-v1", "approve", "Deploy"]]) {
        assert.deepEqual(await run.attempt(), { status: "paused", key });
        const info = live.checkpointInfo(key);
        assert.deepEqual([info.kind, info.phase], [kind, phase], `the canvas reads checkpoint ${key}`);
        if (round) assert.equal(info.round, round);
        const record = await run.record();
        assert.deepEqual([record.status, record.pending], [kind === "approve" ? "awaiting-approval" : "blocked", key]);
    }
    for (const phase of PHASES) {
        const info = live.checkpointInfo(`blocked-${phase.toLowerCase()}-r${MAX_ROUNDS}`);
        assert.deepEqual([info.phase, info.round], [phase, MAX_ROUNDS], "the canvas reads the last round the workflow can block at");
    }

    const records = run.state.logs.map((text, seq) => ({ kind: "log", text, seq }));
    for (const record of records) {
        const match = CANVAS.gate.exec(record.text);
        const parsed = Object.entries(live.parseGates([record])).map(([phase, gate]) => [phase, gate.status, gate.summary]);
        assert.deepEqual(parsed, match ? [[match[1], match[2], match[3] ?? ""]] : [], record.text);
    }
    const gates = Object.entries(live.parseGates(records)).map(([phase, gate]) => [phase, gate.status]);
    assert.deepEqual(Object.fromEntries(gates), { Specify: "passed", Implement: "passed", Verify: "passed" }, "the last gate of each phase wins");
    const brief = live.briefOf(records);
    assert.equal(brief, CANVAS.brief.exec(logMatches(run.state, CANVAS.brief)[0])[1]);
    assert.ok(brief.length <= 160 && brief.startsWith("Claims triage x") && !/[\u0000-\u001f\u007f]/.test(brief), "the canvas shows the cleaned first line of the brief");
});
