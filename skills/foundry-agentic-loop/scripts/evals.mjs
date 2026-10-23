#!/usr/bin/env node
// Eval harness for the foundry-agentic-loop skill (Node >= 20, no dependencies). Usage: references/improve.md.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = "foundry-agentic-loop";
export const MODES = ["rapid", "sdd", "improve", "shared"];
export const RISKS = ["low", "medium", "high"];
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Evals never reach Azure or the network: no shell, URLs, MCP servers or workflow tools, and files only inside the workspace.
export const AGENT_TOOLS = ["view", "glob", "grep", "skill", "create", "edit"];
const LOCKDOWN = ["--deny-tool", "shell", "--deny-tool", "url", "--disable-builtin-mcps", "--disallow-temp-dir", "--no-ask-user", "-s"];
const PREAMBLE = "[Eval harness] This is an offline evaluation workspace. Shell, network, Azure, workflow and extension tools are unavailable by design. "
    + "Where a step needs one, state the exact tool call or command you would run and why, then continue. Never claim that it ran. "
    + `Load the ${SKILL_NAME} skill when the task is in its scope.\n\n`;
const AUTH = /not (?:logged|signed) in|no authentication|authentication (?:failed|required)|copilot login|unauthori[sz]ed|\b401\b/i;
const MAX_TEXT = 40_000;
const USAGE = `Usage:
  node evals.mjs index [--mode m] [--target file] [--capability c] [--ids 1,2]
  node evals.mjs validate
  node evals.mjs run (--ids 1,2 | --target file | --mode m | --capability c) [--base <git-ref|dir>] [--skill <dir>]
                 [--out <dir>] [--model m] [--grader-model m] [--runner <cmd>] [--concurrency n]
                 [--timeout <seconds>] [--max-ai-credits n] [--evals <evals.json>]
Exit codes: 0 all pass (with --base: no regressions and every new or changed case passes), 1 failures, 2 evals unavailable.`;

