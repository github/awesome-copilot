import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PHASES, WORKFLOW } from "./args.mjs";
import { contained } from "./fsguard.mjs";
import { SPEC_FILES, specChanges } from "./approval.mjs";
import { clean } from "./record.mjs";

const MAX_FILES = 500;
const MAX_BYTES = 2 * 1024 * 1024;

// The newest flight record of this workflow in the workspace, other than the current run. Any record that cannot be
// inspected safely (a link, oversized, unparsable, or more files than the scan limit) refuses the rerun rather than
// risk inheriting gates from an older run while a newer one failed.
export async function latestRecord(cwd, excludeRunId) {
    const folder = await contained(cwd, ".agentic-loop/runs");
    let names;
    try { names = (await readdir(folder)).filter(name => name.endsWith(".json")); }
    catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
    }
    if (names.length > MAX_FILES) throw new Error(`.agentic-loop/runs holds ${names.length} flight records, more than the ${MAX_FILES} a rerun checks, so the latest run cannot be identified safely. Move older records out of that folder, or run the full loop.`);
    let latest = null;
    for (const name of names) {
        const file = path.join(folder, name);
        const refuse = reason => new Error(`.agentic-loop/runs/${name} ${reason}, so the latest run cannot be identified safely. Fix or move that record, or run the full loop.`);
        const info = await lstat(file);
        if (!info.isFile()) throw refuse("is not a regular file");
        if (info.size > MAX_BYTES) throw refuse(`is larger than ${MAX_BYTES / 1024 / 1024} MiB`);
        let record;
        try { record = JSON.parse(await readFile(file, "utf8")); }
        catch { throw refuse("is not valid JSON"); }
        if (record?.workflow !== WORKFLOW || record.runId === excludeRunId || !Array.isArray(record.phases)) continue;
        const at = Date.parse(record.startedAt ?? record.updatedAt) || 0;
        if (!latest || at > latest.at) latest = { at, record, file: `.agentic-loop/runs/${name}` };
    }
    return latest;
}

// The spec approval recorded in that run, or carried by the Specify phase it inherited; a record without a fingerprint has none.
function specApprovalOf(record) {
    const inherited = [...record.phases].reverse().find(entry => entry?.phase === "Specify" && entry.status === "passed")?.specApproval;
    const approval = record.specApproval?.files ? record.specApproval : inherited?.files ? inherited : null;
    if (!approval) return null;
    const files = Object.fromEntries(SPEC_FILES.map(rel => [rel, typeof approval.files[rel] === "string" ? clean(approval.files[rel], 200) : null]));
    return { approvedAt: clean(approval.approvedAt, 40), files };
}

// The spec and plan hashes a gate passed on; a gate without them never counts as covering the current spec.
function inputsOf(pass) {
    const files = pass?.inputs;
    if (!files || typeof files !== "object") return null;
    return Object.fromEntries(SPEC_FILES.map(rel => [rel, typeof files[rel] === "string" ? clean(files[rel], 200) : null]));
}

// A rerun from a phase inherits the earlier phases only when the latest run passed every one of them, and every inherited
// Implement or Verify gate passed on the current spec and plan. A changed spec is re-approved before Implement instead.
// specApproved says whether a human approved this spec: an approval recorded in the latest run, or carried from the run it
// inherited Specify from, whose fingerprint still matches docs/spec.md and .azure/deployment-plan.md. Reviewer acceptance does not count.
export function rerunPlan(latest, from, current) {
    const index = PHASES.indexOf(from);
    if (index <= 0) return null;
    const earlier = PHASES.slice(0, index);
    const refuse = reason => new Error(`Cannot start at ${from}: ${reason} Run the full loop, or fix the earlier phases first.`);
    if (!latest) throw refuse("this workspace has no earlier Agentic Loop flight record in .agentic-loop/runs.");
    const { record } = latest;
    const runId = clean(record.runId, 120);
    const phases = [];
    for (const phase of earlier) {
        const pass = [...record.phases].reverse().find(entry => entry?.phase === phase && entry.status === "passed");
        if (!pass) throw refuse(`the latest run, ${runId}, has no passed ${phase} gate.`);
        const inputs = inputsOf(pass);
        if (phase !== PHASES[0]) {
            const stale = inputs ? specChanges({ files: inputs }, current) : ["the spec and plan it passed on were not recorded"];
            if (stale.length) throw new Error(`Cannot start at ${from}: the ${phase} gate of run ${runId} no longer covers the current spec and plan (${stale.join(", ")}). Start at ${phase} instead, or run the full loop.`);
        }
        phases.push({ phase, summary: clean(pass.summary, 300), at: clean(pass.at, 40), ...(inputs && { inputs }), ...(pass.inheritedFrom && { originalRun: clean(pass.inheritedFrom, 120) }) });
    }
    const approval = specApprovalOf(record);
    const changes = approval ? specChanges(approval, current) : [];
    const specApproved = Boolean(approval) && !changes.length;
    phases[0] = { ...phases[0], specApproved, ...(specApproved && { specApproval: approval }) };
    return { from, runId, file: latest.file, phases, specApproved, ...(changes.length && { specChanges: changes }) };
}
