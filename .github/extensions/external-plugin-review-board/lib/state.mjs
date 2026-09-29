import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

export const RECOMMENDATIONS = ["straight-reject", "probably-reject", "needs-review", "accept"];

export const COLUMNS = [
    { id: "unreviewed", title: "Unreviewed", droppable: true },
    { id: "reviewing", title: "Reviewing", droppable: false },
    { id: "straight-reject", title: "Straight reject", droppable: true },
    { id: "probably-reject", title: "Probably reject", droppable: true },
    { id: "needs-review", title: "Needs review", droppable: true },
    { id: "accept", title: "Accept", droppable: true },
    { id: "actioned", title: "Actioned", droppable: false },
];

const HISTORY_LIMIT = 200;

function newQueueId() {
    return randomBytes(6).toString("base64url");
}

function emptyState(repo) {
    return { version: 1, repo, lastRefreshedAt: null, items: {}, history: [] };
}

export function effectiveColumn(item) {
    if (item.decision) return "actioned";
    if (item.manualColumn) return item.manualColumn;
    if (item.reviewStatus === "queued") return "reviewing";
    if (item.review?.recommendation) return item.review.recommendation;
    return "unreviewed";
}

export class BoardStore {
    constructor(filePath, repo) {
        this.filePath = filePath;
        this.repo = repo;
        this.state = emptyState(repo);
        this.listeners = new Set();
        this.writeChain = Promise.resolve();
    }