export function parseArgs(argv) {
    const [command, ...rest] = argv;
    const opts = {};
    for (let i = 0; i < rest.length; i += 1) {
        const match = /^--([a-z-]+)(?:=(.*))?$/s.exec(rest[i]);
        if (!match) throw new Error(`Unexpected argument: ${rest[i]}`);
        const value = match[2] ?? rest[++i];
        if (value === undefined) throw new Error(`--${match[1]} needs a value.`);
        opts[match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return { command, opts };
}

export async function loadCases(file) {
    return JSON.parse(await readFile(file, "utf8")).evals;
}

const list = value => String(value ?? "").split(",").map(item => item.trim()).filter(Boolean);
const matchesTarget = (targets, value) => targets.some(target => target === value || target.endsWith(`/${value}`));

export function filterCases(cases, { ids, mode, target, capability } = {}) {
    const wanted = new Set(list(ids).map(Number));
    return cases.filter(c => (!wanted.size || wanted.has(c.id))
        && (!mode || c.mode === mode)
        && (!target || matchesTarget(c.targets ?? [], target))
        && (!capability || (c.capabilities ?? []).includes(capability)));
}

export function indexLines(cases) {
    const short = text => {
        const line = String(text).replace(/\s+/g, " ").trim();
        return line.length > 80 ? `${line.slice(0, 79)}…` : line;
    };
    return cases.map(c => [c.id, c.mode, c.risk, c.capabilities.join(","), c.targets.join(","), short(c.prompt)].join(" | "));
}

export function validateCases(cases, { evalsDir, skillDir }) {
    const errors = [];
    const ids = new Set();
    for (const c of cases) {
        const at = `case ${c?.id}`;
        if (!Number.isInteger(c?.id) || ids.has(c.id)) errors.push(`${at}: id must be a unique integer`);
        ids.add(c?.id);
        for (const key of ["prompt", "expected_output"]) if (typeof c?.[key] !== "string" || !c[key].trim()) errors.push(`${at}: ${key} is required`);
        if (!Array.isArray(c?.expectations) || !c.expectations.length || c.expectations.some(e => typeof e !== "string" || !e.trim())) errors.push(`${at}: expectations must be non-empty strings`);
        if (!Array.isArray(c?.files)) errors.push(`${at}: files must be an array`);
        if (!MODES.includes(c?.mode)) errors.push(`${at}: mode must be one of ${MODES.join(", ")}`);
        if (!RISKS.includes(c?.risk)) errors.push(`${at}: risk must be one of ${RISKS.join(", ")}`);
        if (!Array.isArray(c?.capabilities) || !c.capabilities.length || c.capabilities.some(tag => !TAG.test(tag))) errors.push(`${at}: capabilities must be kebab-case tags`);
        if (!Array.isArray(c?.targets) || !c.targets.length) errors.push(`${at}: targets must list skill files`);
        else for (const target of c.targets) if (!existsSync(path.join(skillDir, target))) errors.push(`${at}: target ${target} does not exist`);
        if (c?.fixture !== undefined) {
            const dir = path.join(evalsDir, "fixtures", String(c.fixture));
            if (!TAG.test(String(c.fixture)) || !existsSync(dir)) errors.push(`${at}: fixture ${c.fixture} does not exist`);
            else for (const file of c.files ?? []) if (!existsSync(path.join(dir, file))) errors.push(`${at}: file ${file} is not in fixture ${c.fixture}`);
        } else if (c?.files?.length) errors.push(`${at}: files need a fixture`);
    }
    return errors;
}

// Returns the first JSON object embedded in the text (code fences and prose around it are ignored), or null.
export function extractJson(text) {
    const s = String(text ?? "");
    for (let start = s.indexOf("{"); start !== -1; start = s.indexOf("{", start + 1)) {
        let depth = 0;
        let quoted = false;
        let escaped = false;
        for (let i = start; i < s.length; i += 1) {
            const ch = s[i];
            if (quoted) {
                if (escaped) escaped = false;
                else if (ch === "\\") escaped = true;
                else if (ch === "\"") quoted = false;
            } else if (ch === "\"") quoted = true;
            else if (ch === "{") depth += 1;
            else if (ch === "}" && --depth === 0) {
                try {
                    const value = JSON.parse(s.slice(start, i + 1));
                    if (value && typeof value === "object" && !Array.isArray(value)) return value;
                } catch { /* try the next opening brace */ }
                break;
            }
        }
    }
    return null;
}

export function grade(c, text) {
    const rows = extractJson(text)?.expectations;
    if (!Array.isArray(rows) || rows.length !== c.expectations.length || rows.some(row => typeof row?.passed !== "boolean")) {
        return { status: "error", error: "The grader returned no valid JSON verdict.", expectations: [] };
    }
    const expectations = c.expectations.map((expectation, i) => ({ text: expectation, passed: rows[i].passed, evidence: String(rows[i].evidence ?? "").slice(0, 500) }));
    return { status: expectations.every(row => row.passed) ? "passed" : "failed", expectations };
}

export const signature = c => JSON.stringify([c.prompt, c.expected_output, c.expectations, c.fixture ?? null]);

// New or changed cases must pass outright; a failing unchanged case is a regression only when it passed at the base.
export function classify(current, base, changed) {
    if (current.status === "error") return "error";
    if (current.status === "passed") return "passed";
    if (changed) return "new-failing";
    if (!base) return "failed";
    if (base.status === "error") return "error";
    return base.status === "passed" ? "regression" : "pre-existing";
}

export function exitCode(results) {
    if (results.some(r => r.unavailable)) return 2;
    return results.every(r => ["passed", "pre-existing"].includes(r.verdict)) ? 0 : 1;
}

function exec(command, args, { cwd, timeoutMs = 0 } = {}) {
    return new Promise(resolve => {
        const child = spawn(command[0], [...command.slice(1), ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = timeoutMs ? setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeoutMs) : null;
        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });
        child.on("error", error => { clearTimeout(timer); resolve({ code: null, stdout, stderr, error }); });
        child.on("close", code => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    });
}

const unavailable = r => r.error?.code === "ENOENT" || (r.code !== 0 && AUTH.test(`${r.stderr}\n${r.stdout}`));
const failure = r => (r.timedOut ? "timed out" : r.error?.message ?? `exit ${r.code}: ${(r.stderr || r.stdout).trim().slice(-500)}`);

async function git(cwd, args) {
    const r = await exec(["git"], ["-c", "user.name=evals", "-c", "user.email=evals@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.fsmonitor=false", "-c", "gc.auto=0", ...args], { cwd });
    if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${failure(r)}`);
    return r.stdout;
}

// A fresh Git workspace with the case fixture and the candidate skill installed as a project override, minus its evals.
export async function prepareWorkspace(ws, c, { evalsDir, skillDir }) {
    await mkdir(ws, { recursive: true });
    if (c.fixture) await cp(path.join(evalsDir, "fixtures", c.fixture), ws, { recursive: true });
    // Fixtures store .gitignore as "gitignore" so the repository still tracks the files it lists, such as a placeholder .env.
    if (existsSync(path.join(ws, "gitignore"))) await rename(path.join(ws, "gitignore"), path.join(ws, ".gitignore"));
    await cp(skillDir, path.join(ws, ".github", "skills", SKILL_NAME), {
        recursive: true,
        filter: src => path.relative(skillDir, src).split(path.sep)[0] !== "evals",
    });
    await git(ws, ["init", "-q"]);
    await git(ws, ["add", "-A"]);
    await git(ws, ["commit", "-q", "--no-verify", "-m", "eval fixture"]);
}

async function changedFiles(ws) {
    const out = await git(ws, ["status", "--porcelain", "--untracked-files=all"]);
    return out.split("\n").filter(Boolean).map(line => ({ state: line.slice(0, 2).trim(), file: line.slice(3).replace(/^"|"$/g, "") }));
}

async function graderPrompt(c, response, ws, changes) {
    let budget = MAX_TEXT;
    const files = [];
    for (const { state, file } of changes) {
        let body = "(deleted)";
        if (state !== "D") {
            const text = await readFile(path.join(ws, file), "utf8").catch(() => "(unreadable)");
            body = text.slice(0, Math.max(0, Math.min(8000, budget)));
            budget -= body.length;
        }
        files.push(`--- ${file} [${state}]\n${body}`);
    }
    return [
        "You grade one evaluation case for the foundry-agentic-loop skill. Judge only the evidence below; do not use tools.",
        "The agent ran offline without shell, network, Azure or workflow tools. Credit an action it says it would take when it names the exact tool call or command; never credit a claim that something ran or passed without evidence.",
        "Be strict: an expectation passes only when the evidence satisfies every clause of it. Never infer unstated actions; if any part is missing, mark it false and name the missing part.",
        "Reply with JSON only: {\"expectations\":[{\"text\":\"<expectation>\",\"passed\":true|false,\"evidence\":\"<short quote or reason>\"}]}, one entry per expectation, in order.",
        `\n## Prompt\n${c.prompt}`,
        `\n## Expected output\n${c.expected_output}`,
        `\n## Expectations\n${c.expectations.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
        `\n## Agent response\n${response.slice(0, MAX_TEXT) || "(empty)"}`,
        `\n## Files the agent changed\n${files.join("\n") || "(none)"}`,
    ].join("\n");
}

async function runCase(c, ctx, dir) {
    const started = Date.now();
    const ws = path.join(dir, "workspace");
    const done = extra => ({ id: c.id, durationMs: Date.now() - started, expectations: [], ...extra });
    await rm(dir, { recursive: true, force: true });
    await prepareWorkspace(ws, c, ctx);
    const credits = ctx.maxAiCredits ? ["--max-ai-credits", ctx.maxAiCredits] : [];
    const agent = await exec(ctx.runner, ["-p", PREAMBLE + c.prompt, "--allow-all-tools", "--trust-folder", "--available-tools", ...AGENT_TOOLS, ...LOCKDOWN,
        ...(ctx.model ? ["--model", ctx.model] : []), ...credits, `--share=${path.join(dir, "transcript.md")}`], { cwd: ws, timeoutMs: ctx.timeoutMs });
    if (unavailable(agent)) return done({ status: "error", unavailable: true, error: failure(agent) });
    if (agent.code !== 0) return done({ status: "error", error: `agent ${failure(agent)}` });
    const response = agent.stdout.trim();
    const changes = await changedFiles(ws);
    await writeFile(path.join(dir, "response.md"), `${response}\n`);
    await writeFile(path.join(dir, "changes.txt"), changes.map(row => `${row.state} ${row.file}\n`).join(""));
    const graderModel = ctx.graderModel ?? ctx.model;
    const grader = await exec(ctx.runner, ["-p", await graderPrompt(c, response, ws, changes), "--no-custom-instructions", "--available-tools", "view", ...LOCKDOWN,
        ...(graderModel ? ["--model", graderModel] : []), ...credits], { cwd: ws, timeoutMs: ctx.timeoutMs });
    await writeFile(path.join(dir, "grader.txt"), grader.stdout);
    // Keep the fixture and what the agent wrote; drop the Git metadata and, unless the agent edited it, the installed skill.
    await rm(path.join(ws, ".git"), { recursive: true, force: true });
    if (!changes.some(row => row.file.startsWith(".github/"))) await rm(path.join(ws, ".github"), { recursive: true, force: true });
    if (unavailable(grader)) return done({ status: "error", unavailable: true, error: failure(grader) });
    if (grader.code !== 0) return done({ status: "error", error: `grader ${failure(grader)}` });
    return done({ ...grade(c, grader.stdout), changes: changes.map(row => row.file) });
}

async function pool(items, size, fn) {
    const results = [];
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    }));
    return results;
}

