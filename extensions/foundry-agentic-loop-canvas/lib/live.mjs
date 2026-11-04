import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const WORKFLOW = "foundry-agentic-loop-workflow";
export const PHASES = Object.freeze(["Specify", "Implement", "Verify", "Deploy"]);
export const ARTIFACTS = Object.freeze({
    Specify: ["docs/spec.md", ".azure/deployment-plan.md"],
    Implement: ["docs/implementation.md"],
    Verify: ["docs/verify.md"],
    Deploy: ["docs/deploy.md"],
});
export const LESSONS = "docs/LOOP.md";
export const ARTIFACT_PATHS = Object.freeze([...Object.values(ARTIFACTS).flat(), LESSONS]);
export const AGENTS = "AGENTS.md";
// The rapid contract and hosted checkpoint evidence.
export const README = "README.md";
export const OPENABLE = Object.freeze([...ARTIFACT_PATHS, AGENTS, README]);
// The workflow's lib/agents-md.mjs writes the same marker; its pin test keeps the two in sync.
const LOCK = /<!--\s*foundry-agentic-loop:begin\s+mode=(rapid|sdd)\s*-->/;
// Only the Agentic Loop section locks the build mode; any other AGENTS.md content does not.
export function parseLock(text) { return LOCK.exec(String(text ?? ""))?.[1] ?? null; }
export const lockMessage = mode => `AGENTS.md locks this workspace to ${mode === "sdd" ? "the SDD workflow" : "rapid prototyping"}. Ask Copilot in Chat to switch; it confirms first, then rewrites the Agentic Loop section.`;
export const APPROVALS = Object.freeze({
    "approve-spec-v1": "Specify",
    "approve-deploy-v1": "Deploy",
});
// A phase that cannot pass its gate pauses at blocked-<phase>-r<round>; resuming retries that phase as the next round.
const BLOCKED = /^blocked-(specify|implement|verify|deploy)-r([1-9]\d{0,2})$/;
// A spec or plan changed after its approval: Implement round n or Deploy round n (attempt k) waits for approval again.
const REAPPROVE = /^approve-(?:spec-r([1-9]\d{0,2})|deploy-r([1-9]\d{0,2})(?:-a[1-9]\d{0,2})?)-v1$/;
// The flight record could not be written; the run waits until the cause is fixed.
const RECORD = /^blocked-record-.+$/;
const NEEDS = /^Needs you: /;
const CHANGED = /these changed: (.*?)\. Review /;
const GATE = /^(Specify|Implement|Verify|Deploy) gate: (passed|failed|blocked)(?: [—-] (.*))?$/;
const BRIEF = /^Brief: (.+)$/;

export function parseGates(records = []) {
    const gates = {};
    for (const record of records) {
        const match = record?.kind === "log" && GATE.exec(String(record.text ?? "").trim());
        if (match) gates[match[1]] = { status: match[2], summary: match[3] ?? "", seq: record.seq };
    }
    return gates;
}

export function briefOf(records = []) {
    for (const record of records) {
        const match = record?.kind === "log" && BRIEF.exec(String(record.text ?? "").trim());
        if (match) return match[1].slice(0, 160);
    }
    return null;
}

const SAFE_RUN_ID = /^[A-Za-z0-9._-]{1,120}$/;
// Mirrors the workflow's recordFile(): a safe run ID is the file name; any other is sanitized and hash-suffixed so distinct IDs never share a file.
export function runFile(runId) {
    const id = String(runId);
    if (SAFE_RUN_ID.test(id)) return `${id}.json`;
    return `${id.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100)}-${createHash("sha256").update(id).digest("hex").slice(0, 8)}.json`;
}
export const flightRecordPath = runId => path.posix.join(".agentic-loop", "runs", runFile(runId));

export function outcomeOf(record) {
    if (!record || !["deployed", "verified", "implemented", "specified"].includes(record.status)) return null;
    const endpoints = (Array.isArray(record.endpoints) ? record.endpoints : []).flatMap(row => {
        try {
            const url = new URL(String(row?.url ?? ""));
            if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return [];
            return [{ name: String(row?.name ?? "").trim().slice(0, 80) || url.hostname, url: url.href }];
        } catch { return []; }
    });
    return { status: record.status, endpoints: endpoints.slice(0, 8) };
}

