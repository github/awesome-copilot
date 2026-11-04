import os from "node:os";
import path from "node:path";
import { lockWorkspace } from "./agents-md.mjs";
import { approvalChanges, fingerprint, specChanges, specFingerprint, takeWaivers, waiverFile } from "./approval.mjs";
import { PHASES, validateArgs } from "./args.mjs";
import { ContainmentError } from "./fsguard.mjs";
import { acquireLease } from "./lease.mjs";
import { ownershipCheck, snapshot } from "./ownership.mjs";
import { FOUNDATION_SCHEMA, REPORT_SCHEMA, TASKS, buildPrompt, label, retryPrompt } from "./prompts.mjs";
import { MAX_ITEMS, clean, createRecord, endpoints, missing, normalize, planWorkstreams, recordFile, reduce, sha256, union, writeRecord } from "./record.mjs";
import { latestRecord, rerunPlan } from "./rerun.mjs";
import { missingSkills, resolveSkills, skillDrift, skillProvenance } from "./skills.mjs";

// The run status names the last phase it ran: verified is the skipDeploy outcome, deployed the full loop.
const OUTCOMES = Object.freeze({ Specify: "specified", Implement: "implemented", Verify: "verified", Deploy: "deployed" });

export const MAX_ROUNDS = 20;

export async function workspace(session) {
    const snapshot = await session?.rpc?.metadata?.snapshot?.();
    if (!snapshot?.workingDirectory) throw new Error("The session has no working directory. Open a folder or repository in the session, then start a new run.");
    return path.resolve(snapshot.workingDirectory);
}

const count = (n, noun, plural = `${noun}s`) => `${n} ${n === 1 ? noun : plural}`;
const sentence = text => (/[.!?…]$/.test(text) ? text : `${text}.`);
const withNext = (head, next, max = 300) => (next ? `${sentence(clean(head, max - next.length - 2))} ${next}` : clean(head, max));

// Failed and blocked gates lead with their issues, because summaries often open with what passed.
export function gateLine({ phase, status, summary, issues }) {
    const detail = status === "passed" || !issues.length ? summary : `${count(issues.length, "issue")}: ${issues[0]} · ${summary}`;
    return clean(`${phase} gate: ${status} — ${detail}`, 300);
}

// One Chat line per report, ending with what runs next so a quiet chat never reads as stuck.
export function noteLine({ role, who, report }, next = "") {
    const { status, summary, issues } = report;
    const head = status === "passed" ? `${who} passed: ${summary}`
        : status === "blocked" ? `${who} blocked: ${summary}`
            : role === "review" ? `${who} found ${count(issues.length, "issue")}: ${issues[0] ?? summary}`
                : `${who} failed: ${summary}`;
    return withNext(head, next);
}

// After a worker the caller's next step always follows; otherwise a pass follows it and a failure gets an automatic fix while any remain.
export function nextStep({ role, report }, { onPass = "", fixes = 0, maxFixLoops = 0 } = {}) {
    if (role === "worker" || report.status === "passed") return onPass;
    return report.status === "failed" && fixes < maxFixLoops ? `Next: automatic fix ${fixes + 1} of ${maxFixLoops}.` : "";
}

