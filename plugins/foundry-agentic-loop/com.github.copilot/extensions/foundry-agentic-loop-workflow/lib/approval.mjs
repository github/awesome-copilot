import { rm } from "node:fs/promises";
import { contained, readContained } from "./fsguard.mjs";
import { MAX_ITEMS, clean, runFile, sha256, strings } from "./record.mjs";

// What the approve-deploy checkpoints ask the human to review; Deploy re-asks when any of them changes after approval.
export const APPROVED_FILES = Object.freeze([".azure/deployment-plan.md", "docs/spec.md", "docs/verify.md"]);
// The azd target, including the Foundry account, project and resource group that the scaffold may place in their own group.
export const TARGET_KEYS = Object.freeze({
    environmentName: "AZURE_ENV_NAME",
    subscriptionId: "AZURE_SUBSCRIPTION_ID",
    location: "AZURE_LOCATION",
    resourceGroup: "AZURE_RESOURCE_GROUP",
    foundryResourceGroup: "AZURE_FOUNDRY_RESOURCE_GROUP",
    aiAccountName: "AZURE_AI_ACCOUNT_NAME",
    aiProjectName: "AZURE_AI_PROJECT_NAME",
});
const PATTERNS = Object.freeze({
    environmentName: /^[a-zA-Z][a-zA-Z0-9-]{1,63}$/,
    subscriptionId: /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,
    location: /^[a-z][a-z0-9]{2,30}$/,
    resourceGroup: /^[\w.()-]{1,90}$/,
    foundryResourceGroup: /^[\w.()-]{1,90}$/,
    aiAccountName: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,63}$/,
    aiProjectName: /^[a-zA-Z0-9][\w.-]{1,63}$/,
});

const valid = (key, value) => (typeof value === "string" && PATTERNS[key].test(value.trim()) ? value.trim() : null);

async function hashFile(cwd, rel) {
    try {
        const file = await readContained(cwd, rel, 4_194_304);
        return file ? sha256(file.text) : null;
    } catch (error) { return `unreadable: ${clean(error?.message ?? error, 120)}`; }
}

async function readText(cwd, rel) {
    try { return (await readContained(cwd, rel, 262_144))?.text ?? null; }
    catch { return null; }
}

// Only the target keys are read from the azd environment; other values, including secrets, are never parsed or kept.
export async function azdTarget(cwd) {
    let environment = null;
    try { environment = valid("environmentName", JSON.parse(await readText(cwd, ".azure/config.json") ?? "null")?.defaultEnvironment); }
    catch { environment = null; }
    const target = { ...Object.fromEntries(Object.keys(TARGET_KEYS).map(key => [key, null])), environmentName: environment };
    const env = environment ? await readText(cwd, `.azure/${environment}/.env`) : null;
    for (const line of env?.split(/\r?\n/) ?? []) {
        const match = /^\s*(AZURE_[A-Z_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/.exec(line);
        const key = match && Object.keys(TARGET_KEYS).find(name => TARGET_KEYS[name] === match[1]);
        if (key) target[key] = valid(key, match[2]) ?? target[key];
    }
    return target;
}

// A missing file or one that cannot be hashed never matches, so approval stops until the file exists with a real digest.
const fileChange = (rel, before, after) => {
    if (after == null) return `${rel} (missing: add it, then approve again)`;
    if (after.startsWith("unreadable")) return `${rel} (cannot be read: fix it, then approve again)`;
    return before === after ? null : rel;
};

export async function fingerprint(cwd, args) {
    const files = {};
    for (const rel of APPROVED_FILES) files[rel] = await hashFile(cwd, rel);
    const azd = await azdTarget(cwd);
    const fallback = { environmentName: args.environmentName, subscriptionId: args.subscriptionId, location: args.location };
    const target = Object.fromEntries(Object.keys(TARGET_KEYS).map(key => [key, azd[key] ?? valid(key, fallback[key]) ?? null]));
    return { files, target };
}

// Changes since the approval; a run without a recorded approval fingerprint fails closed and asks again.
export function approvalChanges(approved, current) {
    if (!approved?.files || !approved?.target) return ["no approval fingerprint is recorded"];
    const changes = [];
    for (const rel of APPROVED_FILES) {
        const change = fileChange(rel, approved.files[rel], current.files[rel]);
        if (change) changes.push(change);
    }
    // Unset → set is a change too: a target value first chosen after approval was never reviewed.
    for (const key of Object.keys(TARGET_KEYS)) {
        const before = approved.target[key] ?? null;
        const after = current.target[key] ?? null;
        if (before !== after) changes.push(`${TARGET_KEYS[key]} (${before ?? "unset"} → ${after ?? "unset"})`);
    }
    return changes;
}

// What the approve-spec checkpoint asks the human to review; a rerun inherits that approval only while both are unchanged.
export const SPEC_FILES = Object.freeze([".azure/deployment-plan.md", "docs/spec.md"]);

export async function specFingerprint(cwd) {
    const files = {};
    for (const rel of SPEC_FILES) files[rel] = await hashFile(cwd, rel);
    return { files };
}

export function specChanges(approved, current) {
    if (!approved?.files) return ["no spec approval fingerprint is recorded"];
    return SPEC_FILES.map(rel => fileChange(rel, approved.files[rel], current?.files?.[rel])).filter(Boolean);
}

export function waiverFile(runId) {
    return `.agentic-loop/waivers/${runFile(runId)}`;
}

// Waivers count only when a human records them during a blocked checkpoint: the file must be written after the pause and each
// waiver must name an issue of that checkpoint's gate. Subagents never run while a run is paused, so they cannot pre-approve.
export async function takeWaivers(cwd, { runId, key, pausedAt, issues, at }) {
    const rel = waiverFile(runId);
    let file;
    try { file = await readContained(cwd, rel, 65_536); }
    catch (error) { return { waivers: [], ignored: [`${rel}: ${clean(error?.message ?? error, 200)}`] }; }
    if (!file) return { waivers: [], ignored: [] };
    await rm(await contained(cwd, rel), { force: true }).catch(() => {});
    if (file.mtimeMs < Date.parse(pausedAt)) return { waivers: [], ignored: [`${rel} was written before ${key} paused`] };
    let rows;
    try {
        const value = JSON.parse(file.text);
        rows = Array.isArray(value) ? value : value?.waivers;
    } catch { rows = null; }
    if (!Array.isArray(rows)) return { waivers: [], ignored: [`${rel} is not a JSON list of {issue, reason}`] };
    const open = new Set(strings(issues));
    const waivers = [];
    const ignored = [];
    for (const row of rows.slice(0, MAX_ITEMS)) {
        const issue = clean(row?.issue, 500);
        const reason = clean(row?.reason, 300);
        if (open.has(issue) && reason) waivers.push({ issue, reason, approvedAt: at, checkpoint: key });
        else ignored.push(clean(issue || "(no issue)", 120));
    }
    return { waivers, ignored };
}
