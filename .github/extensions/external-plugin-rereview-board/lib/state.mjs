import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { digest, REPO, issueNumber } from "./report.mjs";

export const COLUMNS = [
    { id: "unreviewed", label: "Unreviewed" },
    { id: "in-review", label: "In review", readOnly: true },
    { id: "keep", label: "Keep" },
    { id: "needs-changes", label: "Needs changes" },
    { id: "remove", label: "Remove" },
];
const decision = (value) => COLUMNS.some((column) => column.id === value && !column.readOnly);
export const fingerprint = (item) => digest({
    name: item.name, repo: item.repo, version: item.version, closedDate: item.closedDate,
    status: item.status, evidence: item.evidence.hash,
});

export class BoardStore {
    constructor(file) {
        this.file = file;
        this.state = { version: 1, snapshotSequence: 0, selected: null, reports: {} };
        this.listeners = new Set();
        this.chain = Promise.resolve();
    }
    async load() {
        try {
            const saved = JSON.parse(await readFile(this.file, "utf8"));
            if (saved.version !== 1 || !saved.reports || Array.isArray(saved.reports) ||
                !Number.isSafeInteger(saved.snapshotSequence) || saved.snapshotSequence < 0) {
                throw new Error("Invalid re-review board state; preserve the file before repairing it.");
            }
            this.state = saved;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }
    mutate(work) {
        const operation = this.chain.then(async () => {
            const next = structuredClone(this.state);
            const result = work(next);
            next.snapshotSequence++;
            if (!Number.isSafeInteger(next.snapshotSequence)) throw new Error("Board snapshot sequence exhausted.");
            await mkdir(path.dirname(this.file), { recursive: true });
            const temporary = `${this.file}.${randomUUID()}.tmp`;
            await writeFile(temporary, JSON.stringify(next, null, 2), "utf8");
            await rename(temporary, this.file);
            this.state = next;
            for (const listener of this.listeners) listener(this.snapshot());
            return result ?? this.snapshot();
        });
        this.chain = operation.catch(() => {});
        return operation;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    report(number, state = this.state) {
        const report = state.reports[issueNumber(number)];
        if (!report) throw new Error("Import the report first.");
        return report;
    }
    item(number, id, state = this.state) {
        const item = this.report(number, state).items.find((entry) => entry.id === issueNumber(id));
        if (!item) throw new Error("Submission not found in this report.");
        return item;
    }
    snapshot({ agent = false } = {}) {
        const items = (this.state.reports[this.state.selected]?.items ?? []).map((item) => ({
            ...item, publication: this.publication(item.id, this.state, item.evidence.issue.closedAt) ?? null,
        }));
        return structuredClone({
            repo: REPO, selected: this.state.selected, columns: COLUMNS, snapshotSequence: this.state.snapshotSequence,
            reports: Object.values(this.state.reports).map(({ number, title, url }) => ({ number, title, url })),
            items: agent ? items.map(({ note, reason, ...item }) => item) : items,
        });
    }
    import({ issue, items }) {
        return this.mutate((state) => {
            const old = state.reports[issue.number];
            const next = items.map((source) => {
                const previous = old?.items.find((item) => item.id === source.id);
                const same = previous?.fingerprint === fingerprint(source);
                const renewed = previous?.publication?.status === "posted" &&
                    previous.publication.cycle !== source.evidence.issue.closedAt;
                return {
                    ...source, fingerprint: fingerprint(source), removed: false,
                    column: same ? previous.column : "unreviewed",
                    note: previous?.note ?? "", reason: previous?.reason ?? "",
                    review: same ? previous.review : null, queueId: same ? previous.queueId : null,
                    agentId: same ? previous.agentId : null, reviewError: same ? previous.reviewError : null,
                    publication: renewed ? null : previous?.publication ?? null,
                    history: [...(previous?.history ?? []), ...(renewed ? [previous.publication] : [])],
                    revision: same && !previous.removed ? previous.revision : randomUUID(),
                    changed: Boolean(previous && !same),
                };
            });
            for (const previous of old?.items ?? []) {
                if (!next.some((item) => item.id === previous.id)) {
                    next.push({ ...previous, removed: true, queueId: null, revision: randomUUID() });
                }
            }
            state.reports[issue.number] = {
                number: issue.number, title: issue.title, url: issue.html_url,
                sourceHash: digest(issue.body), items: next,
            };
            state.selected = issue.number;
        });
    }
    select(number) {
        return this.mutate((state) => { this.report(number, state); state.selected = number; });
    }
    publication(id, state = this.state, cycle) {
        return Object.values(state.reports).flatMap((report) => report.items)
            .filter((item) => item.id === id && item.publication &&
                (item.publication.status === "unconfirmed" || !cycle || item.publication.cycle === cycle))
            .map((item) => item.publication).sort((a, b) => b.at.localeCompare(a.at))[0];
    }
    editable(item, state = this.state) {
        if (item.removed || this.publication(item.id, state, item.evidence.issue.closedAt)) throw new Error("This submission is removed or has a posted/unconfirmed command. Reconcile or inspect GitHub.");
    }
    update(number, id, changes) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            this.editable(item, state);
            if (changes.expectedRevision !== item.revision) throw new Error("Local triage changed. Reopen the card before saving.");
            if (!decision(changes.column) || typeof changes.note !== "string" || changes.note.length > 8000 ||
                typeof changes.reason !== "string" || changes.reason.length > 8000 || /^\s*\//m.test(changes.reason)) {
                throw new Error("Provide a valid decision and notes/reason (up to 8000 characters, no slash-command lines).");
            }
            Object.assign(item, {
                column: changes.column, note: changes.note, reason: changes.reason,
                queueId: null, agentId: null, revision: randomUUID(),
            });
        });
    }
    queue(number, id) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            this.editable(item, state);
            if (item.evidence.reasons.length || item.queueId) throw new Error("This submission is blocked or already queued.");
            item.queueId = randomUUID();
            item.agentId = null;
            item.reviewError = null;
            return structuredClone(item);
        });
    }
    attachAgent(number, id, queueId, agentId) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            if (item.queueId === queueId) item.agentId = agentId;
        });
    }
    finish(number, id, queueId, result) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            if (!queueId || item.queueId !== queueId) throw new Error("Stale review result; the submission changed or the review was cancelled.");
            if (result.error) {
                if (typeof result.error !== "string" || result.error.length > 4000) throw new Error("Invalid review error.");
                item.reviewError = result.error;
            } else {
                if (!decision(result.recommendation) || result.recommendation === "unreviewed" ||
                    typeof result.rationale !== "string" || !result.rationale.trim() || result.rationale.length > 16000) {
                    throw new Error("Provide a recommendation and evidence-based rationale.");
                }
                item.review = { recommendation: result.recommendation, rationale: result.rationale, at: new Date().toISOString() };
            }
            item.queueId = null;
        });
    }
    cancel(number, id) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            item.queueId = null;
            item.reviewError = "Cancelled locally; an already running read-only worker is not stopped. Late results are rejected.";
        });
    }
}
