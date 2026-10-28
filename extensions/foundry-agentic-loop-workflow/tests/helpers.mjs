import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLoop } from "../lib/loop.mjs";
import { recordFile } from "../lib/record.mjs";

export const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BRIEF = "Claims triage assistant for insurance adjusters.\nUsers: adjusters. Agents: triage and fraud. Data: policy PDFs. UX: web chat.";

const FATAL = ["AbortError", "ResponseError", "ConnectionError"];
export const passed = (who, extra = {}) => ({ status: "passed", summary: `${who} done`, issues: [], lessons: [`${who} lesson`], artifacts: [], assumptions: [], evidence: [{ claim: `${who} gate checks`, source: "test", result: "ok" }], ...extra });
export const failed = (who, issue = `${who} found a defect`) => ({ status: "failed", summary: `${who} failed`, issues: [issue], lessons: [] });
export const WORKSTREAMS = [
    { name: "api", goal: "Build the API", files: ["src/api"], checks: ["pytest src/api"] },
    { name: "web", goal: "Build the web app", files: ["src/web/**"] },
];

export function defaultResponder(who) {
    if (who === "Implement · foundation") return passed(who, { workstreams: WORKSTREAMS });
    if (who.startsWith("Deploy · review")) return passed(who, { endpoints: [{ name: "web", url: "https://web.example.azurecontainerapps.io/" }, { name: "bad", url: "ftp://x" }] });
    return passed(who);
}

export async function workspace(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), "al-workflow-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const cwd = path.join(root, "app");
    const home = path.join(root, "home");
    await mkdir(path.join(cwd, "docs"), { recursive: true });
    await mkdir(path.join(cwd, ".azure"), { recursive: true });
    await mkdir(home, { recursive: true });
    // The approvals fingerprint these artifacts, which a real run writes in Specify and Verify.
    for (const [rel, text] of [["docs/spec.md", "# Spec\n"], [".azure/deployment-plan.md", "# Plan\n"], ["docs/verify.md", "# Verify\n"]]) await writeFile(path.join(cwd, rel), text);
    return { root, cwd, home };
}

// In-memory model of the workflow runtime: journaled steps and agents, one-shot pauses, replay on resume.
export function harness({ cwd, home, args, responder = defaultResponder, runId = "run-1", dir = extensionDir, clockStart = 0 }) {
    const journal = { steps: new Map(), agents: new Map(), pauses: new Set() };
    const state = { calls: [], logs: [], phases: [], attempts: 0, responder };
    let clock = clockStart;
    const now = () => new Date(Date.UTC(2026, 0, 1) + 1000 * clock++).toISOString();
    const json = value => JSON.parse(JSON.stringify(value));

    async function attempt() {
        state.attempts += 1;
        state.phases = [];
        const seenSteps = new Set();
        const seenAgents = new Set();
        let pausedAt = null;
        const ctx = {
            runId,
            args,
            session: { rpc: { metadata: { snapshot: async () => ({ workingDirectory: cwd }) } } },
            async step(key, producer) {
                assert.ok(!seenSteps.has(key), `step key reused within an attempt: ${key}`);
                seenSteps.add(key);
                if (!journal.steps.has(key)) {
                    const value = await producer();
                    assert.notEqual(value, undefined, `step ${key} returned undefined`);
                    journal.steps.set(key, JSON.stringify(value));
                }
                return JSON.parse(journal.steps.get(key));
            },
            async agent(prompt, options) {
                const memo = JSON.stringify([prompt, options]);
                assert.ok(!seenAgents.has(memo), `agent prompt reused within an attempt: ${options.label}`);
                seenAgents.add(memo);
                if (journal.agents.has(memo)) return JSON.parse(journal.agents.get(memo));
                state.calls.push({ label: options.label, prompt, schema: options.schema, attempt: state.attempts });
                const value = (await state.responder(options.label, prompt)) ?? null;
                // Like the runtime, only results are memoized: a subagent that ended without one runs again on resume.
                if (value === null) return null;
                journal.agents.set(memo, JSON.stringify(value));
                return JSON.parse(journal.agents.get(memo));
            },
            async pause(key) {
                if (journal.pauses.has(key)) return;
                journal.pauses.add(key);
                pausedAt = key;
                throw new DOMException("Workflow run was aborted", "AbortError");
            },
            async parallel(thunks) {
                return Promise.all(thunks.map(async thunk => {
                    try { return await thunk(); }
                    catch (error) {
                        if (FATAL.includes(error?.name)) throw error;
                        return null;
                    }
                }));
            },
            phase(title) { state.phases.push(title); },
            log(message) { state.logs.push(message); },
        };
        try {
            return { status: "completed", result: json(await runLoop(ctx, { extensionDir: dir, home, now })) };
        } catch (error) {
            if (error?.name === "AbortError") return { status: "paused", key: pausedAt };
            return { status: "error", error };
        }
    }

    const record = async () => JSON.parse(await readFile(path.join(cwd, ...recordFile(runId).split("/")), "utf8"));
    return { attempt, record, state, journal };
}

export const labels = (state, prefix = "") => state.calls.filter(call => call.label.startsWith(prefix)).map(call => call.label);
export const logMatches = (state, regex) => state.logs.filter(line => regex.test(line));