// Chat lines for a checkpoint: what the run waits for and how to continue, then what resuming does.
// The final round's blocked checkpoint cannot retry, so it says so instead of promising another round.
export function checkpointLines(key, { phase, round, status, issues = [], fixes = 0, changes = [], waivers = "" } = {}) {
    if (key === "approve-spec-v1") {
        const since = changes.length ? `Since the last spec approval, these changed: ${changes.join(", ")}. ` : "";
        return {
            wait: clean(`Needs you: approve the spec. ${since}`, 300) + ' Review docs/spec.md and .azure/deployment-plan.md, then choose "Approve spec and continue" in the Foundry Agentic Loop canvas (Build tab) or tell Copilot "approve the spec". Nothing is provisioned until you approve.',
            resume: "Spec approved. Continuing with Implement.",
        };
    }
    if (/^approve-spec-r\d+-v1$/.test(key)) {
        return {
            wait: clean(`Needs you: approve the spec again. Since you approved it, these changed: ${changes.join(", ") || "the approved spec"}. Review docs/spec.md and .azure/deployment-plan.md, then resume the run from the Foundry Agentic Loop canvas (Build tab) or tell Copilot "approve the spec". Implement does not continue on a changed spec without your approval.`, 600),
            resume: "Spec approved again. Continuing Implement.",
        };
    }
    if (key === "approve-deploy-v1") {
        return {
            wait: 'Needs you: approve deployment. Review docs/verify.md and .azure/deployment-plan.md, then choose "Approve deployment" in the Foundry Agentic Loop canvas (Build tab) or tell Copilot "approve deployment". azd up adds billable Azure resources.',
            resume: "Deployment approved. Running Deploy.",
        };
    }
    if (/^approve-deploy-r\d+(?:-a\d+)?-v1$/.test(key)) {
        return {
            wait: clean(`Needs you: approve deployment again. Since you approved it, these changed: ${changes.join(", ") || "the approved plan"}. Review docs/verify.md and .azure/deployment-plan.md, then resume the run from the Foundry Agentic Loop canvas (Build tab) or tell Copilot "approve deployment". Deploy does not run on a changed plan without your approval.`, 600),
            resume: "Deployment approved again. Running Deploy.",
        };
    }
    const why = status === "blocked" ? `${phase} is blocked` : `${phase} still fails its gate${fixes ? ` after ${count(fixes, "automatic fix", "automatic fixes")}` : ""}`;
    const first = issues.length ? clean(issues[0], 140) : "";
    const cause = issues.length > 1 ? ` (${issues.length} issues; first: ${first})` : first ? ` (${first})` : "";
    if (round >= MAX_ROUNDS) {
        const rerun = phase === "Specify" ? "start a new run" : `start a new run, or rerun only this phase with from and to: "${phase}"`;
        return {
            wait: `Needs you: ${why}${cause}. That was round ${round} of ${MAX_ROUNDS}, so this run cannot retry ${phase}: fix the root cause from the gate issues, then ${rerun}.`,
            resume: `${phase} has no rounds left (${MAX_ROUNDS} of ${MAX_ROUNDS} used), so this run stops. Fix the root cause, then ${rerun}.`,
        };
    }
    const waive = waivers ? ` To accept an issue instead, write it with your reason to ${waivers} as [{"issue", "reason"}] before resuming.` : "";
    return {
        wait: `Needs you: ${why}${cause}. Ask Copilot to fix ${issues.length > 1 ? "them" : "it"}, or use "Fix in Chat" on the Build tab of the Foundry Agentic Loop canvas, then resume to retry ${phase}.${waive}`,
        resume: `Resumed: retrying ${phase} as round ${round + 1}.`,
    };
}

// The flight record is mandatory: each write is tried twice, and the lease heartbeat rides on it. A lost lease stops the run.
async function writeTwice(cwd, record, lease) {
    let failure;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await lease?.refresh();
            await writeRecord(cwd, record);
            return null;
        } catch (error) {
            if (error?.code === "LEASE_LOST") throw error;
            failure = error;
            if (error instanceof ContainmentError) break;
        }
    }
    return clean(failure?.message ?? failure, 300) || "unknown error";
}

// Maker, independent checker and bounded fixer per phase; every side effect is journaled so pauses and resumes replay exactly.
class Run {
    constructor(ctx, args, setup, now, lease) {
        this.ctx = ctx;
        this.args = args;
        this.now = now;
        this.lease = lease;
        this.cwd = setup.cwd;
        this.provenance = setup.provenance ?? null;
        this.base = { runId: ctx.runId, cwd: setup.cwd, record: recordFile(ctx.runId), skills: setup.skills, args };
        this.record = createRecord({ runId: ctx.runId, args, setup });
        this.synced = false;
    }

