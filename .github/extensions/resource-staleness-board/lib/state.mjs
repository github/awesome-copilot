import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const RECOMMENDATIONS = ["keep", "refresh", "remove"];
export const WORK_KINDS = ["review", "prepare-refresh", "prepare-removal", "publish"];
export const DEFAULT_CANVAS_PAGE_SIZE = 20;
export const MAX_CANVAS_PAGE_SIZE = 50;

export function validateCanvasReadInput(action, input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Canvas action input must be an object.");
    }
    const allowed = action === "get_board" ? ["offset", "limit"] : ["id"];
    if (Object.keys(input).some((key) => !allowed.includes(key))) throw new Error("Unexpected canvas action input.");

    const requireInteger = (value, name, maximum = Number.MAX_SAFE_INTEGER) => {
        if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new Error(`${name} must be a valid non-negative integer.`);
    };
    if (action === "get_board") {
        if (input.offset !== undefined) requireInteger(input.offset, "offset");
        if (input.limit !== undefined) {
            requireInteger(input.limit, "limit", MAX_CANVAS_PAGE_SIZE);
            if (input.limit < 1) throw new Error(`limit must be between 1 and ${MAX_CANVAS_PAGE_SIZE}.`);
        }
    } else if (typeof input.id !== "string" || !input.id.trim()) {
        throw new Error("id must be a non-empty string.");
    }
    return input;
}

export function canvasDiagnostic(value, level = "error") {
    if (value === null || value === undefined || value === "") return null;
    return level === "warning"
        ? "Warning recorded; inspect the HTTP dashboard for details."
        : "Error recorded; inspect the HTTP dashboard for details.";
}

export function canvasBoardPage(snapshot, { offset = 0, limit = DEFAULT_CANVAS_PAGE_SIZE } = {}) {
    validateCanvasReadInput("get_board", { offset, limit });
    const total = snapshot.items.length;
    const items = snapshot.items.slice(offset, offset + limit).map((item) => ({
        id: item.id,
        type: item.type,
        fingerprint: item.fingerprint,
        age: item.age,
        ageBand: item.ageBand,
        lastChange: item.lastChange ? { sha: item.lastChange.sha, date: item.lastChange.date } : null,
        recommendation: item.review?.recommendation ?? null,
        pending: item.pending ? { kind: item.pending.kind, at: item.pending.at } : null,
        error: canvasDiagnostic(item.error),
    }));
    return {
        counts: snapshot.counts,
        total,
        updatedAt: snapshot.updatedAt,
        ...(snapshot.warning ? { warning: canvasDiagnostic(snapshot.warning, "warning") } : {}),
        ...(snapshot.progress ? { progress: { completed: snapshot.progress.completed, total: snapshot.progress.total } } : {}),
        ...(snapshot.syncError ? { syncError: canvasDiagnostic(snapshot.syncError) } : {}),
        page: { offset, limit, nextOffset: offset + items.length < total ? offset + items.length : null },
        items,
    };
}