async function runAll(cases, ctx, root) {
    let stopped = false;
    return pool(cases, ctx.concurrency, async c => {
        if (stopped) return { id: c.id, status: "error", unavailable: true, error: "skipped: evals unavailable", expectations: [], durationMs: 0 };
        const result = await runCase(c, ctx, path.join(root, String(c.id)))
            .catch(error => ({ id: c.id, status: "error", error: error.message, expectations: [], durationMs: 0 }));
        if (result.unavailable) stopped = true;
        return result;
    });
}

// Resolves the base skill: a folder holding a previous copy (such as the installed plugin skill), or the skill exported at a Git ref.
export async function exportBase(ref, skillDir, evalsFile, root) {
    if (existsSync(path.join(ref, "SKILL.md"))) {
        const file = path.join(ref, "evals", "evals.json");
        const cases = existsSync(file) ? await loadCases(file) : [];
        return { skillDir: path.resolve(ref), cases: new Map(cases.map(c => [c.id, c])) };
    }
    const top = (await git(skillDir, ["rev-parse", "--show-toplevel"])).trim();
    const posix = file => path.relative(top, file).split(path.sep).join("/");
    const prefix = posix(skillDir);
    const tar = path.join(root, "skill.tar");
    await mkdir(root, { recursive: true });
    await git(top, ["archive", "--format=tar", "-o", tar, ref, "--", prefix || "."]);
    const extracted = await exec(["tar"], ["-xf", tar, "-C", root]);
    await rm(tar, { force: true });
    if (extracted.code !== 0) throw new Error(`tar failed: ${failure(extracted)}`);
    const shown = await exec(["git"], ["show", `${ref}:${posix(evalsFile)}`], { cwd: top });
    const cases = shown.code === 0 ? JSON.parse(shown.stdout).evals : [];
    return { skillDir: path.join(root, prefix), cases: new Map(cases.map(c => [c.id, c])) };
}