    write(record) {
        return writeTwice(this.cwd, record, this.lease);
    }

    // Replay rebuilds the record in memory without writing it, so the first live step of an attempt saves it;
    // otherwise a run resumed after a failure would keep showing "error" on disk until its next gate.
    async sync() {
        if (this.synced) return;
        const error = await this.write(this.record);
        if (error) this.ctx.log(`Flight record not saved: ${error}. Saving again at the next gate.`);
        this.synced = !error;
    }

    // Gates, checkpoints and other phase boundaries are events: when the record cannot be written, the run pauses instead of continuing.
    async event(key, make) {
        const event = await this.ctx.step(key, async () => {
            const event = await make(this.now());
            const error = await this.write(reduce(this.record, event));
            this.synced = !error;
            return error ? { ...event, recordError: error } : event;
        });
        this.record = reduce(this.record, event);
        if (event.recordError) await this.recordBlocked(key, event.recordError);
        return event;
    }

    async recordBlocked(key, error) {
        const file = path.join(this.cwd, ...recordFile(this.ctx.runId).split("/"));
        await this.ctx.step(`await-record-${key}`, () => {
            this.ctx.log(clean(`Needs you: the flight record could not be written to ${file} (${error}). The run does not continue without it: fix the cause (disk space, permissions or a link in .agentic-loop), then resume.`, 600));
            return true;
        });
        await this.ctx.pause(`blocked-record-${key}`);
        await this.ctx.step(`resume-record-${key}`, async () => {
            const retry = await this.write(this.record);
            if (retry) throw new Error(`The flight record still cannot be written to ${file} (${retry}). Fix the cause, then resume or start a new run.`);
            this.synced = true;
            this.ctx.log("Flight record saved. Continuing.");
            return true;
        });
    }

    // onResume adds what the human decided (waivers, the approval fingerprint) to the journaled resume event.
    async checkpoint(key, kind, context = {}, onResume = null) {
        const lines = checkpointLines(key, context);
        const pending = await this.event(`await-${key}`, at => {
            this.ctx.log(lines.wait);
            return { type: "pending", key, kind, at };
        });
        await this.ctx.pause(key);
        await this.event(`resume-${key}`, async at => {
            this.ctx.log(lines.resume);
            return { type: "resumed", key, kind, pausedAt: pending.at, at, ...(onResume && await onResume(pending, at)) };
        });
    }

    // The fingerprint binds the approval to the reviewed files and the azd target; Deploy re-asks when they change.
    approve = async () => {
        const print = await fingerprint(this.cwd, this.args);
        const target = Object.entries(print.target).filter(([, value]) => value).map(([key, value]) => `${key} ${value}`);
        const unset = Object.keys(print.target).filter(key => !print.target[key]);
        this.ctx.log(clean(`Approval recorded for ${target.join(", ") || "the planned target"}${unset.length ? ` (unset: ${unset.join(", ")})` : ""}; Deploy re-asks if the plan, spec, verification or target changes, including a value set after approval.`, 400));
        return { fingerprint: print };
    };

    // The spec fingerprint binds the approval to the reviewed spec and plan; a later rerun inherits it only while they match.
    approveSpec = async () => ({ specFingerprint: await specFingerprint(this.cwd) });

    // Checked live before each gated Implement round, so a resume never provisions on a spec or plan changed since approval.
    async confirmSpec(round) {
        const { changes } = await this.ctx.step(`spec-check-implement-r${round}-v1`, async () => {
            const inherited = this.record.phases.find(entry => entry.phase === "Specify" && entry.inheritedFrom)?.specApproval;
            const changes = specChanges(this.record.specApproval ?? inherited, await specFingerprint(this.cwd)).slice(0, MAX_ITEMS);
            if (changes.length) this.ctx.log(clean(`Spec approval no longer matches: ${changes.join(", ")} changed since approval.`, 300));
            return { changes };
        });
        if (changes.length) await this.checkpoint(`approve-spec-r${round}-v1`, "approve", { changes }, this.approveSpec);
    }

