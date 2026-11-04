import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { WORKFLOW } from "./args.mjs";
import { contained } from "./fsguard.mjs";

export const MAX_ITEMS = 20;
export const MAX_EVIDENCE = 12;

const STATUSES = ["passed", "failed", "blocked"];
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "uv.lock", "poetry.lock"];
// Workspace paths that stay with the phase lead (folders end in /). Workers never own them, so the prompts and planWorkstreams share this list.
export const SHARED = Object.freeze(["azure.yaml", "infra/", "docs/", ".env", ".azure/", ".agentic-loop/", "AGENTS.md", ...LOCKFILES]);
export const SHARED_PHRASE = `${SHARED.filter(item => !LOCKFILES.includes(item)).join(", ")} and the root lockfiles`;
const RESERVED = /^(?:lead|foundation|build|integration|review(?: \d+)?|fix(?: \d+)?)$/i;

export const sha256 = value => createHash("sha256").update(value).digest("hex");

export function clean(value, max = 500) {
    const line = String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function strings(value, max = 500, limit = MAX_ITEMS) {
    return Array.isArray(value) ? [...new Set(value.map(item => clean(item, max)).filter(Boolean))].slice(0, limit) : [];
}

export function endpoints(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.flatMap(row => {
        let url;
        try { url = new URL(clean(row?.url, 2048)); }
        catch { return []; }
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || seen.has(url.href)) return [];
        seen.add(url.href);
        return [{ name: clean(row?.name, 80) || url.host, url: url.href }];
    }).slice(0, MAX_ITEMS);
}

// Structured gate evidence: {claim, source, result} items, bounded like every other report field.
export function evidence(value) {
    if (!Array.isArray(value)) return [];
    return value.flatMap(row => {
        const claim = clean(row?.claim, 200);
        return claim ? [{ claim, source: clean(row?.source, 300), result: clean(row?.result, 200) }] : [];
    }).slice(0, MAX_EVIDENCE);
}

// Subagent output is untrusted: coerce it to a bounded, single-line report and fail closed. A pass that still lists issues,
// or a Verify or Deploy pass (requireEvidence) without evidence items, counts as failed.
export function normalize(result, who, { requireEvidence = false } = {}) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
        return { status: "failed", summary: `${who} returned no report.`, issues: [`${who} returned no usable report; rerun the step and inspect its subagent log.`], lessons: [], artifacts: [], assumptions: [], endpoints: [], evidence: [], workstreams: [] };
    }
    let status = STATUSES.includes(result.status) ? result.status : "failed";
    const issues = strings(result.issues);
    const proof = evidence(result.evidence);
    let summary = clean(result.summary, 300) || `${who} ${status}.`;
    if (status === "passed" && issues.length) {
        status = "failed";
        summary = clean(`Reported passed with ${issues.length} open ${issues.length === 1 ? "issue" : "issues"}, so it counts as failed: ${summary}`, 300);
    } else if (status === "passed" && requireEvidence && !proof.length) {
        status = "failed";
        issues.push(`${who} reported passed without evidence items: rerun the gate checks and report each as {claim, source, result}.`);
        summary = clean(`Reported passed without evidence, so it counts as failed: ${summary}`, 300);
    }
    if (status !== "passed" && !issues.length) issues.push(`${who} reported ${status} without listing issues; re-check the gate and record the evidence.`);
    return {
        status,
        summary,
        issues,
        lessons: strings(result.lessons),
        artifacts: strings(result.artifacts, 300),
        assumptions: strings(result.assumptions),
        endpoints: endpoints(result.endpoints),
        evidence: proof,
        workstreams: Array.isArray(result.workstreams) ? result.workstreams : [],
    };
}

// A step that ended twice without a report most likely hit a provider error. A workstream worker fails, so integration finishes
// its work; any other step blocks, so a human checks the session log before fix loops spend more.
export function missing(who, role) {
    const report = { ...normalize(null, who), summary: "No report after one retry, likely a provider error." };
    if (role === "worker") return { ...report, issues: [`${who} ended twice without a report, likely a provider error: finish this workstream from the current workspace.`] };
    return { ...report, status: "blocked", issues: [`${who} ended twice without a report, likely a provider error: check the session log, then resume.`] };
}

