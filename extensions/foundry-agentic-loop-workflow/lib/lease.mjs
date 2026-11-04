import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { contained, readContained } from "./fsguard.mjs";
import { atomicWrite, clean } from "./record.mjs";

export const LEASE = ".agentic-loop/active-run.json";
export const LEASE_TTL_MS = 30 * 60 * 1000;
export const LOCK = ".agentic-loop/active-run.lock";
const LOCK_STALE_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;

async function readLease(cwd) {
    const current = await readContained(cwd, LEASE, 65_536);
    if (!current) return null;
    try {
        const value = JSON.parse(current.text);
        return typeof value?.runId === "string" && value.runId ? value : { invalid: true };
    } catch { return { invalid: true }; }
}

const fresh = (lease, at) => Date.parse(at) - Date.parse(lease.heartbeatAt) < LEASE_TTL_MS;

// Every read-check-write of the lease runs under this lock. mkdir() is atomic, so two runs taking over the same stale lease,
// or a takeover racing a heartbeat, cannot both write. The lock is held for milliseconds; an old one is left by a crash.
async function locked(cwd, fn, tries = 40) {
    await mkdir(path.dirname(await contained(cwd, LEASE)), { recursive: true });
    const dir = await contained(cwd, LOCK);
    for (let attempt = 1; ; attempt += 1) {
        try {
            await mkdir(dir);
            break;
        } catch (error) {
            if (error?.code !== "EEXIST") throw error;
            const info = await stat(dir).catch(() => null);
            if (info && Date.now() - info.mtimeMs > LOCK_STALE_MS) {
                throw new Error(`The workspace lease lock ${LOCK} is older than two minutes, so a run probably crashed while holding it. Delete the ${LOCK} folder, then start or resume the run again.`);
            }
            if (attempt >= tries) throw new Error(`Another Agentic Loop run is updating the workspace lease ${LEASE}. Try again in a moment.`);
            await delay(50);
        }
    }
    try { return await fn(); }
    finally { await rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

// One active run per workspace. A paused run releases its lease, and a resume of the same run takes it back.
export async function acquireLease(cwd, runId, { now, log }) {
    const lease = await locked(cwd, async () => {
        const at = now();
        const current = await readLease(cwd);
        if (current?.runId && current.runId !== runId && fresh(current, at)) {
            throw new Error(`Another Agentic Loop run, ${clean(current.runId, 120)}, is active in this workspace (last heartbeat ${clean(current.heartbeatAt, 40)}). `
                + `Wait for it or resume it instead of starting a second run. If it is no longer running, delete ${LEASE} (it also expires 30 minutes after its last heartbeat), then start again.`);
        }
        if (current?.invalid) log(`Workspace lease: replaced an unreadable ${LEASE}.`);
        else if (current && current.runId !== runId) log(clean(`Workspace lease: took over the stale lease of run ${current.runId} (last heartbeat ${current.heartbeatAt}).`, 300));
        const next = { runId, startedAt: current?.runId === runId && current.startedAt ? current.startedAt : at, heartbeatAt: at };
        await atomicWrite(await contained(cwd, LEASE), `${JSON.stringify(next, null, 2)}\n`);
        return next;
    });
    return new Lease(cwd, lease, now);
}

export class Lease {
    constructor(cwd, lease, now) {
        this.cwd = cwd;
        this.lease = lease;
        this.now = now;
        this.timer = setInterval(() => this.refresh().catch(() => {}), HEARTBEAT_MS);
        this.timer.unref?.();
    }

    // Called with every flight record write and on a timer, so a long subagent step keeps the lease fresh.
    async refresh() {
        if (this.released) return;
        await locked(this.cwd, async () => {
            // A heartbeat already waiting for the lock when release() won it must not write the lease back.
            if (this.released) return;
            const current = await readLease(this.cwd);
            if (current?.runId && current.runId !== this.lease.runId) {
                throw Object.assign(new Error(`the workspace lease ${LEASE} is now held by run ${clean(current.runId, 120)}, so this run stopped writing to avoid two runs in one workspace`), { code: "LEASE_LOST" });
            }
            this.lease = { ...this.lease, heartbeatAt: this.now() };
            await atomicWrite(await contained(this.cwd, LEASE), `${JSON.stringify(this.lease, null, 2)}\n`);
        });
    }

    async release() {
        this.released = true;
        clearInterval(this.timer);
        try {
            await locked(this.cwd, async () => {
                const current = await readLease(this.cwd);
                if (current?.runId === this.lease.runId) await rm(await contained(this.cwd, LEASE), { force: true });
            });
        } catch {
            // A lease that cannot be removed expires after LEASE_TTL_MS.
        }
    }
}