    // Checked before each Deploy round and after each Deploy attempt, so no step deploys, and no gate passes, on changed approved inputs.
    async confirmApproval(round, attempt = 0) {
        const at = `r${round}${attempt ? `-a${attempt}` : ""}`;
        const { changes } = await this.ctx.step(`approval-check-deploy-${at}-v1`, async () => {
            const changes = approvalChanges(this.record.deployApproval, await fingerprint(this.cwd, this.args)).slice(0, MAX_ITEMS);
            if (changes.length) this.ctx.log(clean(`Deploy approval no longer matches: ${changes.join(", ")} changed since approval.`, 300));
            return { changes };
        });
        if (changes.length) await this.checkpoint(`approve-deploy-${at}-v1`, "approve", { changes }, this.approve);
    }

    waive(key, issues) {
        return async (pending, at) => {
            const { waivers, ignored } = await takeWaivers(this.cwd, { runId: this.ctx.runId, key, pausedAt: pending.at, issues, at });
            if (waivers.length) this.ctx.log(clean(`Waivers recorded: ${waivers.map(row => row.issue).join("; ")}`, 300));
            if (ignored.length) this.ctx.log(clean(`Waivers ignored (not an open issue of ${key}, no reason, or not written during the pause): ${ignored.join("; ")}`, 300));
            return waivers.length ? { waivers } : {};
        };
    }

    // Skill files can change between attempts (an improve run, a plugin update); the record keeps each drift it saw.
    async checkDrift() {
        if (!this.provenance) return;
        const drift = skillDrift(this.provenance, await skillProvenance(this.base.skills)).slice(0, MAX_ITEMS);
        if (!drift.length) return;
        await this.event(`skill-drift-${sha256(JSON.stringify(drift)).slice(0, 12)}-v1`, at => {
            this.ctx.log(clean(`Skill drift since this run started: ${drift.map(row => `${row.skill}${row.file ? `/${row.file}` : ""} ${row.change}`).join("; ")}`, 300));
            return { type: "drift", drift, at };
        });
    }

    async inherit(rerun) {
        await this.event("inherit-v1", at => {
            for (const row of rerun.phases) this.ctx.log(gateLine({ phase: row.phase, status: "passed", summary: `Inherited from run ${rerun.runId}: ${row.summary}`, issues: [] }));
            this.ctx.log(clean(`Rerun from ${rerun.from}: earlier phases passed in ${rerun.file}.`, 300));
            return { type: "inherited", rerun, at };
        });
    }

    // Each report is journaled under its unique label, so a resume replays it, even a missing one, instead of rerunning the subagent.
    // A subagent that ends without a report, usually after a provider error, gets one retry that continues its work. A second miss
    // blocks, except for a workstream worker: integration receives it as a failed workstream and finishes it.
    async call({ phase, round, role, name = role, schema = REPORT_SCHEMA, ...context }) {
        const who = label(phase, name, round);
        const waivers = (this.record.waivers ?? []).filter(row => row.checkpoint.startsWith(`blocked-${phase.toLowerCase()}-`));
        const approval = phase === "Deploy" ? this.record.deployApproval : null;
        const prompt = buildPrompt({ base: this.base, phase, round, role, who, waivers, approval, ...context });
        const requireEvidence = phase === "Verify" || phase === "Deploy";
        const ask = (key, text, retry) => this.ctx.step(`report-${key}-v1`, async () => {
            await this.sync();
            if (retry) this.ctx.log(`${who} ended without a report, often after a provider error. Retrying it once.`);
            const result = await this.ctx.agent(text, { label: key, schema });
            if (result != null) return normalize(result, who, { requireEvidence });
            return retry ? missing(who, role) : null;
        });
        const report = await ask(who, prompt, false);
        if (report) return { role, who, report };
        return { role, who, report: await ask(`${who} · retry`, retryPrompt(prompt, who), true), retried: true };
    }

