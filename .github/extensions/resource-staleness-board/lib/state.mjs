import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const RECOMMENDATIONS = ["keep", "refresh", "remove"];
export const WORK_KINDS = ["review", "prepare-refresh", "prepare-removal", "publish"];

function startWork(item, kind) {
    if (item.pending) throw new Error(`Resource ${item.id} already has pending work. Cancel it before retrying.`);
    item.pending = { token: randomUUID(), kind, fingerprint: item.fingerprint, at: new Date().toISOString() };
    item.error = null;
    return structuredClone(item);
}

export class BoardStore {
    constructor(file, root) {
        this.file = file;
        this.root = root;
        this.state = { version: 1, root, items: [], updatedAt: null, warning: null };
        this.listeners = new Set();
        this.pending = Promise.resolve();
        this.progress = null;
    }

    async load() {
        try {
            const state = JSON.parse(await readFile(this.file, "utf8"));
            if (state.version !== 1 || state.root !== this.root || !Array.isArray(state.items)) {
                throw new Error("Staleness board state has an unsupported version or repository.");
            }
            this.state = state;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }

    snapshot() {
        const state = structuredClone(this.state);
        const counts = { stale: 0, aging: 0, fresh: 0, unknown: 0 };
        for (const item of state.items) counts[item.ageBand]++;
        return { ...state, counts, progress: this.progress };
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit() {
        for (const listener of this.listeners) listener(this.snapshot());
    }

    transaction(change) {
        const run = async () => {
            await mkdir(path.dirname(this.file), { recursive: true });
            let lock;
            for (let attempt = 0; !lock && attempt < 50; attempt++) {
                try {
                    lock = await open(`${this.file}.lock`, "wx");
                } catch (error) {
                    if (error.code !== "EEXIST") throw error;
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
            if (!lock) throw new Error(`State is locked by another writer: ${this.file}.lock. Inspect that process before removing a stale lock.`);
            let result;
            try {
                await lock.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
                await this.load();
                const state = structuredClone(this.state);
                result = change(state);
                const temporary = `${this.file}.${randomUUID()}.tmp`;
                try {
                    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx" });
                    await rename(temporary, this.file);
                } catch (error) {
                    try { await unlink(temporary); } catch (cleanupError) {
                        if (cleanupError.code !== "ENOENT") throw new AggregateError([error, cleanupError], "State write and cleanup failed.");
                    }
                    throw error;
                }
                this.state = state;
            } finally {
                await lock.close();
                await unlink(`${this.file}.lock`);
            }
            this.emit();
            return result;
        };
        const operation = this.pending.then(run, run);
        this.pending = operation;
        return operation;
    }

    item(id, state = this.state) {
        const item = state.items.find((entry) => entry.id === id);
        if (!item) throw new Error(`Resource not on this board: ${id}. Scan first.`);
        return item;
    }

    async sync({ items, warning }) {
        await this.transaction((state) => {
            state.items = items.map((item) => {
                const previous = state.items.find((entry) => entry.id === item.id);
                const same = previous?.fingerprint === item.fingerprint;
                return {
                    ...item, childSessionId: previous?.childSessionId ?? null,
                    review: same ? previous.review : null,
                    prepared: same ? previous.prepared : null,
                    publication: previous?.publication ?? null,
                    pending: same ? previous.pending : null,
                    error: same ? previous.error : previous ? "Content changed; review and prepared changes were invalidated." : null,
                };
            });
            state.updatedAt = new Date().toISOString();
            state.warning = warning;
        });
        return this.snapshot();
    }

    async queue(id, kind, confirmed, diffHash, observedFingerprint) {
        return this.transaction((state) => {
            if (!WORK_KINDS.includes(kind)) throw new Error("Unknown work kind.");
            const item = this.item(id, state);
            if (observedFingerprint !== undefined &&
                (item.fingerprint !== observedFingerprint || (item.pending && item.pending.fingerprint !== observedFingerprint))) {
                throw new Error("The resource changed since it was observed. Scan again before requesting work.");
            }
            if (kind.startsWith("prepare-") && !item.review) throw new Error("Review this resource before preparing changes.");
            if (kind === "publish" && (confirmed !== true || !item.prepared || !item.childSessionId ||
                item.publication || item.prepared.diffHash !== diffHash)) {
                throw new Error("Publishing requires explicit confirmation, a child session, and unpublished prepared changes.");
            }
            return startWork(item, kind);
        });
    }

    async queueReviews(ids, observedFingerprints) {
        if (!Array.isArray(ids) || !ids.length || ids.some((id) => typeof id !== "string" || !id.trim()) ||
            new Set(ids).size !== ids.length) {
            throw new Error("Choose one or more unique resource IDs for batch review.");
        }
        return this.transaction((state) => ids.map((id) => {
            const item = this.item(id, state);
            const observed = observedFingerprints?.get?.(id);
            if (observed !== undefined &&
                (item.fingerprint !== observed || (item.pending && item.pending.fingerprint !== observed))) {
                throw new Error(`Resource changed since it was observed: ${id}. Scan again before requesting work.`);
            }
            return startWork(item, "review");
        }));
    }

    async cancelReviews(items, message) {
        await this.transaction((state) => {
            for (const request of items) {
                const item = state.items.find((entry) => entry.id === request.id);
                if (item?.pending?.token === request.pending.token) {
                    item.pending = null;
                    item.error = message;
                }
            }
        });
    }

    check(id, token, state) {
        const item = this.item(id, state);
        if (!item.pending || item.pending.token !== token || item.pending.fingerprint !== item.fingerprint) {
            throw new Error("Stale work token. The resource changed or this request was cancelled.");
        }
        return item;
    }

    async recordSession(id, token, childSessionId) {
        if (typeof childSessionId !== "string" || !childSessionId.trim()) throw new Error("A child session ID is required.");
        await this.transaction((state) => {
            const item = this.check(id, token, state);
            if (item.childSessionId && item.childSessionId !== childSessionId) {
                throw new Error("Reuse the existing child session; replacing its context is not allowed.");
            }
            item.childSessionId = childSessionId;
        });
        return this.snapshot();
    }

    async result(input, observedFingerprint) {
        await this.transaction((state) => {
            const current = this.item(input.id, state);
            if (observedFingerprint !== undefined && observedFingerprint !== null &&
                (current.fingerprint !== observedFingerprint ||
                    (current.pending && current.pending.fingerprint !== observedFingerprint))) {
                throw new Error("The resource changed since it was observed. Scan again before recording work.");
            }
            const item = this.check(input.id, input.token, state);
            if (input.error) {
                item.error = input.error;
                item.pending = null;
                return;
            }
            if (!item.childSessionId) throw new Error("Record the child session before recording its result.");
            if (item.pending.kind === "review") {
                const review = input.review;
                if (!review || !RECOMMENDATIONS.includes(review.recommendation) || !review.rationale?.trim() ||
                    !review.improvements?.trim() || !review.capabilityEvidence?.trim() || !review.stalenessAssessment?.trim()) {
                    throw new Error("Review needs a recommendation, rationale, improvements, capability evidence, and staleness assessment.");
                }
                item.review = { ...review, at: new Date().toISOString() };
            } else if (item.pending.kind === "publish") {
                let url;
                try {
                    url = new URL(input.url);
                } catch {
                    throw new Error("Expected a canonical HTTPS GitHub pull request URL for github/awesome-copilot.");
                }
                if (url.origin !== "https://github.com" || url.username || url.password ||
                    !/^\/github\/awesome-copilot\/pull\/[1-9]\d*$/.test(url.pathname) || url.search || url.hash) {
                    throw new Error("Expected a canonical HTTPS GitHub pull request URL for github/awesome-copilot.");
                }
                item.publication = { url: url.href, at: new Date().toISOString() };
            } else {
                if (!input.summary?.trim() || !/^[a-f0-9]{64}$/.test(input.diffHash ?? "") ||
                    !/^[a-f0-9]{40,64}$/.test(input.baseSha ?? "")) {
                    throw new Error("Prepared changes need a diff summary, SHA-256 staged diff hash, and base commit SHA.");
                }
                item.prepared = {
                    kind: item.pending.kind, summary: input.summary, diffHash: input.diffHash,
                    baseSha: input.baseSha, at: new Date().toISOString(),
                };
                item.publication = null;
            }
            item.pending = null;
        });
        return this.snapshot();
    }

    async cancel(id, token, message = "Cancelled locally. The child may still be running; its result will be rejected.") {
        await this.transaction((state) => {
            const item = this.check(id, token, state);
            item.pending = null;
            item.error = message;
        });
        return this.snapshot();
    }
}
