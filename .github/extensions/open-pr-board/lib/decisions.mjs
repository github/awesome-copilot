import * as gh from "./github.mjs";
import { expectedNotice } from "./errors.mjs";

const DECISION_KINDS = ["approve", "request-changes", "comment", "close"];
const MAX_COMMENT_LENGTH = 60000;
const decisionsInFlight = new Set();

export async function approveWorkflowOnGitHub({ store, number, runId, attempt, headRefOid, confirmed, refresh, github = gh }) {
    if (confirmed !== true) throw expectedNotice("Confirm workflow execution approval before running checks.");
    const key = `${store.repo}#${number}`;
    if (decisionsInFlight.has(key)) throw expectedNotice(`#${number} already has a GitHub action in progress.`);
    decisionsInFlight.add(key);
    try {
        const item = store.getItem(number);
        if (!item || !headRefOid || item.headRefOid !== headRefOid) {
            throw expectedNotice("PR changed or is no longer on the board. Refresh before approving workflow execution.");
        }
        if (!item.workflowApprovals?.some((run) =>
            run.id === runId && run.attempt === attempt && run.headRefOid === headRefOid)) {
            throw expectedNotice("This workflow is not awaiting supported approval on the board. Refresh first.");
        }
        const result = await github.approveWorkflowRun(store.repo, number, { runId, attempt, headRefOid });
        const warnings = [];
        try {
            await store.recordWorkflowApproval(number, { runId, attempt, headRefOid, status: result.status });
        } catch (error) {
            warnings.push(`Workflow execution was approved, but the board could not record it: ${error.message}`);
        }
        try {
            await refresh(store);
        } catch (error) {
            warnings.push(`Workflow execution was approved, but the board could not refresh: ${error.message}`);
        }
        return { number, ...result, warning: warnings.join(" ") || null, url: item.url };
    } finally {
        decisionsInFlight.delete(key);
    }
}

export async function applyDecisionOnGitHub({ store, number, kind, comment, headRefOid, refresh, github = gh }) {
    if (!DECISION_KINDS.includes(kind)) throw new Error(`Unknown decision "${kind}".`);
    const key = `${store.repo}#${number}`;
    if (decisionsInFlight.has(key)) throw expectedNotice(`#${number} already has a GitHub action in progress.`);
    decisionsInFlight.add(key);
    try {
        const item = store.getItem(number);
        if (!item) throw expectedNotice(`Pull request #${number} is not on the board. Refresh first.`);
        if (item.decision) throw expectedNotice(`#${number} was already actioned (${item.decision.kind}).`);
        const actionHeadRefOid = item.headRefOid ?? null;
        if ((kind === "comment" || kind === "request-changes") &&
            (!headRefOid || headRefOid !== actionHeadRefOid)) {
            throw expectedNotice("PR changed since it was displayed; review the current commit before submitting feedback.");
        }

        const body = String(comment ?? "").trim().slice(0, MAX_COMMENT_LENGTH);
        if ((kind === "request-changes" || kind === "comment") && !body) {
            throw expectedNotice(`A ${kind} decision needs a non-empty comment.`);
        }

        let result;
        if (kind === "approve") {
            if (!headRefOid || headRefOid !== item.headRefOid) {
                throw expectedNotice("PR changed since it was displayed; refresh and review it again before approving.");
            }
            result = await github.approveAndEnableAutoMerge(store.repo, number, { body, headRefOid });
        } else if (kind === "close") {
            result = await github.closePullRequest(store.repo, number, { body });
        } else {
            result = await github.submitPullRequestReview(store.repo, number, { kind, body });
        }

        const warnings = result.warning ? [result.warning] : [];
        try {
            await store.recordDecision(number, { kind, comment: body, status: result.status, headRefOid: actionHeadRefOid });
        } catch (error) {
            warnings.push(`GitHub was updated, but the board could not record the action: ${error.message}`);
        }
        try {
            await refresh(store);
        } catch (error) {
            warnings.push(`GitHub was updated, but the board could not refresh: ${error.message}`);
        }
        return {
            number,
            kind,
            comment: body,
            posted: true,
            status: result.status,
            warning: warnings.length ? warnings.join(" ") : null,
            url: item.url,
        };
    } finally {
        decisionsInFlight.delete(key);
    }
}