    async phase(phase) {
        let previous = null;
        for (let round = 1; round <= MAX_ROUNDS; round += 1) {
            if (phase === "Deploy") await this.confirmApproval(round);
            if (phase === "Implement" && this.args.autonomy === "gated") await this.confirmSpec(round);
            const entry = await this.gate(phase, round, await this.round(phase, round, previous));
            if (entry.status === "passed") return entry;
            const fixes = entry.attempts.filter(attempt => attempt.role === "fix").length;
            const key = `blocked-${phase.toLowerCase()}-r${round}`;
            const last = round >= MAX_ROUNDS;
            await this.checkpoint(key, "blocked", { phase, round, status: entry.status, issues: entry.issues, fixes, waivers: last ? "" : waiverFile(this.ctx.runId) }, last ? null : this.waive(key, entry.issues));
            previous = { status: entry.status, summary: entry.summary, issues: entry.issues };
        }
        throw new Error(`${phase} did not pass its gate in ${MAX_ROUNDS} rounds. Fix the root cause from the gate issues, then start a new run.`);
    }

    async round(phase, round, previous) {
        const attempts = [];
        const { maxFixLoops } = this.args;
        let fixes = 0;
        const track = async (attempt, onPass = "") => {
            attempts.push(attempt);
            await this.ctx.step(`note-${phase.toLowerCase()}-r${round}-${attempts.length}-v1`, () => {
                this.ctx.log(noteLine(attempt, nextStep(attempt, { onPass, fixes, maxFixLoops })));
                return true;
            });
            if (phase === "Deploy") await this.confirmApproval(round, attempts.length);
            return attempt.report;
        };
        const tasks = TASKS[phase];
        // Each review first re-checks the issues that were just addressed, so reviews converge instead of resampling.
        const review = (name, recheck) => this.call({ phase, round, role: "review", name, task: tasks.review, recheck });
        let verdict = await this.make(phase, round, previous, track);
        if (verdict.status === "passed") verdict = await track(await review("review", previous && { from: `the round ${round - 1} gate`, issues: previous.issues }));
        for (let fix = 1; verdict.status === "failed" && fix <= maxFixLoops; fix += 1) {
            fixes = fix;
            const { issues } = verdict;
            const fixed = await track(await this.call({ phase, round, role: "fix", name: `fix ${fix}`, task: tasks.fix, fix: { attempt: fix, max: maxFixLoops, issues } }), `Next: review ${fix + 1}.`);
            verdict = fixed.status === "passed" ? await track(await review(`review ${fix + 1}`, { from: `fix ${fix}`, issues })) : fixed;
        }
        return { verdict, attempts };
    }