// Run settings that decide the user's next decision; the runtime's run detail does not carry the args.
export function planOf(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    return {
        autonomy: record.autonomy === "auto" ? "auto" : "gated",
        skipDeploy: record.skipDeploy === true,
        to: ["Specify", "Implement", "Verify", "Deploy"].includes(record.to) ? record.to : record.skipDeploy === true ? "Verify" : "Deploy",
        maxFixLoops: Number.isInteger(record.maxFixLoops) ? record.maxFixLoops : null,
    };
}

const line = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Every gate issue behind a blocked checkpoint; the Chat and gate lines carry only the first.
export function blockerOf(record, pause) {
    if (pause?.kind !== "blocked" || !Array.isArray(record?.phases)) return null;
    const entry = record.phases.findLast(row => row?.phase === pause.phase && row?.round === pause.round);
    if (!entry || !["failed", "blocked"].includes(entry.status)) return null;
    return {
        status: entry.status,
        summary: line(entry.summary, 300),
        issues: (Array.isArray(entry.issues) ? entry.issues : []).map(issue => line(issue, 500)).filter(Boolean).slice(0, 20),
        fixes: (Array.isArray(entry.attempts) ? entry.attempts : []).filter(row => row?.role === "fix").length,
    };
}

export function checkpointOf(run) {
    const info = run?.terminal?.pauseInfo;
    return run?.status === "paused" && info?.type === "checkpoint" ? info.key : null;
}

export function checkpointInfo(key) {
    if (typeof key !== "string" || !key) return null;
    if (Object.hasOwn(APPROVALS, key)) return { key, kind: "approve", phase: APPROVALS[key], round: 1 };
    const match = BLOCKED.exec(key);
    if (match) return { key, kind: "blocked", phase: match[1][0].toUpperCase() + match[1].slice(1), round: Number(match[2]) };
    const again = REAPPROVE.exec(key);
    if (again) return { key, kind: "approve", phase: again[1] ? "Specify" : "Deploy", round: Number(again[1] ?? again[2]), again: true };
    if (RECORD.test(key)) return { key, kind: "record", phase: null, round: null };
    return { key, kind: "other", phase: null, round: null };
}

// The latest "Needs you:" line, and what changed since an approval. Change items can contain commas, so the list stays one string.
export function needsOf(records = []) {
    const text = records.findLast(record => record?.kind === "log" && NEEDS.test(String(record.text ?? "").trim()))?.text;
    if (!text) return { needs: null, changes: null };
    const needs = String(text).trim();
    return { needs: needs.slice(0, 600), changes: CHANGED.exec(needs)?.[1] ?? null };
}

export function shapeSummary(run) {
    const ordinal = run.currentPhase?.ordinal;
    return {
        runId: run.runId,
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        completedAt: run.completedAt ?? null,
        phase: Number.isInteger(ordinal) ? PHASES[ordinal] ?? null : null,
        checkpoint: checkpointOf(run),
        pause: checkpointInfo(checkpointOf(run)),
        canResume: Boolean(run.canResume),
    };
}

// `record` is the run's flight record (.agentic-loop/runs/<runId>.json), or null when it is missing or unreadable.
export function shapeRun(detail, existing = new Set(), records = detail.progress?.records ?? [], record = null) {
    const gates = parseGates(records);
    const phases = PHASES.map((title, index) => {
        const phase = detail.phases?.find(row => row.title === title) ?? detail.phases?.find(row => row.ordinal === index);
        const agents = phase ? (detail.agents ?? []).filter(agent => agent.phaseId === phase.id) : [];
        return {
            title,
            status: phase?.status ?? "pending",
            startedAt: phase?.startedAt ?? null,
            completedAt: phase?.completedAt ?? null,
            activeMs: (phase?.accumulatedActiveMs ?? 0) + (phase?.currentActiveMs ?? 0),
            gate: gates[title] ?? null,
            agents: agents.map(agent => ({
                id: agent.agentId,
                label: agent.displayName || agent.label,
                status: agent.status,
                model: agent.resolvedModel ?? agent.requestedModel ?? null,
                startedAt: agent.startedAt ?? null,
                activeMs: agent.activeMs ?? 0,
                activity: agent.activity ?? null,
            })),
            artifacts: ARTIFACTS[title].map(file => ({ path: file, exists: existing.has(file) })),
        };
    });
    const summary = shapeSummary(detail);
    return {
        ...summary,
        brief: briefOf(records),
        phases,
        log: records.slice(-40).map(row => ({ seq: row.seq, at: row.recordedAt, kind: row.kind, text: row.text })),
        metrics: {
            activeMs: detail.consumed?.activeMs ?? 0,
            subagents: detail.consumed?.subagents ?? 0,
            credits: (detail.consumed?.nanoAiu ?? 0) / 1e9,
            liveAgents: detail.liveAgentCount ?? 0,
        },
        reason: detail.terminal?.reason ?? null,
        error: detail.terminal?.error ?? null,
        failure: detail.terminal?.failure ?? null,
        outcome: detail.status === "completed" ? outcomeOf(record) : null,
        plan: planOf(record),
        blocker: blockerOf(record, summary.pause),
        ...(summary.pause ? needsOf(records) : { needs: null, changes: null }),
        loop: existing.has(LESSONS),
    };
}

