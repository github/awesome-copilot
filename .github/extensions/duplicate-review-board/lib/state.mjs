import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { digest, parseReport } from "./report.mjs";

export const COLUMNS = [
    { id: "unreviewed", label: "Unreviewed" },
    { id: "separate", label: "Keep separate" },
    { id: "consolidate", label: "Consolidate" },
    { id: "deferred", label: "Needs insight" },
];
export const REPO = "github/awesome-copilot";

export class BoardStore {
    constructor(file) {
        this.file = file;
        this.state = { version: 1, snapshotSequence: 0, reports: {}, selected: null };
        this.listeners = new Set();
        this.chain = Promise.resolve();
    }

    async load() {
        try {
            const state = JSON.parse(await readFile(this.file, "utf8"));
            if (state.version !== 1 || !state.reports || typeof state.reports !== "object") {
                throw new Error("Unsupported duplicate board state. Preserve the file before repairing it.");
            }
            if (!Object.hasOwn(state, "snapshotSequence")) state.snapshotSequence = 0;
            if (!Number.isSafeInteger(state.snapshotSequence) || state.snapshotSequence < 0) {
                throw new Error("Invalid duplicate board snapshot sequence. Preserve the file before repairing it.");
            }
            this.state = state;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }

    // Commit an isolated copy, then notify views only after the atomic write succeeds.
    mutate(fn) {
        const operation = this.chain.then(async () => {
            const next = structuredClone(this.state);
            const result = await fn(next);
            if (next.snapshotSequence >= Number.MAX_SAFE_INTEGER) throw new Error("Duplicate board snapshot sequence is exhausted.");
            next.snapshotSequence++;
            await mkdir(path.dirname(this.file), { recursive: true });
            const tmp = `${this.file}.${randomUUID()}.tmp`;
            await writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
            await rename(tmp, this.file);
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

    report(number = this.state.selected, state = this.state) {
        if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid report issue number.");
        const report = state.reports[number];
        if (!report) throw new Error("Import a duplicate-review report first.");
        return report;
    }

    item(number, id, state = this.state) {
        if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) throw new Error("Invalid group ID.");
        const item = this.report(number, state).items.find((entry) => entry.id === id);
        if (!item) throw new Error("Group not found. Refresh the report.");
        return item;
    }

    consolidationPublication(id, state = this.state) {
        return Object.values(state.reports).flatMap((report) => report.items)
            .find((item) => item.id === id && item.publication?.kind === "consolidate")?.publication;
    }

    snapshot() {
        const report = this.state.reports[this.state.selected];
        return structuredClone({
            repo: REPO, columns: COLUMNS, selected: this.state.selected, snapshotSequence: this.state.snapshotSequence,
            reports: Object.values(this.state.reports).map(({ number, title, url, state, importedAt }) => ({
                number, title, url, state, importedAt,
            })).sort((a, b) => b.number - a.number),
            items: report?.items ?? [],
        });
    }

    import(issue) {
        const parsed = parseReport(issue.body);
        return this.mutate((state) => {
            const old = state.reports[issue.number];
            const items = parsed.map((group) => {
                const previous = old?.items.find((item) => item.id === group.id);
                const same = previous?.fingerprint === group.fingerprint;
                const unchanged = same && previous.accepted === group.accepted && !previous.removed;
                const { checkboxOffset, ...source } = group;
                return {
                    ...source,
                    removed: false,
                    column: same && !(group.accepted && !previous.accepted) ? previous.column : group.accepted ? "separate" : "unreviewed",
                    note: previous?.note ?? "",
                    review: same ? previous.review : null,
                    queueId: same ? previous.queueId : null,
                    agentId: same ? previous.agentId : null,
                    reviewError: same ? previous.reviewError : null,
                    changed: Boolean(previous && !same),
                    revision: unchanged ? previous.revision : randomUUID(),
                    publication: previous?.publication ?? null,
                    draft: previous?.draft ?? {
                        title: `Consolidate duplicate resources: ${group.title}`.slice(0, 256),
                        body: `Source report: ${issue.html_url}\n\n## Resources\n\n${group.resources.map((resource) => `- \`${resource.path}\``).join("\n")}\n\n## Why flagged\n\n${group.reason}\n\n## Proposed resolution\n\n`,
                    },
                };
            });
            for (const previous of old?.items ?? []) {
                if (previous.publication && !items.some((item) => item.id === previous.id)) {
                    items.push({ ...previous, removed: true, queueId: null, revision: previous.removed ? previous.revision : randomUUID() });
                }
            }
            state.reports[issue.number] = {
                number: issue.number, title: issue.title, url: issue.html_url, state: issue.state,
                body: issue.body, sourceHash: digest(issue.body), importedAt: new Date().toISOString(), items,
            };
            state.selected = issue.number;
        });
    }

    select(number) {
        return this.mutate((state) => { this.report(number, state); state.selected = number; });
    }

    update(number, id, changes) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            if (typeof changes.expectedRevision !== "string" || changes.expectedRevision !== item.revision) {
                throw new Error("Local triage changed. Refresh the group before saving again.");
            }
            if (item.removed) throw new Error("This group was removed from the report; only publication recovery is available.");
            if (item.publication) throw new Error("This group has a recorded or unresolved publication.");
            if (!COLUMNS.some((column) => column.id === changes.column)) throw new Error("Unknown triage column.");
            if (typeof changes.note !== "string" || changes.note.length > 8000 ||
                typeof changes.draft?.title !== "string" || !changes.draft.title.trim() || changes.draft.title.length > 256 ||
                typeof changes.draft?.body !== "string" || changes.draft.body.length > 24000) {
                throw new Error("Provide a note and a valid tracking-issue title/body.");
            }
            Object.assign(item, { column: changes.column, note: changes.note, draft: changes.draft, queueId: null, revision: randomUUID() });
        });
    }

    queue(number, id) {
        return this.mutate((state) => {
            const item = this.item(number, id, state);
            if (item.removed) throw new Error("This group was removed from the report; only publication recovery is available.");
            if (item.publication || item.queueId) throw new Error("This group is already queued or published.");
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
            if (!queueId || item.queueId !== queueId) throw new Error("Stale review result; the group changed or was cancelled.");
            if (result.error) {
                item.reviewError = result.error;
            } else {
                if (!["separate", "consolidate", "deferred"].includes(result.recommendation) ||
                    typeof result.rationale !== "string" || !result.rationale.trim() || result.rationale.length > 16000) {
                    throw new Error("A review needs a valid recommendation and evidence-based rationale.");
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
            item.reviewError = "Review cancelled locally. Late results will be rejected.";
        });
    }
}
