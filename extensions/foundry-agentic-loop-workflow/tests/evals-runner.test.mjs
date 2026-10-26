import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync } from "node:fs";
import os from "node:os";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    AGENT_TOOLS, MODES, RISKS, classify, exitCode, extractJson, filterCases, grade, indexLines, loadCases, main, prepareWorkspace, validateCases,
} from "../../../skills/foundry-agentic-loop/scripts/evals.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, "..", "..", "..", "skills", "foundry-agentic-loop");
const evalsDir = path.join(skillDir, "evals");
// Scratch space outside the source tree (realpath avoids the macOS /var symlink), removed after the run.
const scratch = realpathSync(mkdtempSync(path.join(os.tmpdir(), "al-evals-")));
const stub = path.join(scratch, "stub-copilot.mjs");
const log = path.join(scratch, "calls.jsonl");

// Fake Copilot CLI: the agent answers "good" when the installed SKILL.md has an "ok:<word>" line for the prompt's last word;
// the grader passes every expectation when the response says "good". STUB_FAIL=auth|crash|invalid simulates failures.
const STUB = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("stub 1.0.0"); process.exit(0); }
appendFileSync(process.env.STUB_LOG, JSON.stringify({ cwd: process.cwd(), args }) + "\\n");
const fail = process.env.STUB_FAIL;
if (fail === "auth") { console.error("Error: not logged in. Run copilot login."); process.exit(1); }
if (fail === "crash") { console.error("boom"); process.exit(3); }
const prompt = args[args.indexOf("-p") + 1];
if (prompt.startsWith("You grade")) {
    if (fail === "invalid") { console.log("I cannot grade this."); process.exit(0); }
    const count = prompt.split("## Expectations\\n")[1].split("\\n\\n")[0].split("\\n").length;
    const passed = /^(\\w+) good$/m.test(prompt.split("## Agent response\\n")[1]);
    const expectations = Array.from({ length: count }, (_, i) => ({ text: "e" + i, passed, evidence: passed ? "said good" : "said bad" }));
    console.log("Verdict follows.\\n\`\`\`json\\n" + JSON.stringify({ expectations }) + "\\n\`\`\`");
    process.exit(0);
}
const word = prompt.trim().split(/\\s+/).pop();
const skill = ".github/skills/foundry-agentic-loop/SKILL.md";
const ok = existsSync(skill) && readFileSync(skill, "utf8").includes("ok:" + word);
writeFileSync("notes.md", "notes for " + word + "\\n");
console.log(word + " " + (ok ? "good" : "bad"));
`;

const sh = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.fsmonitor=false", "-c", "gc.auto=0", ...args], { cwd, encoding: "utf8" });
const caseFor = (id, word, extra = {}) => ({
    id, mode: "shared", capabilities: ["eval"], targets: ["references/x.md"], risk: "low",
    prompt: `Check ${word}`, expected_output: "good", files: [], expectations: ["Says good.", "Is concise."], ...extra,
});

async function makeSkill(dir, okWords, cases) {
    await mkdir(path.join(dir, "references"), { recursive: true });
    await mkdir(path.join(dir, "evals", "fixtures", "tiny"), { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), `---\nname: foundry-agentic-loop\n---\n${okWords.map(w => `ok:${w}`).join("\n")}\n`);
    await writeFile(path.join(dir, "references", "x.md"), "# x\n");
    await writeFile(path.join(dir, "evals", "fixtures", "tiny", "README.md"), "# tiny fixture\n");
    await writeFile(path.join(dir, "evals", "evals.json"), `${JSON.stringify({ skill_name: "foundry-agentic-loop", evals: cases }, null, 2)}\n`);
}

async function capture(argv, env = {}) {
    const saved = { ...process.env };
    Object.assign(process.env, { STUB_LOG: log, ...env });
    const out = [];
    const err = [];
    try {
        const code = await main(argv, { cwd: scratch, out: line => out.push(line), err: line => err.push(line) });
        return { code, out: out.join("\n"), err: err.join("\n") };
    } finally {
        for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
        Object.assign(process.env, saved);
    }
}

before(async () => {
    await mkdir(scratch, { recursive: true });
    await writeFile(stub, STUB);
    await chmod(stub, 0o755);
});
after(() => rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

test("every eval case has valid metadata, existing targets and fixtures", async () => {
    const cases = await loadCases(path.join(evalsDir, "evals.json"));
    assert.deepEqual(validateCases(cases, { evalsDir, skillDir }), []);
    for (const mode of MODES) assert.ok(cases.some(c => c.mode === mode), `no ${mode} case`);
    assert.ok(cases.filter(c => c.mode === "improve").length >= 6);
    for (const c of cases) {
        assert.ok(RISKS.includes(c.risk));
        assert.ok(!/LAST_EVAL_ID|ai agent init[^"]*\s-m\s/.test(JSON.stringify(c)), `case ${c.id} has a stale command`);
    }
    const fixtures = new Set(cases.map(c => c.fixture).filter(Boolean));
    for (const name of ["rapid-locked", "sdd-paused", "sdd-deployed", "improve-history"]) assert.ok(fixtures.has(name), `fixture ${name} unused`);
});

test("fixtures hold only placeholder identifiers and parseable flight records", async () => {
    const files = execFileSync("git", ["ls-files", "--others", "--cached", "--exclude-standard", "evals/fixtures"], { cwd: skillDir, encoding: "utf8" }).split("\n").filter(Boolean);
    assert.ok(files.length > 10);
    for (const file of files) {
        const text = await readFile(path.join(skillDir, file), "utf8");
        for (const guid of text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []) assert.equal(guid, "00000000-0000-0000-0000-000000000000", file);
        assert.ok(!text.includes("\r"), `${file} has CRLF`);
        if (file.includes(".agentic-loop/runs/")) {
            const record = JSON.parse(text);
            assert.equal(record.workflow, "foundry-agentic-loop-workflow");
            assert.equal(path.basename(file, ".json"), record.runId);
        }
    }
});

test("validateCases reports schema problems", async () => {
    const bad = [
        { id: 1, mode: "fast", risk: "huge", capabilities: ["Not Kebab"], targets: ["references/missing.md"], prompt: "p", expected_output: "e", files: ["a.md"], expectations: ["x"] },
        { id: 1, mode: "sdd", risk: "low", capabilities: ["eval"], targets: ["SKILL.md"], fixture: "nope", prompt: "", expected_output: "e", files: [], expectations: [] },
    ];
    const errors = validateCases(bad, { evalsDir, skillDir }).join("\n");
    for (const fragment of ["mode must be", "risk must be", "kebab-case", "missing.md does not exist", "files need a fixture", "unique integer", "prompt is required", "expectations must be", "fixture nope"]) {
        assert.match(errors, new RegExp(fragment));
    }
});

test("index filters by mode, target, capability and ids", async () => {
    const cases = await loadCases(path.join(evalsDir, "evals.json"));
    const verify = filterCases(cases, { target: "references/verify.md" });
    assert.ok(verify.length > 3 && verify.every(c => c.targets.includes("references/verify.md")));
    assert.ok(filterCases(cases, { mode: "improve", capability: "eval" }).every(c => c.mode === "improve" && c.capabilities.includes("eval")));
    assert.deepEqual(filterCases(cases, { ids: "4, 29" }).map(c => c.id), [4, 29]);
    const [line] = indexLines(filterCases(cases, { ids: "29" }));
    assert.match(line, /^29 \| sdd \| medium \| eval \| references\/verify\.md \| /);
    assert.ok(line.length < 200);
    const printed = await capture(["index", "--target", "verify.md"]);
    assert.equal(printed.code, 0);
    assert.equal(printed.out.split("\n").length, verify.length);
});

test("prepareWorkspace copies the fixture and installs the skill without its evals", async () => {
    const ws = path.join(scratch, "prepare");
    await prepareWorkspace(ws, { fixture: "rapid-locked" }, { evalsDir, skillDir });
    assert.ok(existsSync(path.join(ws, "AGENTS.md")) && existsSync(path.join(ws, ".env")));
    assert.ok(existsSync(path.join(ws, ".gitignore")) && !existsSync(path.join(ws, "gitignore")));
    const installed = path.join(ws, ".github", "skills", "foundry-agentic-loop");
    assert.ok(existsSync(path.join(installed, "SKILL.md")) && existsSync(path.join(installed, "references", "verify.md")));
    assert.ok(!existsSync(path.join(installed, "evals")));
    assert.equal(sh(ws, "status", "--porcelain"), "");
    assert.match(sh(ws, "log", "--oneline"), /eval fixture/);
});

test("grading extracts strict JSON verdicts", () => {
    const c = { expectations: ["a", "b"] };
    const json = { expectations: [{ text: "a", passed: true, evidence: "q1" }, { text: "b", passed: false, evidence: "q2" }] };
    assert.deepEqual(extractJson(JSON.stringify(json)), json);
    assert.deepEqual(extractJson(`Here you go: {"note": "a } brace"} then ${JSON.stringify(json)}`), { note: "a } brace" });
    assert.deepEqual(extractJson("{not json} ```json\n{\"x\":1}\n```"), { x: 1 });
    assert.equal(extractJson("no braces"), null);
    assert.equal(grade(c, `Sure.\n\`\`\`json\n${JSON.stringify(json)}\n\`\`\``).status, "failed");
    assert.equal(grade(c, JSON.stringify({ expectations: json.expectations.map(e => ({ ...e, passed: true })) })).status, "passed");
    assert.deepEqual(grade(c, JSON.stringify(json)).expectations[1], { text: "b", passed: false, evidence: "q2" });
    for (const text of ["no json", "{\"expectations\": [{\"passed\": true}]}", "{\"expectations\": [{\"passed\": \"yes\"}, {\"passed\": true}]}"]) {
        assert.equal(grade(c, text).status, "error", text);
    }
});