    async make(phase, round, previous, track) {
        const tasks = TASKS[phase];
        const review = "Next: independent review.";
        if (phase !== "Implement" || round > 1) return track(await this.call({ phase, round, role: "lead", task: tasks.lead, previous }), review);
        const foundation = await track(await this.call({ phase, round, role: "lead", name: "foundation", task: tasks.foundation, schema: FOUNDATION_SCHEMA }), "Next: workstream plan.");
        if (foundation.status !== "passed") return foundation;
        const plan = await this.ctx.step(`plan-implement-r${round}-v1`, () => {
            const plan = planWorkstreams(foundation.workstreams);
            this.ctx.log(plan.mode === "parallel"
                ? clean(`Implement plan: ${plan.items.length} parallel workstreams (${plan.items.map(item => item.name).join(", ")})`, 300)
                : clean(`Implement plan: sequential build (${plan.reason})`, 300));
            return plan;
        });
        if (plan.mode !== "parallel") return track(await this.call({ phase, round, role: "lead", name: "build", task: tasks.build }), review);
        const before = await this.ctx.step(`snapshot-implement-r${round}-v1`, async () => (await snapshot(this.cwd)) ?? { unavailable: true });
        const workers = await this.ctx.parallel(plan.items.map(workstream => () =>
            this.call({ phase, round, role: "worker", name: workstream.name, task: tasks.worker, workstream })));
        const results = [];
        for (const [index, workstream] of plan.items.entries()) {
            const who = label(phase, workstream.name, round);
            const last = index === plan.items.length - 1;
            const report = await track(workers[index] ?? { role: "worker", who, report: normalize(null, who) }, last ? "Next: integration." : "");
            results.push({ name: workstream.name, status: report.status, summary: report.summary, issues: report.issues, lessons: report.lessons });
        }
        // Ownership is checked against git, not trusted from reports: anything changed outside every workstream goes to integration.
        const { unowned } = await this.event(`ownership-implement-r${round}-v1`, async at => {
            const check = ownershipCheck(before.unavailable ? null : before, before.unavailable ? null : await snapshot(this.cwd), plan.items);
            this.ctx.log(clean(!check.checked ? `Workstream ownership not checked: ${check.reason}.`
                : check.unowned.length ? `Workstream ownership: ${count(check.total, "changed path")} outside every workstream: ${check.unowned.join(", ")}. Integration resolves them.`
                    : "Workstream ownership: every changed path belongs to its workstream.", 300));
            return { type: "ownership", phase, round, checked: check.checked, unowned: check.unowned, at };
        });
        return track(await this.call({ phase, round, role: "lead", name: "integration", task: tasks.integration, results, unowned }), review);
    }

    async gate(phase, round, { verdict, attempts }) {
        const reports = attempts.map(attempt => attempt.report);
        const { entry } = await this.event(`gate-${phase.toLowerCase()}-r${round}-v1`, async at => {
            const entry = {
                phase,
                round,
                status: verdict.status,
                summary: verdict.summary,
                at,
                // A rerun inherits this gate only while the spec and plan still match what it passed on.
                inputs: (await specFingerprint(this.cwd)).files,
                attempts: attempts.map(({ role, who, report, retried }) => ({ role, label: who, status: report.status, summary: report.summary, issues: report.issues, ...(retried && { retried }) })),
                issues: verdict.issues,
                evidence: verdict.evidence ?? [],
                lessons: union(reports.map(report => report.lessons)),
                assumptions: union(reports.map(report => report.assumptions)),
                artifacts: union(reports.map(report => report.artifacts), 300),
                endpoints: endpoints(reports.flatMap(report => report.endpoints).reverse()),
            };
            this.ctx.log(gateLine(entry));
            return { type: "gate", at, entry };
        });
        return entry;
    }

    async skip(phase) {
        await this.event(`skip-${phase.toLowerCase()}-v1`, at => {
            const reason = this.args.skipDeploy ? "skipDeploy is set" : `to is ${this.args.to}`;
            this.ctx.log(`${phase} skipped: ${reason}, so the run ends after ${this.args.to}.`);
            return { type: "skipped", phase, summary: this.args.skipDeploy ? "skipDeploy was set." : `to was ${this.args.to}.`, at };
        });
    }

    async finish() {
        const status = OUTCOMES[this.args.to];
        const passed = this.record.phases.filter(entry => entry.status === "passed");
        const outcome = {
            status,
            runId: this.ctx.runId,
            phases: Object.fromEntries(PHASES.map(phase => [phase, passed.some(entry => entry.phase === phase) ? "passed" : "skipped"])),
            rounds: Object.fromEntries(PHASES.map(phase => [phase, this.record.phases.filter(entry => entry.phase === phase && entry.round > 0).length])),
            endpoints: this.record.endpoints,
            flightRecord: recordFile(this.ctx.runId),
        };
        await this.event("result-v1", at => {
            const links = outcome.endpoints.length ? ` Endpoints: ${outcome.endpoints.map(row => `${row.name} ${row.url}`).join(", ")}.` : "";
            this.ctx.log(clean(`Agentic Loop ${status}.${links} Flight record: ${outcome.flightRecord}`, 600));
            return { type: "done", status, outcome, at };
        });
        return outcome;
    }