// Tracks main-agent activity and foundry-agentic-loop-workflow runs; long-poll clients wait on `version`.
export class Live {
    constructor({ session, workspace }) {
        this.session = session;
        this.workspace = workspace;
        this.version = 0;
        this.busy = false;
        this.busySince = null;
        this.runs = [];
        this.run = null;
        this.selectedRunId = null;
        this.error = null;
        this.lock = null;
        this.onNewRun = null;
        this.known = null;
        this.waiters = new Set();
        this.offs = [];
        this.history = new Map();
        this.last = "";
    }

    async start() {
        const listen = (type, handler) => {
            const off = this.session.on(type, event => { if (!event?.agentId) handler(event); });
            if (typeof off === "function") this.offs.push(off);
        };
        listen("user.message", () => this.setBusy(true));
        listen("assistant.turn_start", () => this.setBusy(true));
        // A finished turn may have written AGENTS.md or an artifact, so refresh as it ends.
        for (const type of ["session.idle", "session.error", "abort"]) listen(type, () => { this.setBusy(false); this.schedule(); });
        for (const type of ["workflow.run_updated", "workflow.run_started", "workflow.run_settled"]) {
            const off = this.session.on(type, () => this.schedule());
            if (typeof off === "function") this.offs.push(off);
        }
        this.interval = setInterval(() => this.reconcile(), 15_000);
        this.interval.unref?.();
        await this.reconcile();
    }

    stop() {
        for (const off of this.offs.splice(0)) off();
        clearInterval(this.interval);
        clearTimeout(this.timer);
        this.release();
    }

    get active() { return this.runs.some(run => run.status === "running" || run.status === "pending"); }

    snapshot() {
        return {
            version: this.version, busy: this.busy || this.active, busySince: this.busySince,
            runs: this.runs, run: this.run, selectedRunId: this.run?.runId ?? null, error: this.error, lock: this.lock,
        };
    }

    setBusy(value) {
        if (this.busy === value) return;
        this.busy = value;
        this.busySince = value ? Date.now() : null;
        this.bump();
    }

    bump() { this.version += 1; this.release(); }

    release() {
        for (const done of [...this.waiters]) done();
    }

    wait(version, { timeoutMs = 20_000, signal } = {}) {
        if (version !== this.version || signal?.aborted) return Promise.resolve();
        return new Promise(resolve => {
            const done = () => {
                clearTimeout(timer);
                signal?.removeEventListener("abort", done);
                this.waiters.delete(done);
                resolve();
            };
            const timer = setTimeout(done, timeoutMs);
            signal?.addEventListener("abort", done, { once: true });
            this.waiters.add(done);
        });
    }

    async reconcile() {
        try {
            const { processing } = await this.session.rpc.metadata.isProcessing();
            this.setBusy(Boolean(processing));
        } catch { /* Older runtimes do not report processing; rely on events. */ }
        await this.refresh();
    }