test("classify separates regressions from pre-existing and new failures", () => {
    const passed = { status: "passed" };
    const failed = { status: "failed" };
    const error = { status: "error" };
    assert.equal(classify(passed, null, false), "passed");
    assert.equal(classify(error, null, false), "error");
    assert.equal(classify(failed, null, false), "failed");
    assert.equal(classify(failed, null, true), "new-failing");
    assert.equal(classify(failed, passed, false), "regression");
    assert.equal(classify(failed, failed, false), "pre-existing");
    assert.equal(classify(failed, error, false), "error");
    assert.equal(exitCode([{ verdict: "passed" }, { verdict: "pre-existing" }]), 0);
    assert.equal(exitCode([{ verdict: "passed" }, { verdict: "regression" }]), 1);
    assert.equal(exitCode([{ verdict: "failed" }]), 1);
    assert.equal(exitCode([{ verdict: "error", unavailable: true }, { verdict: "passed" }]), 2);
});

test("run grades cases in locked-down workspaces and writes results", async () => {
    const skill = path.join(scratch, "run-skill");
    await makeSkill(skill, ["alpha"], [caseFor(1, "alpha", { fixture: "tiny", files: ["README.md"] }), caseFor(2, "beta")]);
    await rm(log, { force: true });
    const out = path.join(scratch, "run-out");
    const args = ["run", "--ids", "1,2", "--skill", skill, "--evals", path.join(skill, "evals", "evals.json"), "--runner", stub, "--out", out, "--model", "m1"];
    const result = await capture(args);
    assert.equal(result.code, 1, result.err);
    const report = JSON.parse(await readFile(path.join(out, "results.json"), "utf8"));
    assert.deepEqual(report.cases.map(r => [r.id, r.status, r.verdict]), [[1, "passed", "passed"], [2, "failed", "failed"]]);
    assert.deepEqual(report.totals, { passed: 1, failed: 1, error: 0, regression: 0, newFailing: 0, preExisting: 0 });
    assert.equal(report.cases[0].expectations.length, 2);
    assert.deepEqual(report.cases[0].changes, ["notes.md"]);
    assert.match(await readFile(path.join(out, "1", "response.md"), "utf8"), /alpha good/);
    assert.equal(await readFile(path.join(out, "1", "changes.txt"), "utf8"), "?? notes.md\n");
    assert.ok(existsSync(path.join(out, "1", "workspace", "README.md")), "fixture copied");
    assert.ok(!existsSync(path.join(out, "1", "workspace", ".git")) && !existsSync(path.join(out, "1", "workspace", ".github")));
    assert.match(await readFile(path.join(out, "summary.md"), "utf8"), /\| 2 \| failed \| failed \| 0\/2 \|/);

    const calls = (await readFile(log, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    assert.equal(calls.length, 4);
    const agent = calls.find(c => c.args[c.args.indexOf("-p") + 1].startsWith("[Eval harness]")).args;
    const grader = calls.find(c => c.args[c.args.indexOf("-p") + 1].startsWith("You grade")).args;
    const following = (list, flag) => list.slice(list.indexOf(flag) + 1, list.indexOf(flag) + 1 + AGENT_TOOLS.length);
    assert.deepEqual(following(agent, "--available-tools"), AGENT_TOOLS);
    for (const args of [agent, grader]) {
        for (const pair of [["--deny-tool", "shell"], ["--deny-tool", "url"]]) assert.ok(args.join(" ").includes(pair.join(" ")));
        for (const flag of ["--no-ask-user", "--disable-builtin-mcps", "--disallow-temp-dir", "-s"]) assert.ok(args.includes(flag), flag);
        assert.ok(!args.some(arg => arg.startsWith("--available-tools=")));
        assert.equal(args[args.indexOf("--model") + 1], "m1");
    }
    assert.equal(grader[grader.indexOf("--available-tools") + 1], "view");
    assert.ok(!grader.includes("--allow-all-tools"));
});

test("run exits 2 when the runner is missing or signed out, and errors on invalid grades", async () => {
    const skill = path.join(scratch, "fail-skill");
    await makeSkill(skill, ["alpha"], [caseFor(1, "alpha"), caseFor(2, "beta")]);
    const base = ["run", "--ids", "1,2", "--skill", skill, "--evals", path.join(skill, "evals", "evals.json")];
    const missing = await capture([...base, "--runner", path.join(scratch, "no-such-copilot"), "--out", path.join(scratch, "missing-out")]);
    assert.equal(missing.code, 2);
    assert.match(missing.err, /Evals unavailable/);

    const auth = await capture([...base, "--runner", stub, "--out", path.join(scratch, "auth-out"), "--concurrency", "1"], { STUB_FAIL: "auth" });
    assert.equal(auth.code, 2);
    const authReport = JSON.parse(await readFile(path.join(scratch, "auth-out", "results.json"), "utf8"));
    assert.ok(authReport.cases.every(r => r.unavailable && r.status === "error"));
    assert.match(authReport.cases[1].error, /skipped/);

    const invalid = await capture([...base, "--runner", stub, "--out", path.join(scratch, "invalid-out")], { STUB_FAIL: "invalid" });
    assert.equal(invalid.code, 1);
    const report = JSON.parse(await readFile(path.join(scratch, "invalid-out", "results.json"), "utf8"));
    assert.ok(report.cases.every(r => r.status === "error" && /valid JSON/.test(r.error)));

    const crash = await capture([...base, "--runner", stub, "--out", path.join(scratch, "crash-out")], { STUB_FAIL: "crash" });
    assert.equal(crash.code, 1);

    assert.equal((await capture(["run", "--runner", stub])).code, 2, "a selector is required");
});

test("run --base compares failing cases with the skill at a Git ref or folder", async () => {
    const repo = path.join(scratch, "repo");
    const skill = path.join(repo, "skills", "foundry-agentic-loop");
    const evals = path.join(skill, "evals", "evals.json");
    await makeSkill(skill, ["alpha", "delta"], [caseFor(1, "alpha"), caseFor(2, "beta"), caseFor(4, "delta")]);
    sh(repo, "init", "-q");
    sh(repo, "add", "-A");
    sh(repo, "commit", "-q", "-m", "base");
    const copy = path.join(scratch, "base-copy");
    execFileSync("cp", ["-R", skill, copy]);
    // Candidate: drops alpha (regression), beta still fails (pre-existing), adds a failing case 3 (new), delta still passes.
    await makeSkill(skill, ["delta"], [caseFor(1, "alpha"), caseFor(2, "beta"), caseFor(3, "gamma"), caseFor(4, "delta")]);

    for (const [label, ref] of [["ref", "HEAD"], ["dir", copy]]) {
        const out = path.join(scratch, `base-out-${label}`);
        const result = await capture(["run", "--ids", "1,2,3,4", "--skill", skill, "--evals", evals, "--runner", stub, "--out", out, "--base", ref]);
        assert.equal(result.code, 1, result.err);
        const report = JSON.parse(await readFile(path.join(out, "results.json"), "utf8"));
        assert.deepEqual(report.cases.map(r => [r.id, r.verdict]), [[1, "regression"], [2, "pre-existing"], [3, "new-failing"], [4, "passed"]]);
        assert.equal(report.cases[0].base.status, "passed");
        assert.equal(report.cases[1].base.status, "failed");
        assert.ok(!report.cases[2].base && report.cases[2].changed);
        assert.ok(!report.cases[3].base);
        assert.deepEqual([report.totals.regression, report.totals.preExisting, report.totals.newFailing], [1, 1, 1]);
        assert.match(await readFile(path.join(out, "summary.md"), "utf8"), /## Case 1: regression/);
    }

    const clean = await capture(["run", "--ids", "2,4", "--skill", skill, "--evals", evals, "--runner", stub, "--out", path.join(scratch, "base-out-clean"), "--base", "HEAD"]);
    assert.equal(clean.code, 0, "pre-existing failures alone do not fail the run");
});