// Static path prefix of a workspace-relative file or glob; null for an absolute path or one that escapes the workspace.
export function scope(file) {
    const value = String(file ?? "").trim().replace(/\\/g, "/");
    if (/^(?:[a-z]:)?\//i.test(value)) return null;
    const parts = [];
    for (const part of value.split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") return null;
        if (/[*?[\]{}]/.test(part)) break;
        parts.push(part);
    }
    return parts.join("/");
}

// Case-insensitive, because macOS and Windows file systems usually are.
function overlaps(a, b) {
    const [x, y] = [a.toLowerCase(), b.toLowerCase()];
    return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

const SHARED_SCOPES = SHARED.map(scope);
const single = reason => ({ mode: "single", items: [], reason });

// Parallel workers need two to four workstreams with disjoint, non-shared file ownership; otherwise build in sequence.
export function planWorkstreams(list) {
    if (!Array.isArray(list) || list.length < 2) return single(list?.length === 1 ? "one workstream" : "no workstreams planned");
    if (list.length > 4) return single(`${list.length} workstreams exceed the limit of four`);
    const items = [];
    for (const raw of list) {
        let name = clean(raw?.name, 40).replace(/·/g, "-");
        if (!name) return single("a workstream has no name");
        if (RESERVED.test(name)) name = `ws ${name}`;
        if (items.some(item => item.name.toLowerCase() === name.toLowerCase())) return single(`duplicate workstream "${name}"`);
        const files = strings(raw?.files, 300, 30);
        if (!files.length) return single(`workstream "${name}" owns no files`);
        const scopes = files.map(scope);
        if (scopes.some(value => !value)) return single(`workstream "${name}" claims the whole workspace, an absolute path or a path outside it`);
        const shared = scopes.find(value => SHARED_SCOPES.some(owned => overlaps(value, owned)));
        if (shared) return single(`workstream "${name}" claims shared path ${shared}`);
        for (const other of items) {
            const clash = scopes.find(value => other.scopes.some(owned => overlaps(value, owned)));
            if (clash) return single(`workstreams "${other.name}" and "${name}" both claim ${clash}`);
        }
        items.push({ name, goal: clean(raw?.goal, 500) || `Build ${name}.`, files, checks: strings(raw?.checks, 300, 10), scopes });
    }
    return { mode: "parallel", items: items.map(({ scopes, ...item }) => item), reason: null };
}

// Safe IDs map to themselves; any other ID keeps a readable prefix plus a hash, so distinct IDs never share a file.
// The canvas (foundry-agentic-loop-canvas/lib/live.mjs) applies the same rule; the contract pin test keeps them in sync.
const SAFE_ID = /^[A-Za-z0-9._-]{1,120}$/;
export function runFile(runId) {
    const id = String(runId);
    return `${SAFE_ID.test(id) ? id : `${id.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100)}-${sha256(id).slice(0, 8)}`}.json`;
}

export function recordFile(runId) {
    return path.posix.join(".agentic-loop", "runs", runFile(runId));
}

export function union(lists, max = 500) {
    return strings(lists.flat(), max);
}

export function createRecord({ runId, args, setup }) {
    return {
        schema: 1,
        workflow: WORKFLOW,
        runId,
        status: "running",
        pending: null,
        startedAt: setup.startedAt,
        updatedAt: setup.startedAt,
        completedAt: null,
        brief: args.brief,
        scenarioId: args.scenarioId,
        target: { subscriptionId: args.subscriptionId, location: args.location ?? "auto", environmentName: args.environmentName },
        autonomy: args.autonomy,
        maxFixLoops: args.maxFixLoops,
        skipDeploy: args.skipDeploy,
        to: args.to,
        skills: Object.fromEntries(Object.values(setup.skills).map(skill => [skill.name, skill.source])),
        skillProvenance: setup.provenance ?? null,
        skillDrift: [],
        rerun: null,
        phases: [],
        checkpoints: [],
        waivers: [],
        specApproval: null,
        deployApproval: null,
        ownership: [],
        endpoints: [],
        outcome: null,
        error: null,
    };
}

// Pure fold over journaled events: a resumed attempt replays the same events and rebuilds the same record.
export function reduce(record, event) {
    const next = { ...record, updatedAt: event.at };
    switch (event.type) {
        case "gate":
            next.phases = [...record.phases, event.entry];
            next.endpoints = endpoints([...event.entry.endpoints, ...record.endpoints]);
            break;
        case "skipped":
            next.phases = [...record.phases, { phase: event.phase, round: 0, status: "skipped", summary: event.summary, at: event.at }];
            break;
        case "pending":
            next.status = event.kind === "approve" ? "awaiting-approval" : "blocked";
            next.pending = event.key;
            break;
        case "resumed":
            next.status = "running";
            next.pending = null;
            next.checkpoints = [...record.checkpoints, { key: event.key, kind: event.kind, pausedAt: event.pausedAt, resumedAt: event.at, ...(event.fingerprint && { fingerprint: event.fingerprint }), ...(event.specFingerprint && { specFingerprint: event.specFingerprint }) }];
            if (event.waivers?.length) next.waivers = [...(record.waivers ?? []), ...event.waivers].slice(-MAX_ITEMS);
            if (event.fingerprint) next.deployApproval = { key: event.key, approvedAt: event.at, ...event.fingerprint };
            if (event.specFingerprint) next.specApproval = { key: event.key, approvedAt: event.at, ...event.specFingerprint };
            break;
        case "inherited":
            next.rerun = { from: event.rerun.from, runId: event.rerun.runId };
            next.phases = [...record.phases, ...event.rerun.phases.map(row => ({ ...row, round: 0, status: "passed", inheritedFrom: event.rerun.runId, attempts: [], issues: [], lessons: [], assumptions: [], artifacts: [], endpoints: [], evidence: [] }))];
            break;
        case "drift":
            next.skillDrift = [...(record.skillDrift ?? []), ...event.drift.map(row => ({ ...row, at: event.at }))].slice(-MAX_ITEMS);
            break;
        case "ownership":
            next.ownership = [...(record.ownership ?? []), { phase: event.phase, round: event.round, checked: event.checked, unowned: event.unowned, at: event.at }];
            break;
        case "done":
            next.status = event.status;
            next.completedAt = event.at;
            next.outcome = event.outcome;
            break;
        case "error":
            next.status = "error";
            next.error = event.message;
            break;
        default:
            throw new Error(`Unknown flight record event: ${event.type}`);
    }
    return next;
}

// Readers never see a partial file: write a unique temp file, rename it over the target and remove it if either step fails.
export async function atomicWrite(file, text) {
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
        await writeFile(temp, text, "utf8");
        await rename(temp, file);
    } catch (error) {
        await rm(temp, { force: true }).catch(() => {});
        throw error;
    }
}

// Checked before and after creating the folders, so neither .agentic-loop, runs nor the record can be a link out of the workspace.
export async function writeContained(cwd, rel, text) {
    await mkdir(path.dirname(await contained(cwd, rel)), { recursive: true });
    const file = await contained(cwd, rel);
    await atomicWrite(file, text);
    return file;
}

export async function writeRecord(cwd, record) {
    return writeContained(cwd, recordFile(record.runId), `${JSON.stringify(record, null, 2)}\n`);
}