    schedule() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh(), 200);
        this.timer.unref?.();
    }

    select(runId) {
        if (!this.runs.some(run => run.runId === runId)) throw new Error("This workflow run is no longer available. Refresh the Build tab.");
        this.selectedRunId = runId;
        return this.refresh().then(() => this.snapshot());
    }

    // Loads into locals and commits only a complete read; a failure keeps the last good lock and runs and sets error.
    refresh() {
        if (this.refreshing) { this.again = true; return this.refreshing; }
        this.refreshing = (async () => {
            do {
                this.again = false;
                let fresh = null;
                try { fresh = this.commit(await this.load()); this.error = null; }
                catch (error) { this.error = error.message; }
                if (fresh) {
                    try { await this.onNewRun?.(fresh); }
                    catch { /* The mode override stays until the next new run; the run itself is shown. */ }
                }
            } while (this.again);
            const next = JSON.stringify([this.runs, this.run, this.error, this.lock]);
            if (next !== this.last) { this.last = next; this.bump(); }
        })().finally(() => { this.refreshing = null; });
        return this.refreshing;
    }

    // For actions that decide on the lock or runs: rejects instead of acting on stale or missing state.
    async refreshStrict() {
        await this.refresh();
        if (this.error) throw Object.assign(new Error(`Couldn't load the workspace state (AGENTS.md or workflow runs): ${this.error} Try again.`), { code: "live_unavailable" });
    }

    async load() {
        const lock = await this.readLock();
        const all = await this.session.workflow.listRuns();
        const runs = all.filter(run => run.workflowName === WORKFLOW).sort((a, b) => b.createdAt - a.createdAt);
        const fresh = this.known ? runs.find(run => !this.known.has(run.runId)) ?? null : null;
        const selectedRunId = fresh?.runId ?? this.selectedRunId;
        const selected = runs.find(run => run.runId === selectedRunId) ?? runs[0];
        let run = null;
        if (selected) {
            const detail = await this.session.workflow.getRunDetail(selected.runId);
            run = shapeRun(detail, await this.existing(), await this.records(selected.runId, detail.progress), await this.flightRecord(selected.runId));
        }
        return { lock, runs, fresh, selectedRunId, run };
    }

    commit({ lock, runs, fresh, selectedRunId, run }) {
        this.lock = lock;
        this.known = new Set(runs.map(row => row.runId));
        this.runs = runs.map(shapeSummary);
        this.selectedRunId = selectedRunId;
        this.run = run;
        return fresh;
    }

    // A missing AGENTS.md means no lock; any other failure must not read as "unlocked".
    async readLock() {
        try { return parseLock(await readFile(path.join(await this.workspace(), AGENTS), "utf8")); }
        catch (error) {
            if (error.code === "ENOENT") return null;
            throw new Error(`Cannot read AGENTS.md (${error.code ?? error.message}).`);
        }
    }

    async flightRecord(runId) {
        try { return JSON.parse(await readFile(path.join(await this.workspace(), ...flightRecordPath(runId).split("/")), "utf8")); }
        catch { return null; }
    }

    // Older progress records are immutable, so gate and brief lines beyond the detail tail are fetched once.
    // Only the selected run is cached, so switching runs releases the previous run's history.
    async records(runId, page) {
        for (const key of this.history.keys()) if (key !== runId) this.history.delete(key);
        const tail = page?.records ?? [];
        if (!page?.hasMoreOlder || !tail.length) return tail;
        const first = tail[0].seq;
        const cached = (this.history.get(runId) ?? []).filter(record => record.seq < first);
        const newest = cached.at(-1)?.seq ?? null;
        if (newest != null && newest >= first - 1) return [...cached, ...tail];
        const fetched = [];
        let cursor = first;
        for (let pages = 0; pages < 5; pages += 1) {
            const result = await this.session.workflow.getRunProgress(runId, { beforeSeq: cursor, limit: 200 });
            const rows = result.records ?? [];
            fetched.unshift(...rows.filter(record => newest == null || record.seq > newest));
            if (!result.hasMoreOlder || !rows.length || (newest != null && rows[0].seq <= newest + 1)) break;
            cursor = rows[0].seq;
        }
        const older = [...cached, ...fetched];
        this.history.set(runId, older);
        return [...older, ...tail];
    }

    async existing() {
        const root = await this.workspace();
        const found = new Set();
        await Promise.all(ARTIFACT_PATHS.map(async file => {
            try { if ((await stat(path.join(root, file))).isFile()) found.add(file); }
            catch { /* Missing artifacts are expected before their phase completes. */ }
        }));
        return found;
    }
}