export function canvasItemDetail(snapshot, id) {
    validateCanvasReadInput("get_item", { id });
    const item = snapshot.items.find((entry) => entry.id === id);
    if (!item) throw new Error(`Resource not on this board: ${id}. Scan first.`);
    return {
        item: {
            id: item.id,
            type: item.type,
            files: [...item.files],
            fingerprint: item.fingerprint,
            age: item.age,
            ageBand: item.ageBand,
            lastChange: item.lastChange ? { sha: item.lastChange.sha, date: item.lastChange.date } : null,
            recommendation: item.review?.recommendation ?? null,
            ...(item.review?.at ? { reviewedAt: item.review.at } : {}),
            childSessionId: item.childSessionId ?? null,
            pending: item.pending ? {
                token: item.pending.token, kind: item.pending.kind,
                fingerprint: item.pending.fingerprint, at: item.pending.at,
            } : null,
            prepared: item.prepared ? {
                kind: item.prepared.kind, diffHash: item.prepared.diffHash,
                baseSha: item.prepared.baseSha, at: item.prepared.at,
            } : null,
            publication: item.publication ? {
                url: item.publication.url, at: item.publication.at,
            } : null,
            error: canvasDiagnostic(item.error),
        },
    };
}

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
        this.state = {
            version: 1, root, items: [], updatedAt: null, warning: null,
            scanGeneration: 0, scanRequestGeneration: 0,
        };
        this.listeners = new Set();
        this.pending = Promise.resolve();
        this.progress = null;
        this.diskContents = null;
        this.syncError = null;
        this.transactionActive = false;
        this.localRevision = 0;
        this.pollTimer = null;
        this.polling = null;
        this.notificationPending = false;
    }

    async load({ notify = true, force = false } = {}) {
        if (this.transactionActive && !force) return this;
        const revision = this.localRevision;
        try {
            const contents = await readFile(this.file, "utf8");
            const state = JSON.parse(contents);
            if (state.version !== 1 || state.root !== this.root || !Array.isArray(state.items)) {
                throw new Error("Staleness board state has an unsupported version or repository.");
            }
            state.scanGeneration ??= 0;
            state.scanRequestGeneration ??= state.scanGeneration;
            if (!Number.isSafeInteger(state.scanGeneration) || state.scanGeneration < 0 ||
                !Number.isSafeInteger(state.scanRequestGeneration) || state.scanRequestGeneration < state.scanGeneration) {
                throw new Error("Staleness board state has invalid scan generations.");
            }
            if ((this.transactionActive && !force) || revision !== this.localRevision) return this;
            const changed = contents !== this.diskContents;
            const recovered = this.syncError !== null;
            this.state = state;
            this.diskContents = contents;
            this.syncError = null;
            if (changed || recovered) {
                if (notify && !this.transactionActive) this.emit();
                else this.notificationPending = true;
            }
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }

    snapshot() {
        const state = structuredClone(this.state);
        const counts = { stale: 0, aging: 0, fresh: 0, unknown: 0 };
        for (const item of state.items) counts[item.ageBand]++;
        delete state.scanRequestGeneration;
        return { ...state, counts, progress: this.progress, ...(this.syncError ? { syncError: this.syncError } : {}) };
    }

    async beginScan() {
        return this.transaction((state) => {
            state.scanRequestGeneration = Math.max(state.scanRequestGeneration, state.scanGeneration) + 1;
            return state.scanRequestGeneration;
        });
    }

    subscribe(listener) {
        this.listeners.add(listener);
        if (!this.pollTimer) {
            this.pollTimer = setInterval(() => {
                if (!this.polling) {
                    this.polling = this.refreshFromDisk().catch((error) => {
                        const message = `Unable to reload shared board state: ${error.message}`;
                        if (message !== this.syncError) {
                            this.syncError = message;
                            this.emit();
                        }
                    }).finally(() => { this.polling = null; });
                }
            }, 250);
            this.pollTimer.unref?.();
        }
        let subscribed = true;
        return () => {
            if (!subscribed) return;
            subscribed = false;
            this.listeners.delete(listener);
            if (this.listeners.size === 0 && this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        };
    }

    emit() {
        for (const listener of this.listeners) listener(this.snapshot());
    }

    async refreshFromDisk() {
        const revision = this.localRevision;
        if (this.transactionActive) return;
        let contents;
        try {
            contents = await readFile(this.file, "utf8");
        } catch (error) {
            if (error.code === "ENOENT" && this.diskContents === null) return;
            if (error.code === "ENOENT") throw new Error("The shared board state file disappeared.");
            throw error;
        }
        if (this.transactionActive || revision !== this.localRevision) return;
        if (contents === this.diskContents) {
            if (this.syncError) {
                this.syncError = null;
                this.emit();
            }
            return;
        }
        const state = JSON.parse(contents);
        if (state.version !== 1 || state.root !== this.root || !Array.isArray(state.items)) {
            throw new Error("Shared board state has an unsupported version or repository.");
        }
        this.state = state;
        this.diskContents = contents;
        this.syncError = null;
        this.emit();
    }

    transaction(change) {
        const run = async () => {
            this.transactionActive = true;
            try {
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
                    await this.load({ notify: false, force: true });
                    const state = structuredClone(this.state);
                    result = change(state);
                    const contents = `${JSON.stringify(state, null, 2)}\n`;
                    const temporary = `${this.file}.${randomUUID()}.tmp`;
                    try {
                        await writeFile(temporary, contents, { flag: "wx" });
                        await rename(temporary, this.file);
                    } catch (error) {
                        try { await unlink(temporary); } catch (cleanupError) {
                            if (cleanupError.code !== "ENOENT") throw new AggregateError([error, cleanupError], "State write and cleanup failed.");
                        }
                        throw error;
                    }
                    this.state = state;
                    this.diskContents = contents;
                    this.syncError = null;
                    this.localRevision++;
                    this.notificationPending = false;
                } finally {
                    await lock.close();
                    await unlink(`${this.file}.lock`);
                }
                this.emit();
                return result;
            } finally {
                this.transactionActive = false;
                if (this.notificationPending) {
                    this.notificationPending = false;
                    this.emit();
                }
            }
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

    async sync({ items, warning, generation }) {
        await this.transaction((state) => {
            const acceptedGeneration = generation ?? state.scanRequestGeneration + 1;
            if (!Number.isSafeInteger(acceptedGeneration) || acceptedGeneration <= 0) {
                throw new Error("Scan generation must be a positive safe integer.");
            }
            if (acceptedGeneration !== state.scanRequestGeneration && generation !== undefined) return false;
            if (generation === undefined) state.scanRequestGeneration = acceptedGeneration;
            state.items = items.map((item) => {
                const previous = state.items.find((entry) => entry.id === item.id);
                const same = previous?.fingerprint === item.fingerprint;
                return {
                    ...item, childSessionId: previous?.childSessionId ?? null,
                    review: same ? previous.review : null,
                    prepared: same ? previous.prepared : null,
                    publication: previous?.publication ?? null,
                    pending: same ? previous.pending : null,
                    error: !same && (previous?.review || previous?.prepared || previous?.pending)
                        ? "Content changed; review and prepared changes were invalidated."
                        : previous?.error ?? null,
                };
            });
            state.updatedAt = new Date().toISOString();
            state.warning = warning;
            state.scanGeneration = acceptedGeneration;
            return true;
        });
        return this.snapshot();
    }

    async queue(id, kind, confirmed, diffHash, observedFingerprint) {
        return this.transaction((state) => {
            if (!WORK_KINDS.includes(kind)) throw new Error("Unknown work kind.");
            const item = this.item(id, state);
            if (item.publication) throw new Error("This child has published its prepared work; follow-up work is disabled to preserve its committed baseline.");
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
            if (item.publication) throw new Error(`This child has published its prepared work; follow-up work is disabled to preserve its committed baseline: ${id}.`);
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
