import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { expectedNotice } from "./errors.mjs";

export const RECOMMENDATIONS = ["close", "request-changes", "needs-insight", "approve"];

export const COLUMNS = [
    { id: "unreviewed", label: "Unreviewed", droppable: true },
    { id: "reviewing", label: "Reviewing", droppable: false },
    { id: "close", label: "Close", droppable: true },
    { id: "request-changes", label: "Request changes", droppable: true },
    { id: "needs-insight", label: "Needs insight", droppable: true },
    { id: "approve", label: "Approve", droppable: true },
    { id: "actioned", label: "Actioned", droppable: false },
];

const DROPPABLE = new Set(COLUMNS.filter((column) => column.droppable).map((column) => column.id));
const HISTORY_LIMIT = 200;
const HISTORY_SNAPSHOT = 50;
const WORKFLOW_APPROVAL_DISCOVERY_ERROR = "Could not discover workflow approvals (WORKFLOW_APPROVAL_DISCOVERY_FAILED).";

/** Derives the board column for an item; decisions and manual drags win over the AI recommendation. */
export function effectiveColumn(item) {
    if (item.decision) return "actioned";
    if (item.manualColumn && DROPPABLE.has(item.manualColumn)) return item.manualColumn;
    if (item.reviewStatus === "queued") return "reviewing";
    if (item.review && RECOMMENDATIONS.includes(item.review.recommendation)) return item.review.recommendation;
    return "unreviewed";
}

/** A review is stale when the pull request changed after the review was recorded. */
function reviewIsStale(item) {
    if (item.review && (!item.review.headRefOid || item.review.headRefOid !== item.headRefOid)) return true;
    if (!item.review?.reviewedAt || !item.updatedAt) return false;
    return new Date(item.updatedAt).getTime() > new Date(item.review.reviewedAt).getTime() + 1000;
}

const SYNCED_FIELDS = [
    "title",
    "url",
    "author",
    "createdAt",
    "updatedAt",
    "isDraft",
    "baseRefName",
    "headRefName",
    "headRefOid",
    "additions",
    "deletions",
    "changedFiles",
    "reviewDecision",
    "mergeStateStatus",
    "labels",
    "checksState",
    "checkCounts",
    "checks",
    "workflowApprovals",
];