function summary(report) {
    const t = report.totals;
    const lines = [
        "# Agentic Loop eval run",
        "",
        `- Skill: \`${report.skill}\`${report.base ? ` · base \`${report.base.ref}\`` : ""} · model ${report.model ?? "default"}`,
        `- ${t.passed} passed, ${t.failed} failed, ${t.error} errors${report.base ? `, ${t.regression} regressions, ${t.newFailing} new or changed failing, ${t.preExisting} pre-existing` : ""} · exit ${report.exitCode}`,
        "",
        "| Case | Status | Verdict | Expectations | Seconds |",
        "| --- | --- | --- | --- | --- |",
        ...report.cases.map(r => `| ${r.id} | ${r.status} | ${r.verdict} | ${r.expectations.filter(e => e.passed).length}/${r.expectations.length} | ${Math.round(r.durationMs / 1000)} |`),
    ];
    for (const r of report.cases.filter(row => row.status !== "passed")) {
        lines.push("", `## Case ${r.id}: ${r.verdict}`);
        if (r.error) lines.push(`- Error: ${r.error}`);
        for (const e of r.expectations.filter(row => !row.passed)) lines.push(`- ✗ ${e.text}`, `  - ${e.evidence}`);
        if (r.base) lines.push(`- Base: ${r.base.status}${r.base.error ? ` (${r.base.error})` : ""}`);
    }
    return `${lines.join("\n")}\n`;
}