    async load() {
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            this.state = { ...emptyState(this.repo), ...parsed, repo: parsed.repo ?? this.repo };
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    async commit() {
        const data = JSON.stringify(this.state, null, 2) + "\n";
        this.writeChain = this.writeChain
            .catch(() => {})
            .then(async () => {
                await mkdir(path.dirname(this.filePath), { recursive: true });
                const tmp = `${this.filePath}.tmp`;
                await writeFile(tmp, data, "utf8");
                await rename(tmp, this.filePath);
            });
        await this.writeChain;
        const snapshot = this.snapshot();
        for (const listener of this.listeners) {
            try {
                listener(snapshot);
            } catch {
                // listeners are best-effort UI pushes
            }
        }
    }

    getItem(number) {
        const item = this.state.items[String(number)];
        if (!item) throw new Error(`Issue #${number} is not on the board. Refresh first.`);
        return item;
    }

    snapshot() {
        const items = Object.values(this.state.items)
            .map((item) => ({ ...item, column: effectiveColumn(item) }))
            .sort((a, b) => b.number - a.number);
        return {
            repo: this.state.repo,
            lastRefreshedAt: this.state.lastRefreshedAt,
            columns: COLUMNS,
            items,
            history: this.state.history.slice(0, 50),
        };
    }

    async syncIssues(issues) {
        const incoming = new Map(issues.map((issue) => [String(issue.number), issue]));
        const added = [];
        const removed = [];
        for (const [key, issue] of incoming) {
            const existing = this.state.items[key];
            if (existing) {
                Object.assign(existing, {
                    title: issue.title,
                    author: issue.author,
                    url: issue.url,
                    labels: issue.labels,
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                });
            } else {
                this.state.items[key] = {
                    ...issue,
                    reviewStatus: "unreviewed",
                    review: null,
                    manualColumn: null,
                    decision: null,
                    addedAt: new Date().toISOString(),
                };
                added.push(issue.number);
            }
        }
        for (const key of Object.keys(this.state.items)) {
            if (!incoming.has(key)) {
                removed.push(Number(key));
                delete this.state.items[key];
            }
        }
        this.state.lastRefreshedAt = new Date().toISOString();
        await this.commit();
        return { added, removed, total: incoming.size };
    }

    pendingReview(numbers) {
        const all = Object.values(this.state.items).filter((item) => !item.decision && item.reviewStatus !== "queued");
        if (numbers?.length) {
            const wanted = new Set(numbers.map(Number));
            return all.filter((item) => wanted.has(item.number));
        }
        return all.filter((item) => item.reviewStatus !== "reviewed");
    }

    async markQueued(numbers, { rereviewGuidance } = {}) {
        const now = new Date().toISOString();
        const snapshots = [];
        for (const number of numbers) {
            const item = this.getItem(number);
            snapshots.push({
                number,
                previous: {
                    reviewStatus: item.reviewStatus,
                    queuedAt: item.queuedAt,
                    queueId: item.queueId,
                    rereviewGuidance: item.rereviewGuidance,
                },
            });
            item.reviewStatus = "queued";
            item.queuedAt = now;
            item.queueId = newQueueId();
            if (rereviewGuidance !== undefined) item.rereviewGuidance = rereviewGuidance;
            else delete item.rereviewGuidance;
        }
        await this.commit();
        return snapshots;
    }

    async restoreQueueState(snapshots) {
        for (const snapshot of snapshots) {
            const item = this.state.items[String(snapshot.number)];
            if (!item) continue;
            const { previous } = snapshot;
            item.reviewStatus = previous.reviewStatus;
            if (previous.queuedAt === undefined) delete item.queuedAt;
            else item.queuedAt = previous.queuedAt;
            if (previous.queueId === undefined) delete item.queueId;
            else item.queueId = previous.queueId;
            if (previous.rereviewGuidance === undefined) delete item.rereviewGuidance;
            else item.rereviewGuidance = previous.rereviewGuidance;
        }
        await this.commit();
    }

    async recordReviews(reviews) {
        const recorded = [];
        const skipped = [];
        for (const review of reviews) {
            const item = this.state.items[String(review.number)];
            if (!item) {
                skipped.push({ number: review.number, reason: "not on board" });
                continue;
            }
            if (!RECOMMENDATIONS.includes(review.recommendation)) {
                skipped.push({ number: review.number, reason: `invalid recommendation ${review.recommendation}` });
                continue;
            }
            if (item.queueId && review.queueId !== item.queueId) {
                skipped.push({ number: review.number, reason: "stale review result" });
                continue;
            }
            const { number, ...rest } = review;
            item.review = { ...rest, reviewedAt: new Date().toISOString() };
            item.reviewStatus = "reviewed";
            item.manualColumn = null;
            delete item.queuedAt;
            delete item.queueId;
            delete item.rereviewGuidance;
            recorded.push(number);
        }
        await this.commit();
        return { recorded, skipped };
    }

    async moveItem(number, column) {
        const item = this.getItem(number);
        if (item.decision) throw new Error(`#${number} has already been actioned.`);
        if (column === "unreviewed") {
            item.review = null;
            item.reviewStatus = "unreviewed";
            item.manualColumn = null;
            delete item.queuedAt;
            delete item.queueId;
        } else if (RECOMMENDATIONS.includes(column)) {
            item.manualColumn = item.review?.recommendation === column ? null : column;
            if (item.reviewStatus === "queued") item.reviewStatus = item.review ? "reviewed" : "unreviewed";
            delete item.queueId;
            delete item.rereviewGuidance;
        } else {
            throw new Error(`Items cannot be moved to "${column}".`);
        }
        await this.commit();
        return { number, column: effectiveColumn(item) };
    }

    async recordPendingDecision(number, pendingDecision) {
        const item = this.getItem(number);
        item.pendingDecision = pendingDecision;
        await this.commit();
    }

    async resolvePendingDecision(number, status) {
        const item = this.state.items[String(number)];
        if (!item?.pendingDecision || status.state !== "CLOSED") return null;
        const labels = new Set(status.labels ?? []);
        const kind = labels.has("approved") ? "approve" : labels.has("rejected") ? "reject" : null;
        if (!kind) return null;
        const now = new Date().toISOString();
        const pendingKind = item.pendingDecision.kind;
        const decision =
            pendingKind && pendingKind !== kind
                ? {
                      kind,
                      external: true,
                      comment: "",
                      body: null,
                      commentUrl: null,
                      at: now,
                      resolvedAt: now,
                      supersededPending: pendingKind,
                  }
                : { ...item.pendingDecision, kind, resolvedAt: now };
        await this.recordDecision(number, decision);
        return decision;
    }

    async pendingDecisionNumbers() {
        return Object.values(this.state.items)
            .filter((item) => item.pendingDecision && !item.decision)
            .map((item) => item.number);
    }

    async recordDecision(number, decision) {
        const item = this.getItem(number);
        item.decision = decision;
        delete item.pendingDecision;
        this.state.history.unshift({
            number,
            title: item.title,
            author: item.author,
            kind: decision.kind,
            comment: decision.comment ?? "",
            aiRecommendation: item.review?.recommendation ?? null,
            boardColumn: item.manualColumn ?? item.review?.recommendation ?? null,
            at: decision.at,
        });
        this.state.history = this.state.history.slice(0, HISTORY_LIMIT);
        await this.commit();
    }
}