export class BoardStore {
    constructor({ file, repo }) {
        this.file = file;
        this.repo = repo;
        this.state = { repo, updatedAt: null, items: {}, history: [] };
        this.listeners = new Set();
        this.writeChain = Promise.resolve();
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    async load() {
        try {
            const raw = await readFile(this.file, "utf8");
            const parsed = JSON.parse(raw);
            const items = parsed.items && typeof parsed.items === "object" ? parsed.items : {};
            for (const item of Object.values(items)) {
                if (item && typeof item === "object") {
                    item.workflowApprovalError = item.workflowApprovalError
                        ? WORKFLOW_APPROVAL_DISCOVERY_ERROR
                        : null;
                }
            }
            this.state = {
                repo: this.repo,
                updatedAt: parsed.updatedAt ?? null,
                items,
                history: Array.isArray(parsed.history) ? parsed.history : [],
            };
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return this;
    }

    /** Serialised atomic write so concurrent mutations cannot interleave or truncate the file. */
    persist() {
        this.writeChain = this.writeChain.catch(() => {}).then(async () => {
            await mkdir(path.dirname(this.file), { recursive: true });
            const tmp = `${this.file}.${randomBytes(6).toString("hex")}.tmp`;
            await writeFile(tmp, JSON.stringify(this.state, null, 2), "utf8");
            await rename(tmp, this.file);
        });
        return this.writeChain;
    }

    emit() {
        const snapshot = this.snapshot();
        for (const listener of this.listeners) {
            try {
                listener(snapshot);
            } catch {
                // A broken subscriber must not break the board.
            }
        }
    }

    async commit() {
        this.emit();
        await this.persist();
        return this.snapshot();
    }

    snapshot() {
        const items = Object.values(this.state.items)
            .map((item) => ({
                ...item,
                column: effectiveColumn(item),
                reviewStale: reviewIsStale(item),
                approvalStale: item.manualColumn === "approve" &&
                    (!item.manualHeadRefOid || item.manualHeadRefOid !== item.headRefOid),
            }))
            .sort((a, b) => b.number - a.number);
        const counts = {};
        for (const column of COLUMNS) counts[column.id] = 0;
        for (const item of items) counts[item.column] = (counts[item.column] ?? 0) + 1;
        return {
            repo: this.state.repo,
            updatedAt: this.state.updatedAt,
            columns: COLUMNS,
            recommendations: RECOMMENDATIONS,
            items,
            counts,
            reviewed: items.filter((item) => item.review).length,
            history: this.state.history.slice(0, HISTORY_SNAPSHOT),
        };
    }

    getItem(number) {
        return this.state.items[String(number)] ?? null;
    }

    /** Merges freshly fetched pull requests in, dropping anything that is no longer open. */
    async syncPullRequests(pullRequests) {
        const seen = new Set();
        for (const pr of pullRequests) {
            const key = String(pr.number);
            seen.add(key);
            const existing = this.state.items[key] ?? {
                number: pr.number,
                review: null,
                reviewStatus: "none",
                queueId: null,
                manualColumn: null,
                decision: null,
            };
            const decision = existing.decision;
            if ((decision?.kind === "comment" || decision?.kind === "request-changes") && !decision.headRefOid) {
                decision.headRefOid = existing.headRefOid ?? pr.headRefOid ?? null;
            }
            if (
                (decision?.kind === "comment" || decision?.kind === "request-changes") &&
                decision.headRefOid &&
                pr.headRefOid &&
                decision.headRefOid !== pr.headRefOid
            ) {
                existing.decision = null;
                existing.review = null;
                existing.reviewStatus = "none";
                existing.queueId = null;
                existing.manualColumn = null;
            }
            for (const field of SYNCED_FIELDS) existing[field] = pr[field];
            existing.workflowApprovalError = pr.workflowApprovalError
                ? WORKFLOW_APPROVAL_DISCOVERY_ERROR
                : null;
            this.state.items[key] = existing;
        }
        for (const key of Object.keys(this.state.items)) {
            if (!seen.has(key)) delete this.state.items[key];
        }
        this.state.updatedAt = new Date().toISOString();
        return this.commit();
    }

    /**
     * Marks items as queued for review and stamps a fresh queueId on each, so a late
     * result from an earlier run can be rejected instead of overwriting newer state.
     */
    async markQueued(numbers) {
        const previous = [];
        const queued = [];
        for (const number of numbers) {
            const item = this.getItem(number);
            if (!item) continue;
            previous.push({
                number: item.number, reviewStatus: item.reviewStatus, queueId: item.queueId,
                queueHeadRefOid: item.queueHeadRefOid,
            });
            item.reviewStatus = "queued";
            item.queueId = randomBytes(8).toString("hex");
            item.queueHeadRefOid = item.headRefOid ?? null;
            queued.push({ number: item.number, queueId: item.queueId });
        }
        await this.commit();
        return { previous, queued };
    }

    async restoreQueueState(previous) {
        for (const entry of previous) {
            const item = this.getItem(entry.number);
            if (!item) continue;
            item.reviewStatus = entry.reviewStatus;
            item.queueId = entry.queueId;
            item.queueHeadRefOid = entry.queueHeadRefOid;
        }
        return this.commit();
    }

    recordReviewInternal(payload) {
        const item = this.getItem(payload.number);
        if (!item) return { number: payload.number, status: "skipped", reason: "not on the board" };
        if (!item.queueId || !payload.queueId || payload.queueId !== item.queueId) {
            return { number: payload.number, status: "skipped", reason: "stale review result" };
        }
        if (!RECOMMENDATIONS.includes(payload.recommendation)) {
            return { number: payload.number, status: "skipped", reason: `unknown recommendation "${payload.recommendation}"` };
        }
        const { number, queueId, recommendation, ...fields } = payload;
        item.review = {
            recommendation,
            ...fields,
            headRefOid: item.queueHeadRefOid ?? null,
            reviewedAt: new Date().toISOString(),
        };
        item.reviewStatus = "reviewed";
        item.queueId = null;
        // A fresh review supersedes an earlier manual bucket override.
        item.manualColumn = null;
        return { number: item.number, status: "recorded", column: effectiveColumn(item) };
    }

    async recordReviews(payloads) {
        const results = payloads.map((payload) => this.recordReviewInternal(payload));
        await this.commit();
        return results;
    }

    async moveItem(number, column, headRefOid = null) {
        const item = this.getItem(number);
        if (!item) throw expectedNotice(`Pull request #${number} is not on the board.`);
        if (!DROPPABLE.has(column)) throw new Error(`Column "${column}" cannot be set directly.`);
        if (item.decision) throw expectedNotice(`Pull request #${number} has already been actioned.`);
        if (column === "unreviewed") {
            // Returning a card to Unreviewed clears the AI review so the next run picks it up again.
            item.review = null;
            item.reviewStatus = "none";
            item.queueId = null;
            item.manualColumn = null;
        } else {
            item.manualColumn = column;
            item.manualHeadRefOid = headRefOid;
            if (item.reviewStatus === "queued") {
                item.reviewStatus = item.review ? "reviewed" : "none";
                item.queueId = null;
            }
        }
        return this.commit();
    }

    async recordDecision(number, decision) {
        const item = this.getItem(number);
        if (!item) throw expectedNotice(`Pull request #${number} is not on the board.`);
        const recorded = {
            kind: decision.kind,
            comment: decision.comment ?? "",
            at: new Date().toISOString(),
            status: decision.status ?? null,
            headRefOid: decision.headRefOid === undefined ? item.headRefOid ?? null : decision.headRefOid,
        };
        this.state.history.unshift({
            number: item.number,
            title: item.title,
            url: item.url,
            kind: decision.kind,
            comment: decision.comment ?? "",
            at: recorded.at,
            status: decision.status ?? null,
        });
        const obsoleteFeedback = (recorded.kind === "comment" || recorded.kind === "request-changes") &&
            recorded.headRefOid && item.headRefOid && recorded.headRefOid !== item.headRefOid;
        if (!obsoleteFeedback) {
            item.decision = recorded;
        } else {
            if (item.review && item.review.headRefOid !== item.headRefOid) item.review = null;
            if (item.manualColumn && item.manualHeadRefOid !== item.headRefOid) {
                item.manualColumn = null;
                item.manualHeadRefOid = null;
            }
            if (item.queueId && item.queueHeadRefOid !== item.headRefOid) {
                item.queueId = null;
                item.queueHeadRefOid = null;
            }
            if (item.reviewStatus === "queued" && !item.queueId) {
                item.reviewStatus = item.review ? "reviewed" : "none";
            } else if (item.reviewStatus === "reviewed" && !item.review) {
                item.reviewStatus = "none";
            }
        }
        this.state.history = this.state.history.slice(0, HISTORY_LIMIT);
        return this.commit();
    }

    async recordWorkflowApproval(number, { runId, attempt, headRefOid, status }) {
        const item = this.getItem(number);
        this.state.history.unshift({
            number, title: item?.title, url: item?.url, kind: "workflow-execution",
            runId, attempt, headRefOid, status, at: new Date().toISOString(),
        });
        this.state.history = this.state.history.slice(0, HISTORY_LIMIT);
        return this.commit();
    }

    async clearDecision(number) {
        const item = this.getItem(number);
        if (!item) throw expectedNotice(`Pull request #${number} is not on the board.`);
        item.decision = null;
        return this.commit();
    }

    /** Clear all local triage state; the next refresh repopulates open pull requests. */
    async reset() {
        this.state = { repo: this.repo, updatedAt: null, items: {}, history: [] };
        return this.commit();
    }
}