    async fail(error) {
        const message = clean(error?.message ?? error, 500) || "Unknown error";
        try {
            const failure = await this.write(reduce(this.record, { type: "error", message, at: this.now() }));
            if (failure) this.ctx.log(`Flight record not saved: ${failure}`);
        } catch (caught) { this.ctx.log(`Flight record not saved: ${clean(caught?.message ?? caught, 300)}`); }
    }
}

export async function runLoop(ctx, { extensionDir, home = os.homedir(), now = () => new Date().toISOString() }) {
    const args = validateArgs(ctx.args);
    const log = line => ctx.log(line);
    let lease = null;
    try {
        const setup = await ctx.step("setup-v1", async () => {
            const cwd = await workspace(ctx.session);
            const skills = await resolveSkills({ cwd, extensionDir, home });
            const startedAt = now();
            ctx.log(`Brief: ${args.brief.split(/\r?\n/).map(line => clean(line, 160)).find(Boolean) ?? ""}`);
            lease = await acquireLease(cwd, ctx.runId, { now, log });
            const rerun = args.from === PHASES[0] ? null : rerunPlan(await latestRecord(cwd, ctx.runId), args.from, await specFingerprint(cwd));
            const absent = missingSkills(skills);
            if (absent.length) ctx.log(`Skills not found on disk, so subagents load them with the skill tool: ${absent.join(", ")}`);
            if (await lockWorkspace(cwd, skills.router.dir) === "written") ctx.log("AGENTS.md: added the Agentic Loop SDD section, which locks this workspace to SDD and routes commands such as deploy.");
            const provenance = await skillProvenance(skills);
            const error = await writeTwice(cwd, createRecord({ runId: ctx.runId, args, setup: { skills, startedAt, provenance } }));
            if (error) throw new Error(`The flight record could not be written to ${path.join(cwd, ...recordFile(ctx.runId).split("/"))} (${error}). Fix the cause, then start a new run.`);
            return { cwd, skills, startedAt, provenance, rerun };
        });
        lease ??= await acquireLease(setup.cwd, ctx.runId, { now, log });
        const run = new Run(ctx, args, setup, now, lease);
        try {
            await run.checkDrift();
            if (setup.rerun) await run.inherit(setup.rerun);
            const last = PHASES.indexOf(args.to);
            for (const phase of PHASES.slice(PHASES.indexOf(args.from))) {
                if (PHASES.indexOf(phase) > last) {
                    await run.skip(phase);
                    continue;
                }
                ctx.phase(phase);
                if (phase === "Deploy") await run.checkpoint("approve-deploy-v1", "approve", {}, run.approve);
                // Implement provisions, so a gated rerun asks for the spec approval first unless an approval still matches the spec and plan.
                if (phase === "Implement" && args.autonomy === "gated" && setup.rerun?.from === "Implement" && !setup.rerun.specApproved) await run.checkpoint("approve-spec-v1", "approve", { changes: setup.rerun.specChanges ?? [] }, run.approveSpec);
                await run.phase(phase);
                // The spec approval gates provisioning, so a run that ends at Specify does not pause for it.
                if (phase === "Specify" && args.autonomy === "gated" && args.to !== "Specify") await run.checkpoint("approve-spec-v1", "approve", {}, run.approveSpec);
            }
            return await run.finish();
        } catch (error) {
            // Pauses and cancellation abort cooperatively; record only genuine failures, and always rethrow.
            if (error?.name !== "AbortError") await run.fail(error);
            throw error;
        }
    } finally {
        // A paused, failed or finished run frees the workspace; resuming takes the lease back.
        await lease?.release();
    }
}