async function run(opts, ctx, out) {
    if (!["ids", "mode", "target", "capability"].some(key => opts[key])) throw new Error("Select cases with --ids, --target, --mode or --capability.");
    const cases = filterCases(await loadCases(ctx.evalsFile), opts);
    if (!cases.length) throw new Error("No eval case matches the selection.");
    if (!existsSync(path.join(ctx.skillDir, "SKILL.md"))) throw new Error(`No SKILL.md in ${ctx.skillDir}.`);
    const probe = await exec(ctx.runner, ["--version"], { timeoutMs: 60_000 });
    if (probe.code !== 0) throw new Error(`${ctx.runner.join(" ")} is not available (${failure(probe)})`);
    const baseDir = opts.base && path.resolve(ctx.cwd, opts.base);
    const baseRef = baseDir && existsSync(path.join(baseDir, "SKILL.md")) ? baseDir : opts.base;
    const exported = opts.base ? await exportBase(baseRef, ctx.skillDir, ctx.evalsFile, path.join(ctx.outDir, "base", "src")) : null;
    const startedAt = new Date().toISOString();
    out(`Running ${cases.length} case(s) → ${ctx.outDir}`);
    const results = await runAll(cases, ctx, ctx.outDir);
    if (exported && !results.some(r => r.unavailable)) {
        results.forEach((r, i) => { r.changed = !exported.cases.has(r.id) || signature(exported.cases.get(r.id)) !== signature(cases[i]); });
        const rerun = cases.filter((c, i) => results[i].status === "failed" && !results[i].changed);
        if (rerun.length) out(`Comparing ${rerun.length} failing case(s) against ${opts.base}`);
        for (const b of await runAll(rerun, { ...ctx, skillDir: exported.skillDir }, path.join(ctx.outDir, "base"))) {
            const r = results.find(row => row.id === b.id);
            r.base = b;
            if (b.unavailable) r.unavailable = true;
        }
    }
    results.forEach(r => { r.verdict = classify(r, r.base, r.changed); });
    const count = verdict => results.filter(r => r.verdict === verdict).length;
    const report = {
        schema: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        skill: ctx.skillDir,
        base: exported ? { ref: baseRef, skill: exported.skillDir } : null,
        model: ctx.model ?? null,
        exitCode: exitCode(results),
        totals: {
            passed: count("passed"),
            failed: results.filter(r => r.status === "failed").length,
            error: count("error"),
            regression: count("regression"),
            newFailing: count("new-failing"),
            preExisting: count("pre-existing"),
        },
        cases: results.map((r, i) => ({ mode: cases[i].mode, ...r })),
    };
    await mkdir(ctx.outDir, { recursive: true });
    await writeFile(path.join(ctx.outDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(path.join(ctx.outDir, "summary.md"), summary(report));
    out(summary(report));
    if (report.exitCode === 2) out(`Evals unavailable: ${results.find(r => r.unavailable).error}`);
    return report.exitCode;
}

export async function main(argv, { cwd = process.cwd(), out = line => console.log(line), err = line => console.error(line) } = {}) {
    try {
        const { command, opts } = parseArgs(argv);
        const evalsFile = path.resolve(cwd, opts.evals ?? path.join(SKILL_DIR, "evals", "evals.json"));
        const evalsDir = path.dirname(evalsFile);
        if (command === "index") {
            indexLines(filterCases(await loadCases(evalsFile), opts)).forEach(line => out(line));
            return 0;
        }
        if (command === "validate") {
            const errors = validateCases(await loadCases(evalsFile), { evalsDir, skillDir: path.dirname(evalsDir) });
            errors.forEach(line => err(line));
            if (!errors.length) out("Eval cases are valid.");
            return errors.length ? 1 : 0;
        }
        if (command !== "run") throw new Error(`Unknown command: ${command ?? "(none)"}\n${USAGE}`);
        return await run(opts, {
            cwd,
            evalsFile,
            evalsDir,
            skillDir: path.resolve(cwd, opts.skill ?? SKILL_DIR),
            outDir: path.resolve(cwd, opts.out ?? path.join(".agentic-loop", "evals", new Date().toISOString().replace(/[:.]/g, "-"))),
            runner: opts.runner && existsSync(path.resolve(cwd, opts.runner)) ? [path.resolve(cwd, opts.runner)] : (opts.runner ?? "copilot").split(/\s+/).filter(Boolean),
            model: opts.model,
            graderModel: opts.graderModel,
            maxAiCredits: opts.maxAiCredits,
            concurrency: Math.max(1, Number(opts.concurrency ?? 3) || 3),
            timeoutMs: Math.max(1, Number(opts.timeout ?? 1200) || 1200) * 1000,
        }, out);
    } catch (error) {
        err(`Evals unavailable: ${error.message}`);
        return 2;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    process.exitCode = await main(process.argv.slice(2));
}
